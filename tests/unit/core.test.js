import { describe, expect, it } from "vitest";
import {
  calculateFlightForces,
  clamp,
  formatFlightData,
  normalizeKey,
  resetInputState,
} from "../../core.js";

describe("flight helpers", () => {
  it("normalizes shifted letter keys without changing named keys", () => {
    expect(normalizeKey("W")).toBe("w");
    expect(normalizeKey("Shift")).toBe("Shift");
  });

  it("clamps throttle values", () => {
    expect(clamp(1.5)).toBe(1);
    expect(clamp(-0.5)).toBe(0);
  });

  it("converts and formats HUD values", () => {
    expect(formatFlightData(100, 0.666, 150, 42.4, 0.755)).toEqual({
      mach: "Mach 0.67",
      speed: "200 kts",
      speedValue: 200,
      altitude: "450 ft",
      altitudeValue: 450,
      verticalSpeed: "+42 ft/m",
      verticalSpeedValue: "+42",
      throttle: "76%",
    });
  });

  it("calculates airflow-relative forces, stall, gear drag, and Mach", () => {
    const clean = calculateFlightForces(
      { x: 0, y: 0, z: 100 },
      0,
      0.5,
      { pitch: 1, roll: -1, yaw: 0.5 },
      false,
    );
    const gear = calculateFlightForces(
      { x: 0, y: 0, z: 100 },
      0,
      0.5,
      { pitch: 1, roll: -1, yaw: 0.5 },
      true,
    );
    expect(clean.angleOfAttack).toBe(0);
    expect(clean.dynamicPressure).toBeCloseTo(6125);
    expect(clean.localForce.y).toBeCloseTo(551.25);
    expect(gear.dragCoefficient).toBeCloseTo(clean.dragCoefficient + 0.08);
    expect(gear.localForce.z).toBeLessThan(clean.localForce.z);
    expect(clean.localTorque).toEqual({ x: 1000, y: 250, z: -1800 });
    expect(clean.mach).toBeCloseTo(100 / 343);
    expect(
      calculateFlightForces({ x: 0, y: -50, z: 100 }, 0, 0, {
        pitch: 0,
        roll: 0,
        yaw: 0,
      }).stall,
    ).toBe(true);
  });

  it("restores the input state after a reset", () => {
    const input = {
      needReset: true,
      gearDown: true,
      orbitYaw: 2,
      orbitPitch: 1,
      throttle: 1,
    };
    resetInputState(input);
    expect(input).toEqual({
      needReset: false,
      gearDown: false,
      orbitYaw: 0,
      orbitPitch: 0,
      throttle: 0.5,
    });
  });
});
