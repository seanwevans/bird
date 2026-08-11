/**
 * Simulation units are SI: metres, seconds, kilograms, newtons, pascals and
 * radians. Angles in the coefficient tables are degrees for readability.
 */
export const AIRCRAFT_CONFIG = Object.freeze({
  mass: 100,
  initialAltitude: 150,
  initialSpeed: 150,
  gravity: -9.80665,
  thrust: 4500,
  wingArea: 1.5,
  sideArea: 2.5,
  seaLevelDensity: 1.225,
  densityScaleHeight: 8500,
  speedOfSound: 343,
  inducedDragFactor: 0.12,
  sideForceSlope: 0.8,
  gearDragCoefficient: 0.08,
  stallAngle: 15,
  referenceDynamicPressure: 3500,
  pitchMoment: 1000,
  rollMoment: 1800,
  yawMoment: 500,
  liftCurve: Object.freeze([
    [-45, -0.15],
    [-25, -0.35],
    [-15, -0.9],
    [0, 0.06],
    [15, 1.05],
    [25, 0.4],
    [45, 0.15],
  ]),
  dragCurve: Object.freeze([
    [0, 0.025],
    [10, 0.04],
    [15, 0.08],
    [25, 0.3],
    [45, 0.8],
  ]),
});
