export const RUNWAY_CONFIG = Object.freeze({
  /** Laid out along +z, clear of the city so the approach is unobstructed. */
  centerZ: 3600,
  length: 3000,
  width: 90,
  /** Lifted clear of the ground plane. The lift alone is not enough at
   * kilometre range, where depth precision is metres, so the materials also
   * carry a polygon offset that pulls them in front of the ground and of each
   * other regardless of distance. */
  surfaceLift: 0.05,
  markingLift: 0.1,
  centerlineDashLength: 30,
  centerlineGap: 30,
  centerlineWidth: 1.2,
  edgeLineWidth: 1.6,
  thresholdBars: 8,
  thresholdBarLength: 45,
  thresholdInset: 20,
  surfaceColor: 0x2f3336,
  markingColor: 0xf2f2f2,
});

/** A paved strip with centreline, edge lines and threshold bars to aim at.
 * The ground body already spans the whole world, so this is scenery: it marks
 * where to land rather than providing its own collision surface. */
export class Runway {
  constructor(scene, { THREE, groundY, config = RUNWAY_CONFIG }) {
    this.THREE = THREE;
    this.config = config;
    this.groundY = groundY;
    this.group = new THREE.Group();
    this.group.position.set(0, groundY, config.centerZ);

    this.surfaceMaterial = new THREE.MeshStandardMaterial({
      color: config.surfaceColor,
      roughness: 0.95,
      metalness: 0,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -16,
    });
    this.markingMaterial = new THREE.MeshStandardMaterial({
      color: config.markingColor,
      roughness: 0.8,
      metalness: 0,
      polygonOffset: true,
      polygonOffsetFactor: -8,
      polygonOffsetUnits: -32,
    });

    this.buildSurface();
    this.buildEdgeLines();
    this.buildCenterline();
    this.buildThresholds();
    scene.add(this.group);
  }

  /** Lay a rectangle flat on the strip, sized and placed in runway-local
   * coordinates where x is across the paving and z runs along it. */
  addPatch(width, length, x, z, lift, material) {
    const patch = new this.THREE.Mesh(
      new this.THREE.PlaneGeometry(width, length),
      material,
    );
    patch.rotation.x = -Math.PI / 2;
    patch.position.set(x, lift, z);
    this.group.add(patch);
    return patch;
  }

  buildSurface() {
    const { width, length, surfaceLift } = this.config;
    this.surface = this.addPatch(
      width,
      length,
      0,
      0,
      surfaceLift,
      this.surfaceMaterial,
    );
  }

  buildEdgeLines() {
    const { width, length, edgeLineWidth, markingLift } = this.config;
    const inset = width / 2 - edgeLineWidth;
    for (const side of [1, -1])
      this.addPatch(
        edgeLineWidth,
        length,
        side * inset,
        0,
        markingLift,
        this.markingMaterial,
      );
  }

  buildCenterline() {
    const {
      length,
      centerlineDashLength,
      centerlineGap,
      centerlineWidth,
      markingLift,
    } = this.config;
    const pitch = centerlineDashLength + centerlineGap;
    const dashes = Math.floor(length / pitch);
    // Centre the run of dashes on the strip rather than starting at one end.
    const start = -((dashes - 1) * pitch) / 2;

    this.centerline = new this.THREE.InstancedMesh(
      new this.THREE.PlaneGeometry(centerlineWidth, centerlineDashLength),
      this.markingMaterial,
      dashes,
    );
    const transform = new this.THREE.Matrix4();
    const flat = new this.THREE.Quaternion().setFromAxisAngle(
      new this.THREE.Vector3(1, 0, 0),
      -Math.PI / 2,
    );
    const position = new this.THREE.Vector3();
    const scale = new this.THREE.Vector3(1, 1, 1);

    for (let index = 0; index < dashes; index++) {
      position.set(0, markingLift, start + index * pitch);
      this.centerline.setMatrixAt(
        index,
        transform.compose(position, flat, scale),
      );
    }
    this.centerline.instanceMatrix.needsUpdate = true;
    // Instance transforms are not covered by the geometry's bounding sphere.
    this.centerline.frustumCulled = false;
    this.group.add(this.centerline);
  }

  buildThresholds() {
    const {
      width,
      length,
      thresholdBars,
      thresholdBarLength,
      thresholdInset,
      markingLift,
      edgeLineWidth,
    } = this.config;
    // Piano keys: evenly spaced bars inside the edge lines at both ends.
    const usable = width - 4 * edgeLineWidth;
    const pitch = usable / thresholdBars;
    const barWidth = pitch * 0.6;
    const firstBar = -usable / 2 + pitch / 2;

    for (const end of [1, -1]) {
      const z = end * (length / 2 - thresholdInset - thresholdBarLength / 2);
      for (let bar = 0; bar < thresholdBars; bar++)
        this.addPatch(
          barWidth,
          thresholdBarLength,
          firstBar + bar * pitch,
          z,
          markingLift,
          this.markingMaterial,
        );
    }
  }

  /** True when a world position sits over the paving. */
  contains({ x, z }) {
    const { width, length, centerZ } = this.config;
    return Math.abs(x) <= width / 2 && Math.abs(z - centerZ) <= length / 2;
  }
}
