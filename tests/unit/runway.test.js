import { describe, expect, it } from "vitest";
import {
  AircraftModel,
  WHEEL_CONFIG,
} from "../../src/rendering/AircraftModel.js";
import { RUNWAY_CONFIG, Runway } from "../../src/rendering/Runway.js";

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
  PlaneGeometry: class {
    constructor(width, height) {
      Object.assign(this, { width, height });
    }
  },
  Matrix4: class {
    compose(position) {
      Object.assign(this, { z: position.z, y: position.y });
      return this;
    }
  },
  Quaternion: class {
    setFromAxisAngle(axis, angle) {
      Object.assign(this, { axis, angle });
      return this;
    }
  },
  Vector3: class {
    constructor(x, y, z) {
      Object.assign(this, vector(x, y, z));
    }
  },
  Mesh: class {
    constructor(geometry, material) {
      Object.assign(
        this,
        { geometry, material },
        {
          position: vector(),
          rotation: vector(),
        },
      );
    }
  },
  InstancedMesh: class {
    constructor(geometry, material, count) {
      Object.assign(
        this,
        { geometry, material, count },
        {
          position: vector(),
          rotation: vector(),
          matrices: [],
          instanceMatrix: { needsUpdate: false },
        },
      );
    }
    setMatrixAt(index, matrix) {
      this.matrices[index] = { ...matrix };
    }
  },
  Group: class {
    constructor() {
      Object.assign(this, { children: [], position: vector() });
    }
    add(child) {
      this.children.push(child);
    }
  },
};

const build = () => {
  const scene = {
    objects: [],
    add(object) {
      this.objects.push(object);
    },
  };
  return { scene, runway: new Runway(scene, { THREE, groundY: -2 }) };
};

describe("Runway", () => {
  it("sits on the ground clear of the city, aligned with the spawn heading", () => {
    const { scene, runway } = build();

    expect(scene.objects).toEqual([runway.group]);
    expect(runway.group.position).toMatchObject({
      x: 0,
      y: -2,
      z: RUNWAY_CONFIG.centerZ,
    });
    // The city spans +/-2000, so the paving has to start beyond that.
    expect(RUNWAY_CONFIG.centerZ - RUNWAY_CONFIG.length / 2).toBeGreaterThan(
      2010,
    );
  });

  it("keeps the markings above the paving and both above the ground", () => {
    const { runway } = build();
    const { surfaceLift, markingLift } = RUNWAY_CONFIG;

    expect(surfaceLift).toBeGreaterThan(0);
    expect(markingLift).toBeGreaterThan(surfaceLift);
    // The lift alone cannot win at kilometre range, so both materials also
    // carry a polygon offset, with the markings ahead of the paving.
    expect(runway.surfaceMaterial.polygonOffset).toBe(true);
    expect(runway.markingMaterial.polygonOffset).toBe(true);
    expect(runway.markingMaterial.polygonOffsetUnits).toBeLessThan(
      runway.surfaceMaterial.polygonOffsetUnits,
    );
  });

  it("centres the dashed centreline on the strip", () => {
    const { runway } = build();
    const { centerlineDashLength, centerlineGap, length } = RUNWAY_CONFIG;
    const pitch = centerlineDashLength + centerlineGap;

    const offsets = runway.centerline.matrices.map(({ z }) => z);
    expect(offsets).toHaveLength(Math.floor(length / pitch));
    expect(offsets[0]).toBeCloseTo(-offsets.at(-1));
    expect(offsets[1] - offsets[0]).toBeCloseTo(pitch);
    expect(runway.centerline.instanceMatrix.needsUpdate).toBe(true);
    expect(runway.centerline.frustumCulled).toBe(false);
  });

  it("claims a clearance margin and an approach corridor", () => {
    const { runway } = build();
    const { centerZ, width, length, clearanceMargin, approachLength } =
      RUNWAY_CONFIG;
    const near = centerZ - length / 2;

    // Just off the edge and short of the threshold: still the runway's air.
    expect(runway.obstructs({ x: width / 2 + 10, z: centerZ })).toBe(true);
    expect(runway.obstructs({ x: 0, z: near - approachLength + 10 })).toBe(
      true,
    );
    // Well beside it, and behind the approach, is fair game for scenery.
    expect(
      runway.obstructs({ x: width / 2 + clearanceMargin + 10, z: centerZ }),
    ).toBe(false);
    expect(runway.obstructs({ x: 0, z: near - approachLength - 10 })).toBe(
      false,
    );
  });

  it("reports whether a position is over the paving", () => {
    const { runway } = build();
    const { centerZ, width, length } = RUNWAY_CONFIG;

    expect(runway.contains({ x: 0, z: centerZ })).toBe(true);
    expect(runway.contains({ x: width / 2 - 1, z: centerZ })).toBe(true);
    expect(runway.contains({ x: width, z: centerZ })).toBe(false);
    expect(runway.contains({ x: 0, z: centerZ + length })).toBe(false);
  });
});

describe("wheel rotation", () => {
  const spin = (state, input, deltaTime = 1 / 60) => {
    const rig = {
      wheels: [{ rotation: { x: 0 } }, { rotation: { x: 0 } }],
      wheelRate: 0,
      forwardSpeed: 0,
      groundContactAge: Infinity,
      ...state,
    };
    AircraftModel.prototype.updateWheels.call(rig, input, deltaTime);
    return rig;
  };

  it("turns the wheels at ground speed while rolling", () => {
    const rolling = spin(
      { forwardSpeed: 32, groundContactAge: 0 },
      { gearDown: true },
    );

    expect(rolling.wheelRate).toBeCloseTo(32 / WHEEL_CONFIG.radius);
    // Positive rotation about the axle carries the top of the wheel forward.
    expect(rolling.wheels[0].rotation.x).toBeGreaterThan(0);
    expect(rolling.wheels[1].rotation.x).toBe(rolling.wheels[0].rotation.x);
  });

  it("free-wheels down instead of stopping dead once airborne", () => {
    const airborne = spin(
      { wheelRate: 100, forwardSpeed: 80, groundContactAge: 1 },
      { gearDown: true },
    );

    expect(airborne.wheelRate).toBeLessThan(100);
    expect(airborne.wheelRate).toBeGreaterThan(90);
  });

  it("does not drive the wheels with the gear retracted", () => {
    const retracted = spin(
      { forwardSpeed: 32, groundContactAge: 0 },
      { gearDown: false },
    );

    expect(retracted.wheelRate).toBe(0);
  });

  it("stops treating the wheels as rolling once contact goes stale", () => {
    const stale = spin(
      { forwardSpeed: 32, groundContactAge: WHEEL_CONFIG.contactWindow },
      { gearDown: true },
    );

    expect(stale.wheelRate).toBe(0);
  });
});
