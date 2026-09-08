import { describe, expect, it } from "vitest";
import { AIRCRAFT_CONFIG } from "../../src/physics/AircraftConfig.js";
import { afterburnerIntensity } from "../../src/physics/AircraftDynamics.js";
import {
  AFTERBURNER_CONFIG,
  Afterburner,
} from "../../src/rendering/Afterburner.js";

const vector = () => ({
  x: 0,
  y: 0,
  z: 0,
  set(x, y, z) {
    Object.assign(this, { x, y, z });
  },
});

const THREE = {
  DoubleSide: "double",
  AdditiveBlending: "additive",
  Color: class {
    constructor(r, g, b) {
      Object.assign(this, { r, g, b });
    }
  },
  ConeGeometry: class {
    constructor(radius, length) {
      Object.assign(this, { radius, length });
    }
  },
  ShaderMaterial: class {
    constructor(options) {
      Object.assign(this, options);
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
          scale: vector(),
        },
      );
    }
  },
  Group: class {
    constructor() {
      Object.assign(this, {
        children: [],
        position: vector(),
        scale: vector(),
      });
    }
    add(child) {
      this.children.push(child);
    }
  },
};

const build = () => {
  const jetGroup = new THREE.Group();
  return { jetGroup, afterburner: new Afterburner(jetGroup, { THREE }) };
};

describe("afterburnerIntensity", () => {
  const { afterburnerThreshold } = AIRCRAFT_CONFIG;

  it("stays dark below the threshold and saturates at full throttle", () => {
    expect(afterburnerIntensity(0)).toBe(0);
    expect(afterburnerIntensity(afterburnerThreshold)).toBe(0);
    expect(afterburnerIntensity(1)).toBe(1);
    expect(afterburnerIntensity(2)).toBe(1);
  });

  it("ramps linearly across the top of the throttle range", () => {
    const midpoint = afterburnerThreshold + (1 - afterburnerThreshold) / 2;
    expect(afterburnerIntensity(midpoint)).toBeCloseTo(0.5);
  });

  it("treats a threshold of 1 as an on/off detent", () => {
    const config = { ...AIRCRAFT_CONFIG, afterburnerThreshold: 1 };
    expect(afterburnerIntensity(0.999, config)).toBe(0);
    expect(afterburnerIntensity(1, config)).toBe(1);
  });
});

describe("Afterburner", () => {
  it("hangs one plume off each nozzle", () => {
    const { jetGroup, afterburner } = build();

    expect(jetGroup.children).toEqual(afterburner.plumes);
    expect(afterburner.plumes.map(({ position: { x, z } }) => [x, z])).toEqual(
      AFTERBURNER_CONFIG.nozzles.map(({ x, z }) => [x, z]),
    );
    // Every cone caps the nozzle and tapers aft, along -z.
    for (const plume of afterburner.plumes)
      for (const cone of plume.children) {
        expect(cone.rotation.x).toBeCloseTo(-Math.PI / 2);
        expect(cone.position.z).toBe(-cone.geometry.length / 2);
      }
  });

  it("passes plume colours through as raw linear components", () => {
    const { afterburner } = build();
    const [core] = afterburner.plumes[0].children;
    const [near] = AFTERBURNER_CONFIG.cones;

    // Hex would be run through Three.js colour management and come out dark.
    expect(core.material.uniforms.nearColor.value).toEqual({
      r: near.near[0],
      g: near.near[1],
      b: near.near[2],
    });
  });

  it("stays hidden until the burner lights, then stretches with it", () => {
    const { afterburner } = build();

    afterburner.update(0, 1 / 60);
    expect(afterburner.plumes.every((plume) => plume.visible)).toBe(false);

    afterburner.update(1, 1 / 60);
    expect(afterburner.plumes.every((plume) => plume.visible)).toBe(true);
    expect(afterburner.plumes[0].scale.z).toBe(1);

    afterburner.update(0.5, 1 / 60);
    const { minimumStretch } = AFTERBURNER_CONFIG;
    expect(afterburner.plumes[0].scale.z).toBeCloseTo(
      minimumStretch + (1 - minimumStretch) * 0.5,
    );
  });

  it("shares its animation clock across every cone", () => {
    const { afterburner } = build();
    const materials = afterburner.plumes.flatMap((plume) =>
      plume.children.map((cone) => cone.material),
    );

    afterburner.update(1, 0.25);
    afterburner.update(1, 0.25);

    expect(materials).toHaveLength(4);
    for (const material of materials) {
      expect(material.uniforms.time.value).toBeCloseTo(0.5);
      expect(material.uniforms.intensity.value).toBe(1);
    }
  });
});
