export const clamp = (value, minimum = 0, maximum = 1) =>
  Math.min(maximum, Math.max(minimum, value));

export function normalizeKey(key) {
  return key.length === 1 ? key.toLowerCase() : key;
}

export function formatFlightData(speed, mach, altitude, vsi, throttle) {
  const verticalSpeed = Math.round(vsi);
  return {
    mach: `Mach ${mach.toFixed(2)}`,
    speed: `${Math.round(speed * 2)} kts`,
    speedValue: Math.round(speed * 2),
    altitude: `${Math.max(0, Math.round(altitude * 3))} ft`,
    altitudeValue: Math.max(0, Math.round(altitude * 3)),
    verticalSpeed: `${verticalSpeed > 0 ? "+" : ""}${verticalSpeed} ft/m`,
    verticalSpeedValue: `${verticalSpeed > 0 ? "+" : ""}${verticalSpeed}`,
    throttle: `${Math.round(clamp(throttle) * 100)}%`,
  };
}

export function calculateFlightForces(speed, throttle, controls) {
  const controlAuthority = Math.min(1, speed / 40);
  return {
    thrust: 4500 * clamp(throttle),
    lift: speed * speed * 0.05,
    pitchTorque: controls.pitch * 1000 * controlAuthority,
    rollTorque: controls.roll * 1800 * controlAuthority,
    yawTorque: controls.yaw * 500 * controlAuthority,
    mach: speed / 150,
  };
}

export function resetInputState(input) {
  Object.assign(input, {
    needReset: false,
    gearDown: false,
    orbitYaw: 0,
    orbitPitch: 0,
    throttle: 0.5,
  });
}
