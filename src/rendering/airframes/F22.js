import { AIRCRAFT_CONFIG } from "../../physics/AircraftConfig.js";

/** F-22: chined forebody, clipped delta wing, canted twin fins, two nozzles.
 *
 * An airframe supplies the shapes and numbers; AircraftModel supplies the
 * machinery around them — control surface hinges, gear, afterburner, physics
 * body and animation — so the three aircraft share one flight model.
 */
export const F22_AIRFRAME = Object.freeze({
  id: "f22",
  name: "F-22 Raptor",
  tagline: "Heavy, thrust-rich, twin canted fins.",
  config: AIRCRAFT_CONFIG,

  build(model) {
    model.buildBody();
    model.buildWings();
  },

  stabilators: Object.freeze({
    pivot: [1.5, -0.1, -7.9],
    outline: [
      [0, 1.5],
      [3.1, -0.7],
      [3.1, -1.8],
      [0, -1.9],
    ],
    thickness: 0.22,
    bevel: 0.05,
    lift: 0.11,
  }),

  // Canted fins. Each hinges about its own base so the rudders swing together
  // instead of the tail assembly twisting.
  rudders: Object.freeze(
    [1, -1].map((side) =>
      Object.freeze({
        position: [side * 1.75, 0.6, -5.4],
        cant: -side * 0.47,
        outline: [
          [2.3, 0],
          [0.1, 3.4],
          [-1.1, 3.4],
          [-2.3, 0],
        ],
        thickness: 0.2,
        bevel: 0.05,
      }),
    ),
  ),

  gear: Object.freeze({
    nose: [0, -0.9, 5.2],
    left: [1.9, -0.9, -1],
    right: [-1.9, -0.9, -1],
  }),

  /** Nozzle exits for the afterburner plumes. */
  nozzles: Object.freeze([
    Object.freeze({ x: 0.8, y: -0.05, z: -10.25 }),
    Object.freeze({ x: -0.8, y: -0.05, z: -10.25 }),
  ]),

  // Narrow fuselage, wings, tail and three gear feet.
  collision: Object.freeze([
    Object.freeze({ box: [1.2, 1.2, 5] }),
    Object.freeze({ box: [6, 0.15, 2], at: [0, 0, -1] }),
    Object.freeze({ box: [4.5, 0.12, 1.8], at: [0, 0.2, -6.9] }),
    Object.freeze({ sphere: 0.25, at: [0, -1.45, 5] }),
    Object.freeze({ sphere: 0.25, at: [-2, -1.45, -1] }),
    Object.freeze({ sphere: 0.25, at: [2, -1.45, -1] }),
  ]),
});
