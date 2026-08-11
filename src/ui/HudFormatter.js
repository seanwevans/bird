import { clamp } from "../physics/AircraftDynamics.js";
import {
  metersPerSecondToKnots,
  metersToFeet,
} from "../physics/UnitConversions.js";

export function formatFlightData(speed, mach, altitude, vsi, throttle) {
  const verticalSpeed = Math.round(vsi);
  const speedValue = Math.round(metersPerSecondToKnots(speed));
  const altitudeValue = Math.max(0, Math.round(metersToFeet(altitude)));
  const signedVsi = `${verticalSpeed > 0 ? "+" : ""}${verticalSpeed}`;
  return {
    mach: `Mach ${mach.toFixed(2)}`,
    speed: `${speedValue} kts`,
    speedValue,
    altitude: `${altitudeValue} ft`,
    altitudeValue,
    verticalSpeed: `${signedVsi} ft/m`,
    verticalSpeedValue: signedVsi,
    throttle: `${Math.round(clamp(throttle) * 100)}%`,
  };
}
