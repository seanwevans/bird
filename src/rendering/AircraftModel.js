import {
  afterburnerIntensity,
  calculateFlightForces,
  clamp,
} from "../physics/AircraftDynamics.js";
import { AIRCRAFT_CONFIG } from "../physics/AircraftConfig.js";
import { Afterburner } from "./Afterburner.js";
import { ShaderUtils } from "./ShaderUtils.js";

export class AircraftModel {
  constructor(
    scene,
    physicsWorld,
    physicsMaterial,
    onCrashCallback,
    { THREE, CANNON, eventTarget = globalThis.window },
  ) {
    this.THREE = THREE;
    this.CANNON = CANNON;
    this.eventTarget = eventTarget;
    this.scene = scene;
    this.world = physicsWorld;
    this.onCrash = onCrashCallback;

    this.jetGroup = new this.THREE.Group();
    this.heatUniforms = { windSpeed: { value: 0.0 } };
    this.simulatedMach = 0;
    this.afterburnerLevel = 0;
    this.flightData = { angleOfAttack: 0, gLoad: 0, stall: false };

    this.buildMeshes();
    this.buildPhysics(physicsMaterial);

    // Listen for UI view mode changes to toggle wireframe
    this.eventTarget?.addEventListener("viewModeChanged", (e) => {
      const isWireframe = e.detail === 3;
      for (const material of this.shellMats) {
        material.wireframe = isWireframe;
        material.transparent = isWireframe;
        material.opacity = isWireframe ? 0.2 : 1.0;
      }
    });
  }
  buildMeshes() {
    this.fuselageMat = new this.THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.4,
      metalness: 0.3,
    });
    this.cockpitMat = new this.THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.1,
      metalness: 0.8,
    });
    // Intake mouths and nozzles stay off the thermal shader so they read as
    // dark openings in every sensor view.
    this.apertureMat = new this.THREE.MeshStandardMaterial({
      color: 0x14181c,
      roughness: 0.9,
      metalness: 0.2,
    });

    this.shellMats = [this.fuselageMat, this.cockpitMat];
    for (const material of this.shellMats)
      ShaderUtils.applyThermalShader(material, this.heatUniforms);

    this.buildBody();
    this.buildWings();
    this.buildTail();
    this.buildGear();
    this.afterburner = new Afterburner(this.jetGroup, { THREE: this.THREE });
    this.scene.add(this.jetGroup);
  }
  /** Extrude a flat outline into a slab. Points are [across, along] pairs; the
   * slab is thickened along the remaining axis and centred on the origin. */
  createPanel(points, thickness, material, bevel = 0) {
    const shape = new this.THREE.Shape();
    shape.moveTo(...points[0]);
    for (const point of points.slice(1)) shape.lineTo(...point);
    shape.closePath();
    return new this.THREE.Mesh(
      new this.THREE.ExtrudeGeometry(shape, {
        depth: thickness,
        bevelEnabled: bevel > 0,
        bevelThickness: bevel,
        bevelSize: bevel,
        bevelOffset: 0,
        bevelSegments: 1,
      }),
      material,
    );
  }
  /** Lay a panel flat at a given vertical centre: points are [x, z forward]. */
  addFlatPanel(points, thickness, centreY, material, bevel = 0) {
    const panel = this.createPanel(points, thickness, material, bevel);
    panel.rotation.x = Math.PI / 2;
    panel.position.y = centreY + thickness / 2;
    this.jetGroup.add(panel);
    return panel;
  }
  /** Stand a panel on edge: outline points read as [z forward, y up]. */
  createUprightPanel(points, thickness, material, bevel = 0) {
    const panel = this.createPanel(points, thickness, material, bevel);
    panel.rotation.y = -Math.PI / 2;
    panel.position.x = thickness / 2;
    return panel;
  }
  buildBody() {
    // Faceted radome: a four sided pyramid gives the diamond cross section and
    // the horizontal chine edges that define the forward fuselage.
    const radome = new this.THREE.Mesh(
      new this.THREE.ConeGeometry(0.95, 4.6, 4),
      this.fuselageMat,
    );
    radome.rotation.x = Math.PI / 2;
    radome.position.set(0, 0.05, 6.9);
    this.jetGroup.add(radome);

    // Chined planform widening over the intakes, then parallel sides running
    // back to the nozzles. The body frame is z forward and y up, so +x is the
    // left side of the aircraft.
    this.addFlatPanel(
      [
        [0.95, 4.9],
        [1.4, 3.6],
        [1.9, 1.8],
        [2.05, 0],
        [1.95, -4],
        [1.6, -7.6],
        [1.6, -9],
        [-1.6, -9],
        [-1.6, -7.6],
        [-1.95, -4],
        [-2.05, 0],
        [-1.9, 1.8],
        [-1.4, 3.6],
        [-0.95, 4.9],
      ],
      1.7,
      0,
      this.fuselageMat,
      0.3,
    );

    // Weapons bay keel, deepening the belly through the mid fuselage.
    this.addFlatPanel(
      [
        [1.45, 3],
        [1.5, -1],
        [1.3, -5.4],
        [-1.3, -5.4],
        [-1.5, -1],
        [-1.45, 3],
      ],
      0.55,
      -1,
      this.fuselageMat,
      0.15,
    );

    // Dorsal deck behind the canopy, stepped in from the chines.
    this.addFlatPanel(
      [
        [1.05, 4.4],
        [1.4, 1.6],
        [1.3, -5.6],
        [0.9, -8.6],
        [-0.9, -8.6],
        [-1.3, -5.6],
        [-1.4, 1.6],
        [-1.05, 4.4],
      ],
      0.7,
      1.05,
      this.fuselageMat,
      0.2,
    );

    const canopy = new this.THREE.Mesh(
      new this.THREE.SphereGeometry(0.85, 32, 16),
      this.cockpitMat,
    );
    canopy.scale.set(1.05, 0.8, 2.5);
    canopy.position.set(0, 1.15, 3.4);
    this.jetGroup.add(canopy);

    // Caret intakes, raked outward under the chine and open at the front.
    for (const side of [1, -1]) {
      const intake = new this.THREE.Mesh(
        new this.THREE.BoxGeometry(0.9, 1.4, 4.4),
        this.fuselageMat,
      );
      intake.position.set(side * 1.8, -0.45, 1.6);
      intake.rotation.z = side * 0.12;
      this.jetGroup.add(intake);

      const mouth = new this.THREE.Mesh(
        new this.THREE.BoxGeometry(0.7, 1.1, 0.25),
        this.apertureMat,
      );
      mouth.position.set(side * 1.8, -0.45, 3.75);
      mouth.rotation.z = side * 0.12;
      this.jetGroup.add(mouth);
    }

    // Twin two-dimensional thrust vectoring nozzles.
    for (const side of [1, -1]) {
      const nozzle = new this.THREE.Mesh(
        new this.THREE.BoxGeometry(1.05, 1.05, 1.9),
        this.fuselageMat,
      );
      nozzle.position.set(side * 0.8, -0.05, -9.2);
      this.jetGroup.add(nozzle);

      const exhaust = new this.THREE.Mesh(
        new this.THREE.BoxGeometry(0.8, 0.8, 0.3),
        this.apertureMat,
      );
      exhaust.position.set(side * 0.8, -0.05, -10.1);
      this.jetGroup.add(exhaust);
    }
  }
  buildWings() {
    // Clipped delta: a 40 degree swept leading edge and a forward swept
    // trailing edge, with the root tucked inside the chines.
    this.addFlatPanel(
      [
        [1.7, 2.4],
        [6.9, -2],
        [6.9, -3.6],
        [1.7, -6.4],
        [-1.7, -6.4],
        [-6.9, -3.6],
        [-6.9, -2],
        [-1.7, 2.4],
      ],
      0.3,
      -0.2,
      this.fuselageMat,
      0.07,
    );
  }
  buildTail() {
    // All-moving stabilators, hinged at the root so pitch and roll deflect the
    // whole surface the way the real aircraft does.
    const stabilators = [
      ["leftElevon", 1],
      ["rightElevon", -1],
    ];
    for (const [name, side] of stabilators) {
      const pivot = new this.THREE.Group();
      pivot.position.set(side * 1.5, -0.1, -7.9);
      const surface = this.createPanel(
        [
          [0, 1.5],
          [side * 3.1, -0.7],
          [side * 3.1, -1.8],
          [0, -1.9],
        ],
        0.22,
        this.fuselageMat,
        0.05,
      );
      surface.rotation.x = Math.PI / 2;
      surface.position.y = 0.11;
      pivot.add(surface);
      this[name] = pivot;
      this.jetGroup.add(pivot);
    }

    // Canted fins. Each one hinges about its own base so the rudders swing
    // together instead of the tail assembly twisting.
    this.rudders = [];
    for (const side of [1, -1]) {
      const hinge = new this.THREE.Group();
      hinge.position.set(side * 1.75, 0.6, -5.4);
      const cant = new this.THREE.Group();
      cant.rotation.z = -side * 0.47;
      cant.add(
        this.createUprightPanel(
          [
            [2.3, 0],
            [0.1, 3.4],
            [-1.1, 3.4],
            [-2.3, 0],
          ],
          0.2,
          this.fuselageMat,
          0.05,
        ),
      );
      hinge.add(cant);
      this.rudders.push(hinge);
      this.jetGroup.add(hinge);
    }
  }
  buildGear() {
    const gearMat = new this.THREE.MeshStandardMaterial({
      color: 0x444444,
      roughness: 0.8,
      metalness: 0.5,
    });
    const tireMat = new this.THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.9,
      metalness: 0.1,
    });

    this.noseGearPivot = this.createGearPivot(0, -0.9, 5.2, gearMat, tireMat);
    this.leftGearPivot = this.createGearPivot(1.9, -0.9, -1, gearMat, tireMat);
    this.rightGearPivot = this.createGearPivot(
      -1.9,
      -0.9,
      -1,
      gearMat,
      tireMat,
    );

    this.jetGroup.add(
      this.noseGearPivot,
      this.leftGearPivot,
      this.rightGearPivot,
    );
  }
  createGearPivot(x, y, z, gearMat, tireMat) {
    const pivot = new this.THREE.Group();
    pivot.position.set(x, y, z);
    const strut = new this.THREE.Mesh(
      new this.THREE.CylinderGeometry(0.11, 0.11, 0.55),
      gearMat,
    );
    strut.position.set(0, -0.28, 0);
    const wheel = new this.THREE.Mesh(
      new this.THREE.CylinderGeometry(0.32, 0.32, 0.24, 16),
      tireMat,
    );
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(0, -0.55, 0);
    pivot.add(strut, wheel);
    return pivot;
  }
  buildPhysics(physicsMaterial) {
    this.jetBody = new this.CANNON.Body({
      mass: AIRCRAFT_CONFIG.mass,
      position: new this.CANNON.Vec3(0, AIRCRAFT_CONFIG.initialAltitude, 0),
      velocity: new this.CANNON.Vec3(0, 0, AIRCRAFT_CONFIG.initialSpeed),
      material: physicsMaterial,
      linearDamping: 0.4,
      angularDamping: 0.8,
    });
    // Compound collision body: narrow fuselage, wings, tail and three gear feet.
    this.jetBody.addShape(
      new this.CANNON.Box(new this.CANNON.Vec3(1.2, 1.2, 5)),
    );
    this.jetBody.addShape(
      new this.CANNON.Box(new this.CANNON.Vec3(6, 0.15, 2)),
      new this.CANNON.Vec3(0, 0, -1),
    );
    this.jetBody.addShape(
      new this.CANNON.Box(new this.CANNON.Vec3(4.5, 0.12, 1.8)),
      new this.CANNON.Vec3(0, 0.2, -6.9),
    );
    for (const offset of [
      [0, -1.45, 5],
      [-2, -1.45, -1],
      [2, -1.45, -1],
    ])
      this.jetBody.addShape(
        new this.CANNON.Sphere(0.25),
        new this.CANNON.Vec3(...offset),
      );
    this.world.addBody(this.jetBody);

    this.jetBody.addEventListener("collide", (e) => {
      const impactV = Math.abs(e.contact.getImpactVelocityAlongNormal());
      if (e.body.isBuilding) {
        this.onCrash();
        return;
      }
      if (e.body.isGround) {
        const jetUp = new this.CANNON.Vec3(0, 1, 0);
        this.jetBody.quaternion.vmult(jetUp, jetUp);
        const dotUp = jetUp.dot(new this.CANNON.Vec3(0, 1, 0));

        // This expects the 'gearDown' state to be checked dynamically in the main loop or passed in
        const isGearDown = this.currentGearState;
        if (!isGearDown && impactV > 2) this.onCrash();
        else if (isGearDown && (impactV > 12 || dotUp < 0.8)) this.onCrash();
      }
    });
  }
  applyFlightPhysics(input) {
    this.currentGearState = input.gearDown; // Keep reference for collisions

    const inverse = new this.CANNON.Quaternion();
    this.jetBody.quaternion.inverse(inverse);
    const localVelocity = new this.CANNON.Vec3();
    inverse.vmult(this.jetBody.velocity, localVelocity);
    const forces = calculateFlightForces(
      localVelocity,
      this.jetBody.position.y,
      input.throttle,
      input,
      input.gearDown,
    );
    const worldForce = new this.CANNON.Vec3(
      forces.localForce.x,
      forces.localForce.y,
      forces.localForce.z,
    );
    this.jetBody.quaternion.vmult(worldForce, worldForce);
    this.jetBody.force.vadd(worldForce, this.jetBody.force);

    const localTorque = new this.CANNON.Vec3(
      forces.localTorque.x,
      forces.localTorque.y,
      forces.localTorque.z,
    );
    this.jetBody.quaternion.vmult(localTorque, localTorque);

    this.jetBody.torque.x += localTorque.x;
    this.jetBody.torque.y += localTorque.y;
    this.jetBody.torque.z += localTorque.z;

    this.simulatedMach = forces.mach;
    this.flightData = forces;
    this.heatUniforms.windSpeed.value = this.simulatedMach;
  }
  updateAnimations(input, deltaTime = 1 / 60) {
    this.jetGroup.position.copy(this.jetBody.position);
    this.jetGroup.quaternion.copy(this.jetBody.quaternion);

    // Control Surfaces. Deflections follow the commanded motion: a trailing
    // edge up (positive rotation.x) pitches the nose up, and a rudder trailing
    // edge to the left (positive rotation.y) yaws the nose left, so both are
    // the opposite sign to the nose-down pitch and nose-left yaw inputs.
    // Stabilators travel about 24 degrees, so a combined pitch and roll command
    // is clamped instead of folding the surface past its stops.
    const deflect = (command) => clamp(command * 0.3, -0.42, 0.42);
    const targetLeftElevon = deflect(-(input.pitch + input.roll));
    const targetRightElevon = deflect(-(input.pitch - input.roll));
    const targetRudder = -input.yaw * 0.4;

    const controlAlpha = 1 - Math.pow(1 - 0.2, deltaTime * 60);
    const gearAlpha = 1 - Math.pow(1 - 0.1, deltaTime * 60);
    this.leftElevon.rotation.x +=
      (targetLeftElevon - this.leftElevon.rotation.x) * controlAlpha;
    this.rightElevon.rotation.x +=
      (targetRightElevon - this.rightElevon.rotation.x) * controlAlpha;
    for (const rudder of this.rudders)
      rudder.rotation.y += (targetRudder - rudder.rotation.y) * controlAlpha;

    // Afterburner. The plume spools rather than snapping on, so easing the
    // level is part of the look and not just frame smoothing.
    const burnerAlpha = 1 - Math.pow(1 - 0.08, deltaTime * 60);
    this.afterburnerLevel +=
      (afterburnerIntensity(input.throttle) - this.afterburnerLevel) *
      burnerAlpha;
    this.afterburner.update(this.afterburnerLevel, deltaTime);

    // Landing Gear
    const targetRot = input.gearDown ? 0 : -Math.PI / 2;
    this.noseGearPivot.rotation.x +=
      (targetRot - this.noseGearPivot.rotation.x) * gearAlpha;
    this.leftGearPivot.rotation.z +=
      ((input.gearDown ? 0 : Math.PI / 2) - this.leftGearPivot.rotation.z) *
      gearAlpha;
    this.rightGearPivot.rotation.z +=
      (targetRot - this.rightGearPivot.rotation.z) * gearAlpha;
  }
  reset() {
    this.jetBody.position.set(0, AIRCRAFT_CONFIG.initialAltitude, 0);
    this.jetBody.velocity.set(0, 0, AIRCRAFT_CONFIG.initialSpeed);
    this.jetBody.angularVelocity.set(0, 0, 0);
    this.jetBody.quaternion.set(0, 0, 0, 1);
  }
}
