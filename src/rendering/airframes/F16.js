import { AIRCRAFT_CONFIG } from "../../physics/AircraftConfig.js";

/** Lighter and smaller-winged than the F-22, with a single engine, so it
 * accelerates less hard and turns on a smaller wing — but rolls faster. */
export const F16_CONFIG = Object.freeze({
  ...AIRCRAFT_CONFIG,
  mass: 82,
  thrust: 3400,
  wingArea: 1.2,
  sideArea: 2,
  inducedDragFactor: 0.14,
  stallAngle: 14,
  pitchMoment: 900,
  rollMoment: 2300,
  yawMoment: 430,
  afterburnerThreshold: 0.8,
});

/** F-16: ogive nose, blended body with root strakes, ventral intake, bubble
 * canopy, cropped delta wing, one centreline fin and two ventral fins. */
export const F16_AIRFRAME = Object.freeze({
  id: "f16",
  name: "F-16 Fighting Falcon",
  tagline: "Light and single-engined. Rolls fastest, stalls soonest.",
  config: F16_CONFIG,

  build(model) {
    const { THREE } = model;

    // Ogive radome, rounder than the Raptor's faceted one.
    const radome = new THREE.Mesh(
      new THREE.ConeGeometry(0.62, 3.2, 12),
      model.fuselageMat,
    );
    radome.rotation.x = Math.PI / 2;
    radome.position.set(0, 0.15, 5.9);
    model.jetGroup.add(radome);

    // Slender fuselage, waisted at the wing root and squared off at the nozzle.
    model.addFlatPanel(
      [
        [0.62, 4.4],
        [0.95, 3.2],
        [1.15, 1.6],
        [1.2, -1],
        [1.15, -4.6],
        [1, -7],
        [1, -7.6],
        [-1, -7.6],
        [-1, -7],
        [-1.15, -4.6],
        [-1.2, -1],
        [-1.15, 1.6],
        [-0.95, 3.2],
        [-0.62, 4.4],
      ],
      1.5,
      -0.15,
      model.fuselageMat,
      0.28,
    );

    // Chin intake, open at the front.
    const intake = new THREE.Mesh(
      new THREE.BoxGeometry(1.45, 0.85, 2.8),
      model.fuselageMat,
    );
    intake.position.set(0, -1.05, 3.2);
    model.jetGroup.add(intake);

    const mouth = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.62, 0.25),
      model.apertureMat,
    );
    mouth.position.set(0, -1.05, 4.7);
    model.jetGroup.add(mouth);

    // Frameless bubble canopy, sitting proud of the spine.
    const canopy = new THREE.Mesh(
      new THREE.SphereGeometry(0.72, 32, 16),
      model.cockpitMat,
    );
    canopy.scale.set(1, 1.05, 2.3);
    canopy.position.set(0, 0.85, 3);
    model.jetGroup.add(canopy);

    // Dorsal spine carrying back from the canopy to the fin.
    model.addFlatPanel(
      [
        [0.75, 1.8],
        [0.7, -4.6],
        [0.5, -7.2],
        [-0.5, -7.2],
        [-0.7, -4.6],
        [-0.75, 1.8],
      ],
      0.5,
      0.55,
      model.fuselageMat,
      0.14,
    );

    // Single nozzle on the centreline.
    const nozzle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.62, 0.52, 1.9, 16),
      model.fuselageMat,
    );
    nozzle.rotation.x = Math.PI / 2;
    nozzle.position.set(0, -0.15, -8.4);
    model.jetGroup.add(nozzle);

    const exhaust = new THREE.Mesh(
      new THREE.CylinderGeometry(0.44, 0.44, 0.25, 16),
      model.apertureMat,
    );
    exhaust.rotation.x = Math.PI / 2;
    exhaust.position.set(0, -0.15, -9.4);
    model.jetGroup.add(exhaust);

    // Cropped delta wing, carried forward into the root strakes as a single
    // surface: a separate strake panel wider than the wing root leaves a step
    // in the planform where the two meet.
    model.addFlatPanel(
      [
        [1.05, 4.3],
        [1.5, 1.8],
        [5, -2.4],
        [5, -3.4],
        [1.2, -5.2],
        [-1.2, -5.2],
        [-5, -3.4],
        [-5, -2.4],
        [-1.5, 1.8],
        [-1.05, 4.3],
      ],
      0.26,
      -0.3,
      model.fuselageMat,
      0.06,
    );

    // Ventral fins under the tail, canted out. Fixed surfaces, not rudders.
    for (const side of [1, -1]) {
      const fin = model.createUprightPanel(
        [
          [0.9, 0],
          [0.1, -1.1],
          [-1.1, -1.1],
          [-1.2, 0],
        ],
        0.16,
        model.fuselageMat,
        0.03,
      );
      fin.position.x = side * 1.05;
      fin.position.y = -0.75;
      fin.position.z = -6.4;
      fin.rotation.z = side * 0.35;
      model.jetGroup.add(fin);
    }
  },

  stabilators: Object.freeze({
    pivot: [1.15, -0.35, -6.7],
    outline: [
      [0, 1.3],
      [1.95, -0.5],
      [1.95, -1.4],
      [0, -1.7],
    ],
    thickness: 0.2,
    bevel: 0.05,
    lift: 0.1,
  }),

  // One tall fin on the centreline rather than the Raptor's canted pair.
  rudders: Object.freeze([
    Object.freeze({
      position: [0, 0.7, -5],
      cant: 0,
      outline: [
        [2.2, 0],
        [0.3, 3.9],
        [-1.1, 3.9],
        [-2.4, 0],
      ],
      thickness: 0.18,
      bevel: 0.05,
    }),
  ]),

  gear: Object.freeze({
    nose: [0, -1.05, 1.4],
    left: [1.45, -1.05, -1.6],
    right: [-1.45, -1.05, -1.6],
  }),

  nozzles: Object.freeze([Object.freeze({ x: 0, y: -0.15, z: -9.55 })]),

  afterburner: Object.freeze({
    cones: Object.freeze([
      Object.freeze({
        radius: 0.4,
        length: 3,
        near: Object.freeze([0.9, 0.97, 1]),
        far: Object.freeze([0.25, 0.65, 1]),
        shocks: 20,
        strength: 1,
      }),
      Object.freeze({
        radius: 0.56,
        length: 7.2,
        near: Object.freeze([0.55, 0.72, 1]),
        far: Object.freeze([0.55, 0.12, 1]),
        shocks: 10,
        strength: 0.75,
      }),
    ]),
  }),

  collision: Object.freeze([
    Object.freeze({ box: [1.1, 1.1, 4.6] }),
    Object.freeze({ box: [5, 0.14, 1.9], at: [0, -0.3, -2] }),
    Object.freeze({ box: [2.1, 0.11, 1.5], at: [0, -0.35, -6.7] }),
    Object.freeze({ sphere: 0.25, at: [0, -1.67, 1.4] }),
    Object.freeze({ sphere: 0.25, at: [-1.45, -1.67, -1.6] }),
    Object.freeze({ sphere: 0.25, at: [1.45, -1.67, -1.6] }),
  ]),
});
