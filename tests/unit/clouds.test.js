import { describe, expect, it } from "vitest";
import { CLOUD_CONFIG, Clouds } from "../../src/rendering/Clouds.js";

const vector = (x = 0, y = 0, z = 0) => ({
  x,
  y,
  z,
  set(nx, ny, nz) {
    Object.assign(this, { x: nx, y: ny, z: nz });
  },
});

const THREE = {
  MeshStandardMaterial: class {
    constructor(options) {
      Object.assign(this, options);
    }
  },
  SphereGeometry: class {
    constructor(radius, widthSegments, heightSegments) {
      Object.assign(this, { radius, widthSegments, heightSegments });
    }
  },
  Matrix4: class {
    compose(position, quaternion, scale) {
      Object.assign(this, { ...position }, { scale: { ...scale } });
      return this;
    }
  },
  Quaternion: class {},
  Vector3: class {
    constructor(x, y, z) {
      Object.assign(this, vector(x, y, z));
    }
  },
  InstancedMesh: class {
    constructor(geometry, material, count) {
      Object.assign(this, {
        geometry,
        material,
        count,
        matrices: [],
        instanceMatrix: { needsUpdate: false },
      });
    }
    setMatrixAt(index, matrix) {
      this.matrices[index] = { ...matrix };
    }
  },
};

const build = (config = CLOUD_CONFIG) => {
  const scene = {
    objects: [],
    add(object) {
      this.objects.push(object);
    },
  };
  return { scene, clouds: new Clouds(scene, { THREE, config }) };
};

/** Split the flat run of puffs back into the clumps they were built as. */
const clumps = (clouds, config = CLOUD_CONFIG) =>
  Array.from({ length: config.count }, (_, cloud) =>
    clouds.mesh.matrices.slice(
      cloud * config.puffsPerCloud,
      (cloud + 1) * config.puffsPerCloud,
    ),
  );

describe("Clouds", () => {
  it("draws every puff from one instanced mesh", () => {
    const { scene, clouds } = build();
    const puffs = CLOUD_CONFIG.count * CLOUD_CONFIG.puffsPerCloud;

    expect(scene.objects).toEqual([clouds.mesh]);
    expect(clouds.mesh.count).toBe(puffs);
    expect(clouds.mesh.matrices).toHaveLength(puffs);
    expect(clouds.mesh.instanceMatrix.needsUpdate).toBe(true);
    // The puffs sit far outside the unit sphere's bounding volume.
    expect(clouds.mesh.frustumCulled).toBe(false);
  });

  it("lays the same sky out on every run, and a different one per seed", () => {
    const positions = (clouds) =>
      clouds.mesh.matrices.map(({ x, y, z }) => [x, y, z]);

    expect(positions(build().clouds)).toEqual(positions(build().clouds));
    expect(positions(build().clouds)).not.toEqual(
      positions(build({ ...CLOUD_CONFIG, seed: CLOUD_CONFIG.seed + 1 }).clouds),
    );
  });

  it("follows an injected generator so scenarios can vary the sky", () => {
    const scene = { objects: [], add() {} };
    const clouds = new Clouds(scene, { THREE, random: () => 0.5 });

    // A constant generator puts every cloud in the middle of the field, at
    // the middle of its altitude band, with no drift between the puffs.
    const { minAltitude, maxAltitude } = CLOUD_CONFIG;
    for (const { x, y, z } of clouds.mesh.matrices) {
      expect(x).toBe(0);
      expect(z).toBe(0);
      expect(y).toBe((minAltitude + maxAltitude) / 2);
    }
  });

  it("keeps every puff inside the field and clear of the skyline", () => {
    const { clouds } = build();
    const { spread, minRadius, maxRadius, clumpSpread, flatten } = CLOUD_CONFIG;
    const reach = spread / 2 + maxRadius * (1 + clumpSpread);

    for (const { x, y, z, scale } of clouds.mesh.matrices) {
      expect(Math.abs(x)).toBeLessThanOrEqual(reach);
      expect(Math.abs(z)).toBeLessThanOrEqual(reach);
      // The lowest point of the puff, well above the 100 m skyline.
      expect(y - scale.y).toBeGreaterThan(200);
      expect(scale.x).toBeGreaterThanOrEqual(minRadius * 0.45);
      expect(scale.x).toBeLessThanOrEqual(maxRadius);
      // Wider than they are tall.
      expect(scale.y).toBeCloseTo(scale.x * flatten);
      expect(scale.z).toBe(scale.x);
    }
  });

  it("piles each clump around a core puff so it reads as one cloud", () => {
    for (const clump of clumps(build().clouds)) {
      const [core, ...outer] = clump;

      for (const puff of outer) {
        const distance = Math.hypot(
          puff.x - core.x,
          puff.y - core.y,
          puff.z - core.z,
        );
        // Every outer puff still overlaps the core rather than floating off
        // on its own.
        expect(distance).toBeLessThan(core.scale.x + puff.scale.x);
        expect(puff.scale.x).toBeLessThan(core.scale.x);
      }
    }
  });
});
