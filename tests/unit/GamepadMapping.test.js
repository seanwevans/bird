import test from "node:test";
import assert from "node:assert/strict";
import { applyDeadzone, buttonPressed, buttonValue } from "../../src/input/GamepadMapping.js";

test("deadzone removes stick drift", () => { assert.equal(applyDeadzone(0.1), 0); assert.equal(applyDeadzone(-0.5), -0.5); });
test("missing gamepad buttons have safe defaults", () => { const gamepad = { buttons: [] }; assert.equal(buttonValue(gamepad, 2), 0); assert.equal(buttonPressed(gamepad, 2), false); });
