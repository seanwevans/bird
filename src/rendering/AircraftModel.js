import { calculateFlightForces } from "../physics/AircraftDynamics.js";
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

    this.buildMeshes();
    this.buildPhysics(physicsMaterial);

    // Listen for UI view mode changes to toggle wireframe
    this.eventTarget?.addEventListener("viewModeChanged", (e) => {
      const isWireframe = e.detail === 3;
      this.fuselageMat.wireframe = isWireframe;
      this.fuselageMat.transparent = isWireframe;
      this.fuselageMat.opacity = isWireframe ? 0.2 : 1.0;
      this.cockpitMat.wireframe = isWireframe;
      this.cockpitMat.transparent = isWireframe;
      this.cockpitMat.opacity = isWireframe ? 0.2 : 1.0;
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

    ShaderUtils.applyThermalShader(this.fuselageMat, this.heatUniforms);
    ShaderUtils.applyThermalShader(this.cockpitMat, this.heatUniforms);

    const fuselage = new this.THREE.Mesh(
      new this.THREE.CylinderGeometry(1.2, 1.2, 10, 32),
      this.fuselageMat,
    );
    fuselage.rotation.x = Math.PI / 2;
    this.jetGroup.add(fuselage);

    const nose = new this.THREE.Mesh(
      new this.THREE.ConeGeometry(1.2, 5, 32),
      this.fuselageMat,
    );
    nose.rotation.x = Math.PI / 2;
    nose.position.z = 7.5;
    this.jetGroup.add(nose);

    const cockpit = new this.THREE.Mesh(
      new this.THREE.SphereGeometry(0.9, 32, 16),
      this.cockpitMat,
    );
    cockpit.scale.set(1, 0.6, 3.0);
    cockpit.position.set(0, 1.2, 3);
    this.jetGroup.add(cockpit);

    const rightWing = new this.THREE.Mesh(
      new this.THREE.BoxGeometry(8, 0.2, 4),
      this.fuselageMat,
    );
    rightWing.position.set(4, 0, -1);
    rightWing.rotation.y = Math.PI / 6;
    this.jetGroup.add(rightWing);

    const leftWing = new this.THREE.Mesh(
      new this.THREE.BoxGeometry(8, 0.2, 4),
      this.fuselageMat,
    );
    leftWing.position.set(-4, 0, -1);
    leftWing.rotation.y = -Math.PI / 6;
    this.jetGroup.add(leftWing);

    // Control Surfaces
    this.rightElevon = new this.THREE.Group();
    this.rightElevon.position.set(1.5, 0, -4.5);
    const rightTail = new this.THREE.Mesh(
      new this.THREE.BoxGeometry(4, 0.1, 2),
      this.fuselageMat,
    );
    rightTail.position.set(1.5, 0, 0);
    rightTail.rotation.y = Math.PI / 8;
    this.rightElevon.add(rightTail);
    this.jetGroup.add(this.rightElevon);

    this.leftElevon = new this.THREE.Group();
    this.leftElevon.position.set(-1.5, 0, -4.5);
    const leftTail = new this.THREE.Mesh(
      new this.THREE.BoxGeometry(4, 0.1, 2),
      this.fuselageMat,
    );
    leftTail.position.set(-1.5, 0, 0);
    leftTail.rotation.y = -Math.PI / 8;
    this.leftElevon.add(leftTail);
    this.jetGroup.add(this.leftElevon);

    this.rudderGroup = new this.THREE.Group();
    this.rudderGroup.position.set(0, 1.2, -4.5);
    const vertTail = new this.THREE.Mesh(
      new this.THREE.BoxGeometry(0.3, 3.5, 2.5),
      this.fuselageMat,
    );
    vertTail.position.set(0, 1.5, 0);
    vertTail.rotation.x = -Math.PI / 8;
    this.rudderGroup.add(vertTail);
    this.jetGroup.add(this.rudderGroup);

    // Landing Gear
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

    this.noseGearPivot = this.createGearPivot(0, -1.0, 6, gearMat, tireMat);
    this.leftGearPivot = this.createGearPivot(-2, -1.0, -1, gearMat, tireMat);
    this.rightGearPivot = this.createGearPivot(2, -1.0, -1, gearMat, tireMat);

    this.jetGroup.add(
      this.noseGearPivot,
      this.leftGearPivot,
      this.rightGearPivot,
    );
    this.scene.add(this.jetGroup);
  }
  createGearPivot(x, y, z, gearMat, tireMat) {
    const pivot = new this.THREE.Group();
    pivot.position.set(x, y, z);
    const strut = new this.THREE.Mesh(
      new this.THREE.CylinderGeometry(0.1, 0.1, 0.4),
      gearMat,
    );
    strut.position.set(0, -0.2, 0);
    const wheel = new this.THREE.Mesh(
      new this.THREE.CylinderGeometry(0.2, 0.2, 0.15, 16),
      tireMat,
    );
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(0, -0.4, 0);
    pivot.add(strut, wheel);
    return pivot;
  }
  buildPhysics(physicsMaterial) {
    this.jetBody = new this.CANNON.Body({
      mass: 100,
      position: new this.CANNON.Vec3(0, 150, 0),
      velocity: new this.CANNON.Vec3(0, 0, 150),
      material: physicsMaterial,
      linearDamping: 0.4,
      angularDamping: 0.8,
    });
    this.jetBody.addShape(new this.CANNON.Box(new this.CANNON.Vec3(2, 1.6, 5)));
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

    const forwardVec = new this.CANNON.Vec3(0, 0, 1);
    this.jetBody.quaternion.vmult(forwardVec, forwardVec);

    const upVec = new this.CANNON.Vec3(0, 1, 0);
    this.jetBody.quaternion.vmult(upVec, upVec);

    const speed = this.jetBody.velocity.length();
    const forces = calculateFlightForces(speed, input.throttle, input);

    this.jetBody.force.x += forwardVec.x * forces.thrust;
    this.jetBody.force.y += forwardVec.y * forces.thrust;
    this.jetBody.force.z += forwardVec.z * forces.thrust;

    const liftForce = forces.lift;
    this.jetBody.force.x += upVec.x * liftForce;
    this.jetBody.force.y += upVec.y * liftForce;
    this.jetBody.force.z += upVec.z * liftForce;

    const localTorque = new this.CANNON.Vec3(
      forces.pitchTorque,
      forces.yawTorque,
      forces.rollTorque,
    );
    this.jetBody.quaternion.vmult(localTorque, localTorque);

    this.jetBody.torque.x += localTorque.x;
    this.jetBody.torque.y += localTorque.y;
    this.jetBody.torque.z += localTorque.z;

    this.simulatedMach = forces.mach;
    this.heatUniforms.windSpeed.value = this.simulatedMach;

    this.updateAnimations(input);
  }
  updateAnimations(input) {
    this.jetGroup.position.copy(this.jetBody.position);
    this.jetGroup.quaternion.copy(this.jetBody.quaternion);

    // Control Surfaces
    const targetRightElevon = (input.pitch + input.roll) * 0.6;
    const targetLeftElevon = (input.pitch - input.roll) * 0.6;
    const targetRudder = input.yaw * 0.5;

    this.rightElevon.rotation.x +=
      (targetRightElevon - this.rightElevon.rotation.x) * 0.2;
    this.leftElevon.rotation.x +=
      (targetLeftElevon - this.leftElevon.rotation.x) * 0.2;
    this.rudderGroup.rotation.y +=
      (targetRudder - this.rudderGroup.rotation.y) * 0.2;

    // Landing Gear
    const targetRot = input.gearDown ? 0 : -Math.PI / 2;
    this.noseGearPivot.rotation.x +=
      (targetRot - this.noseGearPivot.rotation.x) * 0.1;
    this.leftGearPivot.rotation.z +=
      (targetRot - this.leftGearPivot.rotation.z) * 0.1;
    this.rightGearPivot.rotation.z +=
      ((input.gearDown ? 0 : Math.PI / 2) - this.rightGearPivot.rotation.z) *
      0.1;
  }
  reset() {
    this.jetBody.position.set(0, 150, 0);
    this.jetBody.velocity.set(0, 0, 150);
    this.jetBody.angularVelocity.set(0, 0, 0);
    this.jetBody.quaternion.set(0, 0, 0, 1);
  }
}
