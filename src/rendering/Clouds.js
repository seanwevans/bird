import { createSeededRandom } from "../utils/Random.js";

export const CLOUD_CONFIG = Object.freeze({
  /** Seeded separately from the city so retuning the sky never moves a
   * building, and therefore never changes a collision. */
  seed: 60341,
  count: 90,
  /** Each cloud is a clump of overlapping puffs rather than one blob. */
  puffsPerCloud: 6,
  /** Scattered over a square this wide, centred on the city. */
  spread: 7000,
  /** Well above the 100 m skyline, and inside the camera's 5 km far plane. */
  minAltitude: 420,
  maxAltitude: 900,
  minRadius: 45,
  maxRadius: 120,
  /** How far the outer puffs wander from the core, as a multiple of the
   * cloud's radius. Kept under the radius so every puff still overlaps the
   * core, and scaled right down on the vertical so a clump spreads sideways
   * into something cumulus-shaped rather than piling up into a ball. */
  clumpSpread: 0.9,
  clumpRise: 0.3,
  /** Puffs are squashed vertically: clouds are wider than they are tall. */
  flatten: 0.6,
  color: 0xf6fbff,
});

/** A field of low-poly cumulus over the city. Scenery only — clouds carry no
 * collision body, so an aircraft flies straight through one. */
export class Clouds {
  constructor(scene, { THREE, config = CLOUD_CONFIG, random }) {
    this.THREE = THREE;
    this.config = config;
    this.random = random ?? createSeededRandom(config.seed);

    // A coarse sphere: faceted enough under flat shading to read as a puff,
    // and cheap enough to stamp out several hundred of.
    const geometry = new THREE.SphereGeometry(1, 7, 5);
    const material = new THREE.MeshStandardMaterial({
      color: config.color,
      roughness: 1,
      metalness: 0,
      flatShading: true,
    });
    this.mesh = new THREE.InstancedMesh(
      geometry,
      material,
      config.count * config.puffsPerCloud,
    );
    // Instance transforms are not covered by the geometry's bounding sphere,
    // which describes a unit sphere at the origin rather than the sky the
    // puffs are spread across.
    this.mesh.frustumCulled = false;

    this.build();
    scene.add(this.mesh);
  }

  /** A uniform draw between two bounds, off the seeded stream. */
  between(min, max) {
    return min + this.random() * (max - min);
  }

  build() {
    const {
      count,
      puffsPerCloud,
      spread,
      minAltitude,
      maxAltitude,
      minRadius,
      maxRadius,
      clumpSpread,
      clumpRise,
      flatten,
    } = this.config;

    const transform = new this.THREE.Matrix4();
    const upright = new this.THREE.Quaternion();
    const position = new this.THREE.Vector3();
    const scale = new this.THREE.Vector3();
    let instance = 0;

    for (let cloud = 0; cloud < count; cloud++) {
      const center = {
        x: this.between(-spread / 2, spread / 2),
        y: this.between(minAltitude, maxAltitude),
        z: this.between(-spread / 2, spread / 2),
      };
      const radius = this.between(minRadius, maxRadius);

      for (let puff = 0; puff < puffsPerCloud; puff++) {
        // The first puff is the cloud's core; the rest are smaller and pile
        // around it, so the clump reads as one body of cloud.
        const core = puff === 0;
        const puffRadius = core ? radius : radius * this.between(0.45, 0.85);
        const drift = core ? 0 : radius * clumpSpread;

        position.set(
          center.x + this.between(-drift, drift),
          center.y + this.between(-drift, drift) * clumpRise,
          center.z + this.between(-drift, drift),
        );
        scale.set(puffRadius, puffRadius * flatten, puffRadius);
        this.mesh.setMatrixAt(
          instance++,
          transform.compose(position, upright, scale),
        );
      }
    }

    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
