import { F16_AIRFRAME } from "./F16.js";
import { F22_AIRFRAME } from "./F22.js";

/** Selectable aircraft, in the order they appear on the start screen. */
export const AIRFRAMES = Object.freeze([F22_AIRFRAME, F16_AIRFRAME]);

export const DEFAULT_AIRFRAME = F22_AIRFRAME;

export const airframeById = (id) =>
  AIRFRAMES.find((airframe) => airframe.id === id) ?? DEFAULT_AIRFRAME;
