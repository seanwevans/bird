import { ShaderUtils } from "./ShaderUtils.js";

export class AircraftModel {
  constructor({ THREE, scene }) {
    this.THREE = THREE; this.scene = scene;
    this.jetGroup = new this.THREE.Group();
    this.heatUniforms = { windSpeed: { value: 0 } };
    this.buildMeshes();
  }
  buildMeshes() {
    this.fuselageMat = new this.THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.4,
      metalness: 0.3
    });
    this.cockpitMat = new this.THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.1,
      metalness: 0.8
    });

    ShaderUtils.applyThermalShader(this.fuselageMat, this.heatUniforms);
    ShaderUtils.applyThermalShader(this.cockpitMat, this.heatUniforms);

    const fuselage = new this.THREE.Mesh(
      new this.THREE.CylinderGeometry(1.2, 1.2, 10, 32),
      this.fuselageMat
    );
    fuselage.rotation.x = Math.PI / 2;
    this.jetGroup.add(fuselage);

    const nose = new this.THREE.Mesh(
      new this.THREE.ConeGeometry(1.2, 5, 32),
      this.fuselageMat
    );
    nose.rotation.x = Math.PI / 2;
    nose.position.z = 7.5;
    this.jetGroup.add(nose);

    const cockpit = new this.THREE.Mesh(
      new this.THREE.SphereGeometry(0.9, 32, 16),
      this.cockpitMat
    );
    cockpit.scale.set(1, 0.6, 3.0);
    cockpit.position.set(0, 1.2, 3);
    this.jetGroup.add(cockpit);

    const rightWing = new this.THREE.Mesh(
      new this.THREE.BoxGeometry(8, 0.2, 4),
      this.fuselageMat
    );
    rightWing.position.set(4, 0, -1);
    rightWing.rotation.y = Math.PI / 6;
    this.jetGroup.add(rightWing);

    const leftWing = new this.THREE.Mesh(
      new this.THREE.BoxGeometry(8, 0.2, 4),
      this.fuselageMat
    );
    leftWing.position.set(-4, 0, -1);
    leftWing.rotation.y = -Math.PI / 6;
    this.jetGroup.add(leftWing);

    // Control Surfaces
    this.rightElevon = new this.THREE.Group();
    this.rightElevon.position.set(1.5, 0, -4.5);
    const rightTail = new this.THREE.Mesh(
      new this.THREE.BoxGeometry(4, 0.1, 2),
      this.fuselageMat
    );
    rightTail.position.set(1.5, 0, 0);
    rightTail.rotation.y = Math.PI / 8;
    this.rightElevon.add(rightTail);
    this.jetGroup.add(this.rightElevon);

    this.leftElevon = new this.THREE.Group();
    this.leftElevon.position.set(-1.5, 0, -4.5);
    const leftTail = new this.THREE.Mesh(
      new this.THREE.BoxGeometry(4, 0.1, 2),
      this.fuselageMat
    );
    leftTail.position.set(-1.5, 0, 0);
    leftTail.rotation.y = -Math.PI / 8;
    this.leftElevon.add(leftTail);
    this.jetGroup.add(this.leftElevon);

    this.rudderGroup = new this.THREE.Group();
    this.rudderGroup.position.set(0, 1.2, -4.5);
    const vertTail = new this.THREE.Mesh(
      new this.THREE.BoxGeometry(0.3, 3.5, 2.5),
      this.fuselageMat
    );
    vertTail.position.set(0, 1.5, 0);
    vertTail.rotation.x = -Math.PI / 8;
    this.rudderGroup.add(vertTail);
    this.jetGroup.add(this.rudderGroup);

    // Landing Gear
    const gearMat = new this.THREE.MeshStandardMaterial({
      color: 0x444444,
      roughness: 0.8,
      metalness: 0.5
    });
    const tireMat = new this.THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.9,
      metalness: 0.1
    });

    this.noseGearPivot = this.createGearPivot(0, -1.0, 6, gearMat, tireMat);
    this.leftGearPivot = this.createGearPivot(-2, -1.0, -1, gearMat, tireMat);
    this.rightGearPivot = this.createGearPivot(2, -1.0, -1, gearMat, tireMat);

    this.jetGroup.add(
      this.noseGearPivot,
      this.leftGearPivot,
      this.rightGearPivot
    );
    this.scene.add(this.jetGroup);
  }
  createGearPivot(x, y, z, gearMat, tireMat) {
    const pivot = new this.THREE.Group();
    pivot.position.set(x, y, z);
    const strut = new this.THREE.Mesh(
      new this.THREE.CylinderGeometry(0.1, 0.1, 0.4),
      gearMat
    );
    strut.position.set(0, -0.2, 0);
    const wheel = new this.THREE.Mesh(
      new this.THREE.CylinderGeometry(0.2, 0.2, 0.15, 16),
      tireMat
    );
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(0, -0.4, 0);
    pivot.add(strut, wheel);
    return pivot;
  }
  updateAnimations(input) {
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
  sync(body, input, mach) {
    this.heatUniforms.windSpeed.value = mach;
    this.jetGroup.position.copy(body.position);
    this.jetGroup.quaternion.copy(body.quaternion);
    this.updateAnimations(input);
  }
  setViewMode(mode) {
    const wireframe = mode === 3;
    for (const material of [this.fuselageMat, this.cockpitMat]) { material.wireframe = wireframe; material.transparent = wireframe; material.opacity = wireframe ? 0.2 : 1; }
  }
}
