import test from "node:test";
import assert from "node:assert/strict";
import { FlightSimulator } from "../../src/app/FlightSimulator.js";

test("coordinates one simulation tick", () => {
  const calls = [];
  const body = { position: { y: 10 }, velocity: { y: 2 } };
  const simulator = new FlightSimulator({
    renderer: { updateCamera: () => calls.push("camera"), render: () => calls.push("render") },
    world: { step: (value) => calls.push(["step", value]) }, input: { update: () => calls.push("input"), gearDown: false, throttle: 0.5, orbitYaw: 0, orbitPitch: 0 },
    hud: { userWindOpacity: 0.1, currentViewMode: 0, updateGear: () => {}, updateFlightData: () => calls.push("hud"), updateVelocityVector: () => {}, updateHorizon: () => {} },
    environment: {}, dynamics: { body, update: () => ({ speed: 20, mach: 0.2 }) }, aircraftModel: { jetGroup: {}, sync: () => calls.push("sync") }, wind: { update: () => calls.push("wind") }, requestFrame: () => {}
  });
  simulator.tick();
  assert.deepEqual(calls, ["input", ["step", 1 / 60], "sync", "wind", "hud", "camera", "render"]);
});
