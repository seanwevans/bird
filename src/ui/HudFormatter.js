import { metersToDisplayFeet, metersPerSecondToDisplayKnots } from "../physics/UnitConversions.js";

export function formatFlightData({ speed, mach, altitude, verticalSpeed, throttle }) {
  const vsi = Math.round(verticalSpeed);
  return {
    mach: `Mach ${mach.toFixed(2)}`,
    speed: `${Math.round(metersPerSecondToDisplayKnots(speed))} kts`,
    altitude: `${Math.max(0, Math.round(metersToDisplayFeet(altitude)))} ft`,
    verticalSpeed: `${vsi > 0 ? "+" : ""}${vsi} ft/m`,
    throttle: `${Math.round(throttle * 100)}%`,
    raw: { speed: Math.round(metersPerSecondToDisplayKnots(speed)), altitude: Math.max(0, Math.round(metersToDisplayFeet(altitude))), verticalSpeed: `${vsi > 0 ? "+" : ""}${vsi}` }
  };
}
