import test from "node:test";
import assert from "node:assert/strict";
import { calculateAerodynamicForces, rotateVector } from "../../src/physics/AircraftDynamics.js";

test("identity quaternion leaves a vector unchanged", () => {
  assert.deepEqual(rotateVector({ x: 1, y: 2, z: 3 }, { x: 0, y: 0, z: 0, w: 1 }), { x: 1, y: 2, z: 3 });
});

test("aerodynamic calculations are independent of rendering and physics engines", () => {
  const result = calculateAerodynamicForces({ velocity: { x: 0, y: 0, z: 100 }, quaternion: { x: 0, y: 0, z: 0, w: 1 } }, { throttle: 0.5, pitch: 1, roll: 0, yaw: 0 });
  assert.deepEqual(result.force, { x: 0, y: 500, z: 2250 });
  assert.deepEqual(result.torque, { x: 1000, y: 0, z: 0 });
  assert.equal(result.speed, 100);
  assert.equal(result.mach, 2 / 3);
});
