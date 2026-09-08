import { describe, expect, it } from "vitest";
import { CITY_CONFIG, Environment } from "../../src/rendering/Environment.js";
import { createSeededRandom } from "../../src/utils/Random.js";

/** Minimal stand-ins: the environment only positions objects and registers
 * bodies, so the stubs just have to record what it built. */
const vector = () => ({
  x: 0,
  y: 0,
  z: 0,
  set(x, y, z) {
    Object.assign(this, { x, y, z });
  },
});
const node = () => ({ position: vector(), rotation: vector() });

const THREE = {
  Color: class {},
  AmbientLight: class {},
  DirectionalLight: class {
    constructor() {
      Object.assign(this, node());
    }
  },
  MeshStandardMaterial: class {},
  BoxGeometry: class {
    constructor(width, height, depth) {
      Object.assign(this, { width, height, depth });
    }
  },
  PlaneGeometry: class {},
  Mesh: class {
    constructor(geometry, material) {
      Object.assign(this, { geometry, material }, node());
    }
  },
  GridHelper: class {
    constructor() {
      Object.assign(this, node(), { material: {} });
    }
  },
  Matrix4: class {
    makeTranslation(x, y, z) {
      Object.assign(this, { x, y, z });
      return this;
    }
  },
  InstancedMesh: class {
    constructor(geometry, material, count) {
      Object.assign(this, { geometry, material, count }, node());
      this.matrices = [];
      this.instanceMatrix = { needsUpdate: false };
    }
    setMatrixAt(index, matrix) {
      this.matrices[index] = { ...matrix };
    }
  },
};

const CANNON = {
  Vec3: class {
    constructor(x = 0, y = 0, z = 0) {
      Object.assign(this, { x, y, z });
    }
  },
  Plane: class {},
  Box: class {
    constructor(halfExtents) {
      this.halfExtents = halfExtents;
    }
  },
  Body: class {
    constructor() {
      Object.assign(this, node(), {
        shapes: [],
        quaternion: { setFromAxisAngle() {} },
      });
    }
    addShape(shape) {
      this.shapes.push(shape);
    }
  },
};

const build = (options = {}) => {
  const scene = {
    objects: [],
    add(object) {
      this.objects.push(object);
    },
  };
  const world = {
    bodies: [],
    addBody(body) {
      this.bodies.push(body);
    },
  };
  const environment = new Environment(
    scene,
    world,
    {},
    {
      THREE,
      CANNON,
      ...options,
    },
  );
  return { environment, scene, world };
};

const smallCity = { ...CITY_CONFIG, blockCount: 12 };
const buildingPositions = (world) =>
  world.bodies
    .filter((body) => body.isBuilding)
    .map(({ position: { x, y, z } }) => [x, y, z]);

describe("environment", () => {
  it("lays the city out identically on every run", () => {
    const first = build({ city: smallCity });
    const second = build({ city: smallCity });

    expect(buildingPositions(first.world)).toHaveLength(smallCity.blockCount);
    expect(buildingPositions(first.world)).toEqual(
      buildingPositions(second.world),
    );
  });

  it("draws every block from one instanced mesh", () => {
    const { environment, scene, world } = build({ city: smallCity });

    const meshes = scene.objects.filter(
      (object) => object instanceof THREE.InstancedMesh,
    );
    expect(meshes).toEqual([environment.cityBlocks]);
    expect(environment.cityBlocks.count).toBe(smallCity.blockCount);
    expect(environment.cityBlocks.instanceMatrix.needsUpdate).toBe(true);
    // The instances sit far outside the base geometry's bounding sphere.
    expect(environment.cityBlocks.frustumCulled).toBe(false);

    // Each instance is placed at the same spot as its collision body.
    expect(
      environment.cityBlocks.matrices.map(({ x, y, z }) => [x, y, z]),
    ).toEqual(buildingPositions(world));
  });

  it("follows an injected generator so scenarios can vary the skyline", () => {
    const { world } = build({ city: smallCity, random: () => 0.75 });

    // A constant generator stacks every block on the same spot.
    const spread = smallCity.spread;
    expect(buildingPositions(world)).toEqual(
      Array.from({ length: smallCity.blockCount }, () => [
        0.25 * spread,
        smallCity.blockHeight / 2,
        0.25 * spread,
      ]),
    );
  });

  it("sits each building on the ground rather than half-buried", () => {
    const city = { ...smallCity, blockHeight: 250 };
    const { world } = build({ city });

    for (const [, y] of buildingPositions(world)) expect(y).toBe(125);
  });
});

describe("createSeededRandom", () => {
  it("replays the same stream for a seed and differs across seeds", () => {
    const draw = (seed) => {
      const random = createSeededRandom(seed);
      return Array.from({ length: 5 }, () => random());
    };

    expect(draw(7)).toEqual(draw(7));
    expect(draw(7)).not.toEqual(draw(8));
    for (const value of draw(7)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});
