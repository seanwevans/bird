import { describe, expect, it, vi } from "vitest";
import { AIRCRAFT_CONFIG } from "../../src/physics/AircraftConfig.js";
import { AircraftModel } from "../../src/rendering/AircraftModel.js";
import {
  AIRFRAMES,
  DEFAULT_AIRFRAME,
  airframeById,
} from "../../src/rendering/airframes/index.js";
import { F16_AIRFRAME } from "../../src/rendering/airframes/F16.js";
import { F22_AIRFRAME } from "../../src/rendering/airframes/F22.js";
import { SR71_AIRFRAME } from "../../src/rendering/airframes/SR71.js";

const vector = (x = 0, y = 0, z = 0) => ({
  x,
  y,
  z,
  set(nx, ny, nz) {
    Object.assign(this, { x: nx, y: ny, z: nz });
  },
});

const node = () => ({
  position: vector(),
  rotation: vector(),
  scale: vector(),
  children: [],
  add(...added) {
    this.children.push(...added);
  },
  traverse(visit) {
    visit(this);
    for (const child of this.children) child.traverse?.(visit);
  },
});

const geometry = (name) =>
  class {
    constructor(...args) {
      Object.assign(this, { kind: name, args });
    }
    dispose() {
      this.disposed = true;
    }
  };

const THREE = {
  DoubleSide: "double",
  AdditiveBlending: "additive",
  Group: class {
    constructor() {
      Object.assign(this, node());
    }
  },
  Mesh: class {
    constructor(geo, material) {
      Object.assign(this, node(), { geometry: geo, material });
    }
  },
  Shape: class {
    constructor() {
      this.points = [];
    }
    moveTo(...point) {
      this.points.push(point);
    }
    lineTo(...point) {
      this.points.push(point);
    }
    closePath() {}
  },
  ExtrudeGeometry: geometry("extrude"),
  ConeGeometry: geometry("cone"),
  SphereGeometry: geometry("sphere"),
  BoxGeometry: geometry("box"),
  CylinderGeometry: geometry("cylinder"),
  Color: class {
    constructor(r, g, b) {
      Object.assign(this, { r, g, b });
    }
  },
  MeshStandardMaterial: class {
    dispose() {
      this.disposed = true;
    }
  },
  ShaderMaterial: class {
    constructor(options) {
      Object.assign(this, options);
    }
    dispose() {
      this.disposed = true;
    }
  },
};

const CANNON = {
  Vec3: class {
    constructor(x = 0, y = 0, z = 0) {
      Object.assign(this, { x, y, z });
    }
    set(x, y, z) {
      Object.assign(this, { x, y, z });
    }
  },
  Box: class {
    constructor(halfExtents) {
      this.halfExtents = halfExtents;
    }
  },
  Sphere: class {
    constructor(radius) {
      this.radius = radius;
    }
  },
  Body: class {
    constructor(options) {
      Object.assign(this, options, { shapes: [], offsets: [] });
    }
    addShape(shape, offset) {
      this.shapes.push(shape);
      this.offsets.push(offset);
    }
    addEventListener() {}
  },
};

const TEST_AIRFRAME = {
  id: "test",
  name: "Test",
  tagline: "",
  config: { ...AIRCRAFT_CONFIG, mass: 42, initialAltitude: 7, initialSpeed: 9 },
  build(model) {
    model.builtBy = "airframe";
  },
  stabilators: {
    pivot: [1.5, -0.1, -7.9],
    outline: [
      [0, 1.5],
      [3.1, -0.7],
    ],
    thickness: 0.2,
    bevel: 0,
    lift: 0.11,
  },
  rudders: [{ position: [0, 0.6, -5.4], cant: 0.47, outline: [[2.3, 0]] }],
  gear: {
    nose: [0, -0.9, 5.2],
    left: [1.9, -0.9, -1],
    right: [-1.9, -0.9, -1],
  },
  nozzles: [{ x: 0, y: 0, z: -10 }],
  collision: [{ box: [1, 2, 3] }, { sphere: 0.5, at: [0, -1.45, 5] }],
};

const buildModel = (airframe = TEST_AIRFRAME) => {
  const scene = {
    added: [],
    add(o) {
      this.added.push(o);
    },
    remove(o) {
      this.removed = o;
    },
  };
  const world = {
    bodies: [],
    addBody(b) {
      this.bodies.push(b);
    },
    removeBody(b) {
      this.removed = b;
    },
  };
  const eventTarget = {
    listeners: [],
    addEventListener(type, fn) {
      this.listeners.push([type, fn]);
    },
    removeEventListener(type, fn) {
      this.listeners = this.listeners.filter(
        ([t, f]) => t !== type || f !== fn,
      );
    },
  };
  const model = new AircraftModel(scene, world, {}, vi.fn(), {
    THREE,
    CANNON,
    eventTarget,
    airframe,
  });
  return { model, scene, world, eventTarget };
};

describe("airframe registry", () => {
  it("has a default that is one of the shipped airframes", () => {
    expect(AIRFRAMES).toContain(DEFAULT_AIRFRAME);
    expect(AIRFRAMES.length).toBeGreaterThan(0);
  });

  it("resolves ids and falls back to the default", () => {
    expect(airframeById("f22")).toBe(F22_AIRFRAME);
    expect(airframeById("f16")).toBe(F16_AIRFRAME);
    expect(airframeById("sr71")).toBe(SR71_AIRFRAME);
    expect(airframeById("mig")).toBe(DEFAULT_AIRFRAME);
    expect(airframeById(undefined)).toBe(DEFAULT_AIRFRAME);
  });

  it("gives every airframe a unique id and the parts the model needs", () => {
    const ids = AIRFRAMES.map((airframe) => airframe.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const airframe of AIRFRAMES) {
      expect(typeof airframe.build).toBe("function");
      expect(airframe.name).toBeTruthy();
      expect(airframe.tagline).toBeTruthy();
      expect(airframe.stabilators.outline.length).toBeGreaterThan(2);
      expect(airframe.rudders.length).toBeGreaterThan(0);
      expect(Object.keys(airframe.gear)).toEqual(["nose", "left", "right"]);
      expect(airframe.nozzles.length).toBeGreaterThan(0);
      expect(airframe.collision.length).toBeGreaterThan(0);
      for (const shape of airframe.collision)
        expect(shape.box ?? shape.sphere).toBeDefined();
      for (const key of ["mass", "thrust", "wingArea", "stallAngle"])
        expect(airframe.config[key]).toBeGreaterThan(0);
    }
  });
  it("flies the SR-71 fast and heavy rather than agile", () => {
    for (const other of [F22_AIRFRAME, F16_AIRFRAME]) {
      expect(SR71_AIRFRAME.config.mass).toBeGreaterThan(other.config.mass);
      expect(SR71_AIRFRAME.config.wingArea).toBeGreaterThan(
        other.config.wingArea,
      );
      // Drag scales with wing area, so thrust has to be read against it:
      // matching the fighters' raw thrust leaves it settling slower.
      const perArea = ({ thrust, wingArea }) => thrust / wingArea;
      expect(perArea(SR71_AIRFRAME.config)).toBeGreaterThan(
        perArea(other.config),
      );
      // Big and fast, but it will not turn with either of them.
      expect(
        SR71_AIRFRAME.config.rollMoment / SR71_AIRFRAME.config.mass,
      ).toBeLessThan(other.config.rollMoment / other.config.mass);
      expect(SR71_AIRFRAME.config.stallAngle).toBeLessThan(
        other.config.stallAngle,
      );
    }
    // It starts higher and faster than the fighters.
    expect(SR71_AIRFRAME.config.initialAltitude).toBeGreaterThan(
      F22_AIRFRAME.config.initialAltitude,
    );
    expect(SR71_AIRFRAME.config.initialSpeed).toBeGreaterThan(
      F22_AIRFRAME.config.initialSpeed,
    );
  });

  it("flies the F-16 lighter and rolls it harder than the F-22", () => {
    expect(F16_AIRFRAME.config.mass).toBeLessThan(F22_AIRFRAME.config.mass);
    expect(F16_AIRFRAME.config.thrust).toBeLessThan(F22_AIRFRAME.config.thrust);
    expect(F16_AIRFRAME.config.wingArea).toBeLessThan(
      F22_AIRFRAME.config.wingArea,
    );
    expect(F16_AIRFRAME.config.rollMoment).toBeGreaterThan(
      F22_AIRFRAME.config.rollMoment,
    );
  });
});

describe("AircraftModel built from an airframe", () => {
  it("hands the bespoke shapes to the airframe and hinges the rest itself", () => {
    const { model } = buildModel();

    expect(model.builtBy).toBe("airframe");
    // Stabilators are mirrored around the centreline from one outline.
    expect(model.leftElevon.position.x).toBe(1.5);
    expect(model.rightElevon.position.x).toBe(-1.5);
    expect(model.rudders).toHaveLength(1);
    expect(model.rudders[0].position).toMatchObject({ y: 0.6, z: -5.4 });
    expect(model.rudders[0].children[0].rotation.z).toBe(0.47);
    expect(model.noseGearPivot.position).toMatchObject({ z: 5.2 });
    expect(model.wheels).toHaveLength(3);
  });

  it("takes its mass, start state and collision shapes from the airframe", () => {
    const { model, world } = buildModel();

    expect(world.bodies).toEqual([model.jetBody]);
    expect(model.jetBody.mass).toBe(42);
    expect(model.jetBody.position).toMatchObject({ y: 7 });
    expect(model.jetBody.velocity).toMatchObject({ z: 9 });

    const [box, sphere] = model.jetBody.shapes;
    expect(box.halfExtents).toMatchObject({ x: 1, y: 2, z: 3 });
    expect(model.jetBody.offsets[0]).toBeUndefined();
    expect(sphere.radius).toBe(0.5);
    expect(model.jetBody.offsets[1]).toMatchObject({ y: -1.45, z: 5 });
  });

  it("takes itself back out of the world when swapped away", () => {
    const { model, scene, world, eventTarget } = buildModel();
    expect(eventTarget.listeners).toHaveLength(1);

    model.dispose();

    expect(world.removed).toBe(model.jetBody);
    expect(scene.removed).toBe(model.jetGroup);
    expect(eventTarget.listeners).toHaveLength(0);
  });

  it("builds each shipped airframe without complaint", () => {
    for (const airframe of AIRFRAMES) {
      const { model } = buildModel(airframe);
      expect(model.jetBody.shapes.length).toBe(airframe.collision.length);
      expect(model.wheels).toHaveLength(3);
      expect(model.afterburner.plumes).toHaveLength(airframe.nozzles.length);
    }
  });
});
