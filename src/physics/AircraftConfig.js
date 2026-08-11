/** @typedef {{mass:number, initialAltitude:number, initialSpeed:number, gravity:number, thrust:number, liftCoefficient:number, controlSpeed:number, pitchTorque:number, rollTorque:number, yawTorque:number, speedOfSound:number}} AircraftConfig */

/** @type {Readonly<AircraftConfig>} */
export const AIRCRAFT_CONFIG = Object.freeze({
  mass: 100,
  initialAltitude: 150,
  initialSpeed: 150,
  gravity: -15,
  thrust: 4500,
  liftCoefficient: 0.05,
  controlSpeed: 40,
  pitchTorque: 1000,
  rollTorque: 1800,
  yawTorque: 500,
  speedOfSound: 150,
});
