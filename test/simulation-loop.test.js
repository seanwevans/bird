const assert = require("node:assert/strict");
const test = require("node:test");

const {
  FIXED_TIME_STEP,
  MAX_FRAME_DELTA,
  MAX_SUB_STEPS,
  advancePhysics,
  clampFrameDelta,
  frameRateIndependentAlpha
} = require("../script.js");

test("advances Cannon with a known elapsed time", () => {
  const calls = [];
  const world = { step: (...args) => calls.push(args) };

  const advanced = advancePhysics(world, 1 / 30);

  assert.equal(advanced, 1 / 30);
  assert.deepEqual(calls, [[FIXED_TIME_STEP, 1 / 30, MAX_SUB_STEPS]]);
});

test("clamps restoration deltas and ignores negative time", () => {
  assert.equal(clampFrameDelta(10), MAX_FRAME_DELTA);
  assert.equal(clampFrameDelta(-1), 0);

  const world = { step: () => assert.fail("negative time must not step") };
  assert.equal(advancePhysics(world, -1), 0);
});

test("smoothing produces the same result at different frame rates", () => {
  function smoothAt(fps) {
    let value = 0;
    for (let frame = 0; frame < fps; frame += 1) {
      value += (1 - value) * frameRateIndependentAlpha(0.1, 1 / fps);
    }
    return value;
  }

  const baseline = smoothAt(60);
  for (const fps of [30, 120, 144]) {
    assert.ok(Math.abs(smoothAt(fps) - baseline) < 1e-12);
  }
});
