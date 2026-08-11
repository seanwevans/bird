// Compatibility exports for consumers of the original helper module.
export {
  clamp,
  calculateFlightForces,
} from "./src/physics/AircraftDynamics.js";
export { normalizeKey } from "./src/input/InputController.js";
export { formatFlightData } from "./src/ui/HudFormatter.js";

export function resetInputState(input) {
  if (typeof input.reset === "function") input.reset();
  else
    Object.assign(input, {
      needReset: false,
      gearDown: false,
      orbitYaw: 0,
      orbitPitch: 0,
      throttle: 0.5,
    });
}
