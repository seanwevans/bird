import { AIRCRAFT_CONFIG } from "./AircraftConfig.js";

export const clamp = (value, minimum = 0, maximum = 1) =>
  Math.min(maximum, Math.max(minimum, value));

/**
 * Calculate aerodynamic forces without depending on Cannon or Three.js.
 * @param {number} speed
 * @param {number} throttle
 * @param {{pitch:number, roll:number, yaw:number}} controls
 * @param {import('./AircraftConfig.js').AircraftConfig} config
 */
export function calculateFlightForces(
  speed,
  throttle,
  controls,
  config = AIRCRAFT_CONFIG,
) {
  const controlAuthority = Math.min(1, speed / config.controlSpeed);
  return {
    thrust: config.thrust * clamp(throttle),
    lift: speed * speed * config.liftCoefficient,
    pitchTorque: controls.pitch * config.pitchTorque * controlAuthority,
    rollTorque: controls.roll * config.rollTorque * controlAuthority,
    yawTorque: controls.yaw * config.yawTorque * controlAuthority,
    mach: speed / config.speedOfSound,
  };
}
