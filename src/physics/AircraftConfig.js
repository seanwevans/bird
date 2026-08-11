export const AIRCRAFT_CONFIG = Object.freeze({
  mass: 100,
  initialPosition: Object.freeze({ x: 0, y: 150, z: 0 }),
  initialVelocity: Object.freeze({ x: 0, y: 0, z: 150 }),
  halfExtents: Object.freeze({ x: 2, y: 1.6, z: 5 }),
  maxThrust: 4500,
  liftCoefficient: 0.05,
  controlSpeed: 40,
  pitchTorque: 1000,
  rollTorque: 1800,
  yawTorque: 500,
  simulatedSpeedOfSound: 150
});
