import test from "node:test";
import assert from "node:assert/strict";
import { formatFlightData } from "../../src/ui/HudFormatter.js";

test("formats flight values without a DOM", () => {
  assert.deepEqual(formatFlightData({ speed: 50, mach: 0.5, altitude: 100, verticalSpeed: 12.6, throttle: 0.755 }), { mach: "Mach 0.50", speed: "100 kts", altitude: "300 ft", verticalSpeed: "+13 ft/m", throttle: "76%", raw: { speed: 100, altitude: 300, verticalSpeed: "+13" } });
});
