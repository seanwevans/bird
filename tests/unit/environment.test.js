import { describe, expect, it } from "vitest";
import { AIRCRAFT_CONFIG } from "../../src/physics/AircraftConfig.js";
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
  SphereGeometry: class {
    constructor(radius, widthSegments, heightSegments) {
      Object.assign(this, { radius, widthSegments, heightSegments });
    }
  },
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
    compose(position, quaternion, scale) {
      Object.assign(this, position, { scale: { ...scale } });
      return this;
    }
  },
  Quaternion: class {
    setFromAxisAngle() {
      return this;
    }
  },
  Vector3: class {
    constructor(x = 0, y = 0, z = 0) {
      Object.assign(this, { x, y, z });
    }
    set(x, y, z) {
      Object.assign(this, { x, y, z });
    }
  },
  Group: class {
    constructor() {
      Object.assign(this, node(), { children: [] });
    }
    add(child) {
      this.children.push(child);
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
const buildings = (world) => world.bodies.filter((body) => body.isBuilding);
const buildingPositions = (world) =>
  buildings(world).map(({ position: { x, y, z } }) => [x, y, z]);
const buildingHeights = (world) =>
  buildings(world).map(({ shapes: [{ halfExtents }] }) => halfExtents.y * 2);

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
    // The whole city is one draw call, and the sky above it is a second.
    expect(meshes).toEqual([environment.cityBlocks, environment.clouds.mesh]);
    expect(environment.cityBlocks.count).toBe(smallCity.blockCount);
    expect(environment.cityBlocks.instanceMatrix.needsUpdate).toBe(true);
    // The instances sit far outside the base geometry's bounding sphere.
    expect(environment.cityBlocks.frustumCulled).toBe(false);

    // Each instance is placed at the same spot as its collision body.
    expect(
      environment.cityBlocks.matrices.map(({ x, y, z }) => [x, y, z]),
    ).toEqual(buildingPositions(world));
  });

  it("keeps buildings off the runway and its approach", () => {
    const { environment, world } = build({
      city: { ...CITY_CONFIG, blockCount: 400 },
    });

    for (const [x, , z] of buildingPositions(world))
      expect(environment.runway.obstructs({ x, z })).toBe(false);
  });

  it("follows an injected generator so scenarios can vary the skyline", () => {
    const { world } = build({ city: smallCity, random: () => 0.75 });
    const { spread, minBlockHeight, maxBlockHeight } = smallCity;
    const [height] = buildingHeights(world);

    // A constant generator stacks every block on the same spot, and draws the
    // same height for all of them.
    expect(buildingHeights(world)).toEqual(
      Array.from({ length: smallCity.blockCount }, () => height),
    );
    expect(height).toBeGreaterThan(minBlockHeight);
    expect(height).toBeLessThan(maxBlockHeight);
    expect(buildingPositions(world)).toEqual(
      Array.from({ length: smallCity.blockCount }, () => [
        0.25 * spread,
        height / 2,
        0.25 * spread,
      ]),
    );
  });

  it("leaves the sky out of the physics world", () => {
    const { world } = build({ city: smallCity });

    // Clouds are scenery: an aircraft flies through them, so the only bodies
    // are the ground and the buildings.
    expect(world.bodies).toHaveLength(smallCity.blockCount + 1);
  });

  it("sits each building on the ground rather than half-buried", () => {
    const city = { ...smallCity, blockHeight: 250 };
    const { world } = build({ city });
    const heights = buildingHeights(world);
    const midpoint = (city.minBlockHeight + city.maxBlockHeight) / 2;

    expect(new Set(heights).size).toBeGreaterThan(heights.length / 2);
    expect(Math.min(...heights)).toBeGreaterThanOrEqual(city.minBlockHeight);
    expect(Math.max(...heights)).toBeLessThanOrEqual(city.maxBlockHeight);
    // Both ends of the range get used, not just a band in the middle.
    expect(Math.min(...heights)).toBeLessThan(city.minBlockHeight + 10);
    expect(Math.max(...heights)).toBeGreaterThan(city.maxBlockHeight - 10);
    // The bias leaves most of the city below the midpoint, so the tall blocks
    // stand out against it.
    expect(
      heights.filter((height) => height < midpoint).length,
    ).toBeGreaterThan(heights.length / 2);
  });

  it("stretches each instance to match its own collision box", () => {
    const { environment, world } = build({ city: smallCity });
    const heights = buildingHeights(world);

    environment.cityBlocks.matrices.forEach(({ scale }, index) => {
      // The instances come off a unit-high box, so the y scale is the height.
      expect(scale.y).toBeCloseTo(heights[index]);
      expect(scale.x).toBe(1);
      expect(scale.z).toBe(1);
    });
  });

  it("sits each building on the ground rather than half-buried", () => {
    const { world } = build({ city: smallCity });

    // Each block is lifted by half its own height, so it stands on the
    // ground however tall it came out.
    expect(buildingPositions(world).map(([, y]) => y)).toEqual(
      buildingHeights(world).map((height) => height / 2),
    );
  });

  it("keeps the tallest tower clear of the spawn point", () => {
    // Nothing keeps a block off the origin, which is where the aircraft
    // spawns, so the top of the range has to stay below that altitude.
    expect(CITY_CONFIG.maxBlockHeight).toBeLessThan(
      AIRCRAFT_CONFIG.initialAltitude - 20,
    );
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
