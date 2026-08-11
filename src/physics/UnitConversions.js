export const metersToDisplayFeet = (meters) => meters * 3;
export const metersPerSecondToDisplayKnots = (speed) => speed * 2;
export const metersPerSecondToFeetPerMinute = (speed) => speed * 180;
export const speedToSimulatedMach = (speed, speedOfSound = 150) => speed / speedOfSound;
