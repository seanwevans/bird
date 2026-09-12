import { AIRCRAFT_CONFIG } from "../../physics/AircraftConfig.js";

/** Built for speed and altitude rather than manoeuvre: heavy, with a big wing
 * that lifts well in thin air and control moments low enough for its mass that
 * it has to be flown in wide arcs. The thrust is sized against that wing —
 * drag scales with wing area, so matching the fighters' thrust would have left
 * it settling slower than either of them. */
export const SR71_CONFIG = Object.freeze({
  ...AIRCRAFT_CONFIG,
  mass: 190,
  thrust: 15000,
  wingArea: 3.4,
  sideArea: 4.2,
  initialAltitude: 400,
  initialSpeed: 260,
  inducedDragFactor: 0.09,
  stallAngle: 11,
  pitchMoment: 1500,
  rollMoment: 1700,
  yawMoment: 700,
  afterburnerThreshold: 0.7,
});

/** SR-71: needle nose, full-length chines, a slender delta wing carrying two
 * outboard nacelles, canted inward rudders on top of them. */
export const SR71_AIRFRAME = Object.freeze({
  id: "sr71",
  name: "SR-71 Blackbird",
  tagline:
    "Enormous and fast. Wide turns, thin margins, lights the burner early.",
  config: SR71_CONFIG,

  build(model) {
    const { THREE } = model;

    // Needle nose and the long forward fuselage behind it.
    const nose = new THREE.Mesh(
      new THREE.ConeGeometry(0.55, 5.4, 10),
      model.fuselageMat,
    );
    nose.rotation.x = Math.PI / 2;
    nose.position.set(0, 0.1, 9.6);
    model.jetGroup.add(nose);

    // Chines run the whole length, flaring from the nose into the wing so the
    // fuselage and wing read as one surface.
    model.addFlatPanel(
      [
        [0.55, 7.2],
        [1.1, 4.4],
        [1.5, 1.2],
        [1.6, -3],
        [1.5, -7.2],
        [1.4, -9.4],
        [-1.4, -9.4],
        [-1.5, -7.2],
        [-1.6, -3],
        [-1.5, 1.2],
        [-1.1, 4.4],
        [-0.55, 7.2],
      ],
      1.4,
      0,
      model.fuselageMat,
      0.3,
    );

    // Slender delta, swept back about 60 degrees, with one straight trailing
    // edge across the whole span.
    model.addFlatPanel(
      [
        [1.5, 3.2],
        [7.4, -6.6],
        [7.4, -9.2],
        [-7.4, -9.2],
        [-7.4, -6.6],
        [-1.5, 3.2],
      ],
      0.32,
      -0.25,
      model.fuselageMat,
      0.08,
    );

    // Small tandem cockpit well forward, faired into the chine.
    const canopy = new THREE.Mesh(
      new THREE.SphereGeometry(0.6, 24, 12),
      model.cockpitMat,
    );
    canopy.scale.set(0.95, 0.75, 2.6);
    canopy.position.set(0, 0.75, 5.4);
    model.jetGroup.add(canopy);

    // Nacelles mounted mid-span, each a long cylinder with a spike in the
    // inlet and a dark exhaust at the back.
    for (const side of [1, -1]) {
      const nacelle = new THREE.Mesh(
        new THREE.CylinderGeometry(1.05, 1.05, 9.6, 20),
        model.fuselageMat,
      );
      nacelle.rotation.x = Math.PI / 2;
      nacelle.position.set(side * 4.2, -0.1, -2.6);
      model.jetGroup.add(nacelle);

      const spike = new THREE.Mesh(
        new THREE.ConeGeometry(0.72, 2.4, 16),
        model.fuselageMat,
      );
      spike.rotation.x = Math.PI / 2;
      spike.position.set(side * 4.2, -0.1, 3.4);
      model.jetGroup.add(spike);

      const inlet = new THREE.Mesh(
        new THREE.CylinderGeometry(1.02, 1.02, 0.3, 20),
        model.apertureMat,
      );
      inlet.rotation.x = Math.PI / 2;
      inlet.position.set(side * 4.2, -0.1, 2.15);
      model.jetGroup.add(inlet);

      const exhaust = new THREE.Mesh(
        new THREE.CylinderGeometry(0.88, 0.88, 0.3, 20),
        model.apertureMat,
      );
      exhaust.rotation.x = Math.PI / 2;
      exhaust.position.set(side * 4.2, -0.1, -7.5);
      model.jetGroup.add(exhaust);
    }
  },

  // Inboard elevons on the wing trailing edge rather than tailplanes: the
  // aircraft has no horizontal tail.
  stabilators: Object.freeze({
    pivot: [4, -0.25, -8.9],
    outline: [
      [-2.2, 0.2],
      [2.2, 0.2],
      [2.2, -1.5],
      [-2.2, -1.5],
    ],
    thickness: 0.24,
    bevel: 0.05,
    lift: 0.12,
  }),

  // All-moving fins canted inward over the nacelles.
  rudders: Object.freeze(
    [1, -1].map((side) =>
      Object.freeze({
        position: [side * 4.2, 0.85, -4.6],
        cant: side * 0.26,
        outline: [
          [2.1, 0],
          [0.2, 3.1],
          [-1, 3.1],
          [-2.1, 0],
        ],
        thickness: 0.22,
        bevel: 0.05,
      }),
    ),
  ),

  gear: Object.freeze({
    nose: [0, -0.95, 6],
    left: [3.3, -0.95, -1.4],
    right: [-3.3, -0.95, -1.4],
  }),

  nozzles: Object.freeze([
    Object.freeze({ x: 4.2, y: -0.1, z: -7.7 }),
    Object.freeze({ x: -4.2, y: -0.1, z: -7.7 }),
  ]),

  afterburner: Object.freeze({
    cones: Object.freeze([
      Object.freeze({
        radius: 0.82,
        length: 4.4,
        near: Object.freeze([1, 0.95, 0.82]),
        far: Object.freeze([1, 0.45, 0.18]),
        shocks: 18,
        strength: 1,
      }),
      Object.freeze({
        radius: 1.02,
        length: 11,
        near: Object.freeze([1, 0.62, 0.3]),
        far: Object.freeze([0.85, 0.18, 0.5]),
        shocks: 9,
        strength: 0.8,
      }),
    ]),
    minimumStretch: 0.5,
  }),

  collision: Object.freeze([
    Object.freeze({ box: [1.6, 1, 9] }),
    Object.freeze({ box: [7.4, 0.16, 5], at: [0, -0.25, -4] }),
    Object.freeze({ box: [1.1, 1.1, 4.8], at: [4.2, -0.1, -2.6] }),
    Object.freeze({ box: [1.1, 1.1, 4.8], at: [-4.2, -0.1, -2.6] }),
    Object.freeze({ sphere: 0.25, at: [0, -1.57, 6] }),
    Object.freeze({ sphere: 0.25, at: [3.3, -1.57, -1.4] }),
    Object.freeze({ sphere: 0.25, at: [-3.3, -1.57, -1.4] }),
  ]),
});
