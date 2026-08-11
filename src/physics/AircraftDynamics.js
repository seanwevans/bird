import { AIRCRAFT_CONFIG } from "./AircraftConfig.js";

export const clamp = (value, minimum = 0, maximum = 1) =>
  Math.min(maximum, Math.max(minimum, value));

export function interpolateCurve(curve, value) {
  if (value <= curve[0][0]) return curve[0][1];
  for (let index = 1; index < curve.length; index++) {
    const [x1, y1] = curve[index];
    if (value <= x1) {
      const [x0, y0] = curve[index - 1];
      return y0 + ((value - x0) / (x1 - x0)) * (y1 - y0);
    }
  }
  return curve.at(-1)[1];
}

export const airDensityAtAltitude = (altitude, config = AIRCRAFT_CONFIG) =>
  config.seaLevelDensity *
  Math.exp(-Math.max(0, altitude) / config.densityScaleHeight);

/** Calculate deterministic aerodynamic forces in aircraft-local axes (x right,
 * y up, z forward). Velocity is in m/s and altitude is metres above sea level.
 */
export function calculateFlightForces(
  localVelocity,
  altitude,
  throttle,
  controls,
  gearDown = false,
  config = AIRCRAFT_CONFIG,
) {
  const { x, y, z } = localVelocity;
  const speed = Math.hypot(x, y, z);
  const forwardPlaneSpeed = Math.hypot(y, z);
  const angleOfAttack = y === 0 ? 0 : Math.atan2(-y, z || Number.EPSILON);
  const sideslip = Math.atan2(x, forwardPlaneSpeed || Number.EPSILON);
  const density = airDensityAtAltitude(altitude, config);
  const dynamicPressure = 0.5 * density * speed * speed;
  const aoaDegrees = (angleOfAttack * 180) / Math.PI;
  const liftCoefficient = interpolateCurve(config.liftCurve, aoaDegrees);
  const profileDrag = interpolateCurve(config.dragCurve, Math.abs(aoaDegrees));
  const dragCoefficient =
    profileDrag +
    config.inducedDragFactor * liftCoefficient * liftCoefficient +
    (gearDown ? config.gearDragCoefficient : 0);
  const lift = dynamicPressure * config.wingArea * liftCoefficient;
  const drag = dynamicPressure * config.wingArea * dragCoefficient;
  const side =
    -dynamicPressure * config.sideArea * config.sideForceSlope * sideslip;
  const inverseSpeed = speed > 1e-6 ? 1 / speed : 0;
  const planeInverse = forwardPlaneSpeed > 1e-6 ? 1 / forwardPlaneSpeed : 0;
  const authority = clamp(dynamicPressure / config.referenceDynamicPressure);

  return {
    localForce: {
      x: -drag * x * inverseSpeed + side,
      y: -drag * y * inverseSpeed + lift * z * planeInverse,
      z:
        -drag * z * inverseSpeed -
        lift * y * planeInverse +
        config.thrust * clamp(throttle),
    },
    localTorque: {
      x: controls.pitch * config.pitchMoment * authority,
      y: controls.yaw * config.yawMoment * authority,
      z: controls.roll * config.rollMoment * authority,
    },
    speed,
    density,
    dynamicPressure,
    angleOfAttack,
    sideslip,
    liftCoefficient,
    dragCoefficient,
    stall: Math.abs(aoaDegrees) >= config.stallAngle,
    mach: speed / config.speedOfSound,
    gLoad: lift / (config.mass * Math.abs(config.gravity)),
  };
}
