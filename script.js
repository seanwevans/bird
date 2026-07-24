class InputController {
  constructor() {
    this.keys = {
      w: false,
      a: false,
      s: false,
      d: false,
      q: false,
      e: false,
      Shift: false,
      Control: false
    };
    this.throttle = 1.0;
    this.pitch = 0;
    this.roll = 0;
    this.yaw = 0;
    this.orbitYaw = 0;
    this.orbitPitch = 0;

    this.gearDown = false;
    this.needReset = false;

    this.lastGearBtn = false;
    this.lastResetBtn = false;

    this.GAMEPAD_DEADZONE = 0.15;
    this.ORBIT_SENSITIVITY = 0.04;
    this.ORBIT_PITCH_LIMIT = Math.PI / 3;

    this.bindEvents();
  }
  bindEvents() {
    window.addEventListener("keydown", (e) => {
      if (e.key in this.keys) this.keys[e.key] = true;
      if (e.code in this.keys) this.keys[e.code] = true;
      if ((e.key === "g" || e.key === "G") && !e.repeat)
        this.gearDown = !this.gearDown;
    });

    window.addEventListener("keyup", (e) => {
      if (e.key in this.keys) this.keys[e.key] = false;
      if (e.code in this.keys) this.keys[e.code] = false;
    });
  }
  update() {
    this.pitch = 0;
    this.roll = 0;
    this.yaw = 0;

    const gp = navigator.getGamepads ? navigator.getGamepads()[0] : null;

    if (gp) {
      this.applyGamepad(gp);
    } else {
      this.applyKeyboard();
      this.lastGearBtn = false;
      this.lastResetBtn = false;
    }
  }
  applyKeyboard() {
    if (this.keys.Shift) this.throttle = Math.min(1.0, this.throttle + 0.01);
    if (this.keys.Control) this.throttle = Math.max(0.0, this.throttle - 0.01);
    if (this.keys.w) this.pitch = -1;
    if (this.keys.s) this.pitch = 1;
    if (this.keys.a) this.roll = 1;
    if (this.keys.d) this.roll = -1;
    if (this.keys.q) this.yaw = 1;
    if (this.keys.e) this.yaw = -1;
  }
  applyGamepad(gp) {
    const dz = this.GAMEPAD_DEADZONE;

    const rt = gp.buttons[7] ? gp.buttons[7].value : 0;
    const lt = gp.buttons[6] ? gp.buttons[6].value : 0;
    this.throttle = THREE.MathUtils.clamp(
      this.throttle + rt * 0.01 - lt * 0.01,
      0.0,
      1.0
    );

    if (Math.abs(gp.axes[1]) > dz) this.pitch = -gp.axes[1];
    if (Math.abs(gp.axes[0]) > dz) this.roll = gp.axes[0];
    if (gp.buttons[4]?.pressed) this.yaw = 1;
    if (gp.buttons[5]?.pressed) this.yaw = -1;

    const gearPressed = gp.buttons[0]?.pressed || false;
    if (gearPressed && !this.lastGearBtn) this.gearDown = !this.gearDown;
    this.lastGearBtn = gearPressed;

    const resetPressed = gp.buttons[1]?.pressed || gp.buttons[9]?.pressed;
    if (resetPressed && !this.lastResetBtn) this.needReset = true;
    this.lastResetBtn = !!resetPressed;

    const rightStickX = Math.abs(gp.axes[2]) > dz ? gp.axes[2] : 0;
    const rightStickY = Math.abs(gp.axes[3]) > dz ? gp.axes[3] : 0;

    this.orbitYaw -= rightStickX * this.ORBIT_SENSITIVITY;
    this.orbitPitch = THREE.MathUtils.clamp(
      this.orbitPitch - rightStickY * this.ORBIT_SENSITIVITY,
      -this.ORBIT_PITCH_LIMIT,
      this.ORBIT_PITCH_LIMIT
    );
  }
}

class UIManager {
  constructor() {
    this.dom = {
      machDisplay: document.getElementById("mach-display"),
      altDisplay: document.getElementById("alt-val"),
      vsiDisplay: document.getElementById("vsi-val"),
      speedDisplay: document.getElementById("speed-val"),
      throttleDisplay: document.getElementById("throttle-val"),
      hudSpeedOnScreen: document.getElementById("hud-speed-on-screen"),
      hudAltOnScreen: document.getElementById("hud-alt-on-screen"),
      hudVsiOnScreen: document.getElementById("hud-vsi-on-screen"),
      velocityVectorEl: document.getElementById("velocity-vector"),
      viewBtns: document.querySelectorAll(".view-btn"),
      opacitySlider: document.getElementById("opacity-slider"),
      opacityValDisplay: document.getElementById("opacity-val"),
      horizonTransform: document.getElementById("horizon-transform"),
      hudToggle: document.getElementById("hud-toggle"),
      hudPanel: document.getElementById("hud-panel"),
      hudChevron: document.getElementById("hud-chevron"),
      controllerStatus: document.getElementById("controller-status"),
      hudGear: document.getElementById("hud-gear-on-screen")
    };

    this.userWindOpacity = 0.0;
    this.currentViewMode = 0;

    this.bindEvents();
  }
  bindEvents() {
    if (this.dom.hudToggle && this.dom.hudPanel && this.dom.hudChevron) {
      this.dom.hudToggle.addEventListener("click", () => {
        this.dom.hudPanel.classList.toggle("hidden");
        this.dom.hudChevron.classList.toggle("rotate-180");
      });
    }

    if (this.dom.opacitySlider && this.dom.opacityValDisplay) {
      this.dom.opacitySlider.addEventListener("input", (e) => {
        this.userWindOpacity = parseFloat(e.target.value);
        this.dom.opacityValDisplay.innerText = `${Math.round(
          this.userWindOpacity * 100
        )}%`;
      });
    }

    this.dom.viewBtns.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        this.dom.viewBtns.forEach((b) =>
          b.classList.remove(
            "active",
            "bg-cyan-900/40",
            "border-cyan-500/50",
            "text-cyan-300"
          )
        );
        e.currentTarget.classList.add(
          "active",
          "bg-cyan-900/40",
          "border-cyan-500/50",
          "text-cyan-300"
        );
        this.currentViewMode = parseInt(
          e.currentTarget.getAttribute("data-mode"),
          10
        );

        // Dispatch custom event so the Jet can update materials
        window.dispatchEvent(
          new CustomEvent("viewModeChanged", { detail: this.currentViewMode })
        );
      });
    });

    window.addEventListener("gamepadconnected", () =>
      this.updateControllerStatus(true)
    );
    window.addEventListener("gamepaddisconnected", () =>
      this.updateControllerStatus(false)
    );
  }
  updateControllerStatus(connected) {
    if (!this.dom.controllerStatus) return;
    if (connected) {
      this.dom.controllerStatus.innerText = "Gamepad: Online";
      this.dom.controllerStatus.classList.replace(
        "text-slate-400",
        "text-green-400"
      );
      this.dom.controllerStatus.classList.add("border-green-500/50");
    } else {
      this.dom.controllerStatus.innerText = "Gamepad: Disconnected";
      this.dom.controllerStatus.classList.replace(
        "text-green-400",
        "text-slate-400"
      );
      this.dom.controllerStatus.classList.remove("border-green-500/50");
    }
  }
  updateFlightData(speed, mach, altitude, vsi, throttle) {
    const vsiStr = vsi > 0 ? `+${Math.round(vsi)}` : `${Math.round(vsi)}`;
    const altRounded = Math.max(0, Math.round(altitude * 3));
    const speedRounded = Math.round(speed * 2);

    if (this.dom.machDisplay)
      this.dom.machDisplay.innerText = `Mach ${mach.toFixed(2)}`;
    if (this.dom.speedDisplay)
      this.dom.speedDisplay.innerText = `${speedRounded} kts`;
    if (this.dom.altDisplay) this.dom.altDisplay.innerText = `${altRounded} ft`;
    if (this.dom.vsiDisplay) this.dom.vsiDisplay.innerText = `${vsiStr} ft/m`;
    if (this.dom.throttleDisplay)
      this.dom.throttleDisplay.innerText = `${Math.round(throttle * 100)}%`;

    if (this.dom.hudSpeedOnScreen)
      this.dom.hudSpeedOnScreen.innerText = speedRounded;
    if (this.dom.hudAltOnScreen) this.dom.hudAltOnScreen.innerText = altRounded;
    if (this.dom.hudVsiOnScreen) this.dom.hudVsiOnScreen.innerText = vsiStr;
  }
  updateGear(gearDown) {
    if (!this.dom.hudGear) return;
    if (gearDown) {
      this.dom.hudGear.innerText = "GEAR DOWN";
      this.dom.hudGear.className =
        "font-mono text-sm font-bold text-green-400 drop-shadow-[0_0_4px_rgba(74,222,128,0.8)] transition-colors duration-300";
    } else {
      this.dom.hudGear.innerText = "GEAR UP";
      this.dom.hudGear.className =
        "font-mono text-sm font-bold text-red-500 drop-shadow-[0_0_4px_rgba(239,68,68,0.8)] transition-colors duration-300";
    }
  }
  updateVelocityVector(jetBody) {
    if (!this.dom.velocityVectorEl) return;
    const invQuat = new CANNON.Quaternion();
    jetBody.quaternion.inverse(invQuat);
    const localVel = new CANNON.Vec3();
    invQuat.vmult(jetBody.velocity, localVel);

    if (localVel.z > 0.1) {
      const yawOffset = Math.atan2(localVel.x, localVel.z) * 350;
      const pitchOffset = Math.atan2(localVel.y, localVel.z) * 350;
      const cx = Math.max(-180, Math.min(180, yawOffset));
      const cy = Math.max(-180, Math.min(180, pitchOffset));
      this.dom.velocityVectorEl.style.transform = `translate(calc(-50% + ${cx}px), calc(-50% - ${cy}px))`;
      this.dom.velocityVectorEl.style.opacity = "1";
    } else {
      this.dom.velocityVectorEl.style.opacity = "0";
    }
  }
  updateHorizon(jetGroup) {
    if (!this.dom.horizonTransform) return;
    const jetFwd = new THREE.Vector3(0, 0, 1).applyQuaternion(
      jetGroup.quaternion
    );
    const jetRight = new THREE.Vector3(1, 0, 0).applyQuaternion(
      jetGroup.quaternion
    );
    const jetUp = new THREE.Vector3(0, 1, 0).applyQuaternion(
      jetGroup.quaternion
    );

    const pitchAngle = Math.asin(jetFwd.y);
    const rollAngle = Math.atan2(jetRight.y, jetUp.y);
    const pitchOffset = Math.max(-150, Math.min(150, pitchAngle * 250));

    this.dom.horizonTransform.style.transform = `rotate(${-rollAngle}rad) translateY(${pitchOffset}px)`;
  }
}

class ShaderUtils {
  static applyThermalShader(material, heatUniforms) {
    material.onBeforeCompile = (shader) => {
      shader.uniforms.windSpeed = heatUniforms.windSpeed;
      shader.vertexShader =
        `varying vec3 vWorldNormalHeat;\n` + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        "#include <project_vertex>",
        `#include <project_vertex>\nvWorldNormalHeat = normalize((modelMatrix * vec4(normal, 0.0)).xyz);`
      );

      shader.fragmentShader =
        `
        uniform float windSpeed;
        varying vec3 vWorldNormalHeat;
        vec3 getThermalColor(float t) {
          t = clamp(t, 0.0, 1.0);
          vec3 blue = vec3(0.0, 0.0, 1.0);
          vec3 cyan = vec3(0.0, 1.0, 1.0);
          vec3 green = vec3(0.0, 1.0, 0.0);
          vec3 yellow = vec3(1.0, 1.0, 0.0);
          vec3 red = vec3(1.0, 0.0, 0.0);
          if (t < 0.25) return mix(blue, cyan, t * 4.0);
          if (t < 0.5) return mix(cyan, green, (t - 0.25) * 4.0);
          if (t < 0.75) return mix(green, yellow, (t - 0.5) * 4.0);
          return mix(yellow, red, (t - 0.75) * 4.0);
        }
      ` + shader.fragmentShader;

      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <color_fragment>",
        `#include <color_fragment>
         float dotProdHeat = dot(vWorldNormalHeat, vec3(0.0, 0.0, 1.0));
         float mappedTempHeat = (dotProdHeat + 1.0) * 0.5;
         mappedTempHeat = pow(mappedTempHeat, 1.5);
         float finalHeatVal = (mappedTempHeat * 0.8 + 0.1) * (0.3 + windSpeed * 0.8);
         diffuseColor.rgb = getThermalColor(finalHeatVal);`
      );
    };
  }
}

class Environment {
  constructor(scene, physicsWorld, physicsMaterial) {
    this.scene = scene;
    this.world = physicsWorld;
    this.physicsMaterial = physicsMaterial;
    this.buildLighting();
    this.buildGround();
    this.buildCity();
  }
  buildLighting() {
    this.scene.background = new THREE.Color(0x5dade2);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.7));

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(200, 500, 300);
    this.scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0x5dade2, 0.5);
    fillLight.position.set(-100, -50, -100);
    this.scene.add(fillLight);
  }
  buildGround() {
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x3b7a57,
      roughness: 0.9
    });
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(20000, 20000),
      groundMat
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -2;
    this.scene.add(ground);

    const groundBody = new CANNON.Body({
      mass: 0,
      material: this.physicsMaterial
    });
    groundBody.addShape(new CANNON.Plane());
    groundBody.quaternion.setFromAxisAngle(
      new CANNON.Vec3(1, 0, 0),
      -Math.PI / 2
    );
    groundBody.position.set(0, -2, 0);
    groundBody.isGround = true;
    this.world.addBody(groundBody);

    const gridHelper = new THREE.GridHelper(10000, 500, 0xffffff, 0xaaaaaa);
    gridHelper.position.y = 0.1;
    gridHelper.material.transparent = true;
    gridHelper.material.opacity = 0.5;
    this.scene.add(gridHelper);
  }
  buildCity(height = 100) {
    const blockGeo = new THREE.BoxGeometry(20, height, 20);
    const blockMat = new THREE.MeshStandardMaterial({
      color: 0xdddddd,
      roughness: 0.8
    });
    const blockShape = new CANNON.Box(new CANNON.Vec3(10, height / 2, 10));

    for (let i = 0; i < 1000; i++) {
      const x = (Math.random() - 0.5) * 4000;
      const y = 50;
      const z = (Math.random() - 0.5) * 4000;

      const block = new THREE.Mesh(blockGeo, blockMat);
      block.position.set(x, y, z);
      this.scene.add(block);

      const blockBody = new CANNON.Body({
        mass: 0,
        material: this.physicsMaterial
      });
      blockBody.addShape(blockShape);
      blockBody.position.set(x, y, z);
      blockBody.isBuilding = true;
      this.world.addBody(blockBody);
    }
  }
}

class Jet {
  constructor(scene, physicsWorld, physicsMaterial, onCrashCallback) {
    this.scene = scene;
    this.world = physicsWorld;
    this.onCrash = onCrashCallback;

    this.jetGroup = new THREE.Group();
    this.heatUniforms = { windSpeed: { value: 0.0 } };

    this.buildMeshes();
    this.buildPhysics(physicsMaterial);

    // Listen for UI view mode changes to toggle wireframe
    window.addEventListener("viewModeChanged", (e) => {
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
    this.fuselageMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.4,
      metalness: 0.3
    });
    this.cockpitMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.1,
      metalness: 0.8
    });

    ShaderUtils.applyThermalShader(this.fuselageMat, this.heatUniforms);
    ShaderUtils.applyThermalShader(this.cockpitMat, this.heatUniforms);

    const fuselage = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 1.2, 10, 32),
      this.fuselageMat
    );
    fuselage.rotation.x = Math.PI / 2;
    this.jetGroup.add(fuselage);

    const nose = new THREE.Mesh(
      new THREE.ConeGeometry(1.2, 5, 32),
      this.fuselageMat
    );
    nose.rotation.x = Math.PI / 2;
    nose.position.z = 7.5;
    this.jetGroup.add(nose);

    const cockpit = new THREE.Mesh(
      new THREE.SphereGeometry(0.9, 32, 16),
      this.cockpitMat
    );
    cockpit.scale.set(1, 0.6, 3.0);
    cockpit.position.set(0, 1.2, 3);
    this.jetGroup.add(cockpit);

    const rightWing = new THREE.Mesh(
      new THREE.BoxGeometry(8, 0.2, 4),
      this.fuselageMat
    );
    rightWing.position.set(4, 0, -1);
    rightWing.rotation.y = Math.PI / 6;
    this.jetGroup.add(rightWing);

    const leftWing = new THREE.Mesh(
      new THREE.BoxGeometry(8, 0.2, 4),
      this.fuselageMat
    );
    leftWing.position.set(-4, 0, -1);
    leftWing.rotation.y = -Math.PI / 6;
    this.jetGroup.add(leftWing);

    // Control Surfaces
    this.rightElevon = new THREE.Group();
    this.rightElevon.position.set(1.5, 0, -4.5);
    const rightTail = new THREE.Mesh(
      new THREE.BoxGeometry(4, 0.1, 2),
      this.fuselageMat
    );
    rightTail.position.set(1.5, 0, 0);
    rightTail.rotation.y = Math.PI / 8;
    this.rightElevon.add(rightTail);
    this.jetGroup.add(this.rightElevon);

    this.leftElevon = new THREE.Group();
    this.leftElevon.position.set(-1.5, 0, -4.5);
    const leftTail = new THREE.Mesh(
      new THREE.BoxGeometry(4, 0.1, 2),
      this.fuselageMat
    );
    leftTail.position.set(-1.5, 0, 0);
    leftTail.rotation.y = -Math.PI / 8;
    this.leftElevon.add(leftTail);
    this.jetGroup.add(this.leftElevon);

    this.rudderGroup = new THREE.Group();
    this.rudderGroup.position.set(0, 1.2, -4.5);
    const vertTail = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 3.5, 2.5),
      this.fuselageMat
    );
    vertTail.position.set(0, 1.5, 0);
    vertTail.rotation.x = -Math.PI / 8;
    this.rudderGroup.add(vertTail);
    this.jetGroup.add(this.rudderGroup);

    // Landing Gear
    const gearMat = new THREE.MeshStandardMaterial({
      color: 0x444444,
      roughness: 0.8,
      metalness: 0.5
    });
    const tireMat = new THREE.MeshStandardMaterial({
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
    const pivot = new THREE.Group();
    pivot.position.set(x, y, z);
    const strut = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.1, 0.4),
      gearMat
    );
    strut.position.set(0, -0.2, 0);
    const wheel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.2, 0.15, 16),
      tireMat
    );
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(0, -0.4, 0);
    pivot.add(strut, wheel);
    return pivot;
  }
  buildPhysics(physicsMaterial) {
    this.jetBody = new CANNON.Body({
      mass: 100,
      position: new CANNON.Vec3(0, 150, 0),
      velocity: new CANNON.Vec3(0, 0, 150),
      material: physicsMaterial,
      linearDamping: 0.4,
      angularDamping: 0.8
    });
    this.jetBody.addShape(new CANNON.Box(new CANNON.Vec3(2, 1.6, 5)));
    this.world.addBody(this.jetBody);

    this.jetBody.addEventListener("collide", (e) => {
      const impactV = Math.abs(e.contact.getImpactVelocityAlongNormal());
      if (e.body.isBuilding) {
        this.onCrash();
        return;
      }
      if (e.body.isGround) {
        const jetUp = new CANNON.Vec3(0, 1, 0);
        this.jetBody.quaternion.vmult(jetUp, jetUp);
        const dotUp = jetUp.dot(new CANNON.Vec3(0, 1, 0));

        // This expects the 'gearDown' state to be checked dynamically in the main loop or passed in
        const isGearDown = this.currentGearState;
        if (!isGearDown && impactV > 2) this.onCrash();
        else if (isGearDown && (impactV > 12 || dotUp < 0.8)) this.onCrash();
      }
    });
  }
  applyFlightPhysics(input) {
    this.currentGearState = input.gearDown; // Keep reference for collisions

    const forwardVec = new CANNON.Vec3(0, 0, 1);
    this.jetBody.quaternion.vmult(forwardVec, forwardVec);

    const upVec = new CANNON.Vec3(0, 1, 0);
    this.jetBody.quaternion.vmult(upVec, upVec);

    const speed = this.jetBody.velocity.length();
    const maxThrust = 4500;

    this.jetBody.force.x += forwardVec.x * maxThrust * input.throttle;
    this.jetBody.force.y += forwardVec.y * maxThrust * input.throttle;
    this.jetBody.force.z += forwardVec.z * maxThrust * input.throttle;

    const liftForce = speed * speed * 0.05;
    this.jetBody.force.x += upVec.x * liftForce;
    this.jetBody.force.y += upVec.y * liftForce;
    this.jetBody.force.z += upVec.z * liftForce;

    const controlAuthority = Math.min(1.0, speed / 40.0);
    const pitchTorque = input.pitch * 1000 * controlAuthority;
    const rollTorque = input.roll * 1800 * controlAuthority;
    const yawTorque = input.yaw * 500 * controlAuthority;

    const localTorque = new CANNON.Vec3(pitchTorque, yawTorque, rollTorque);
    this.jetBody.quaternion.vmult(localTorque, localTorque);

    this.jetBody.torque.x += localTorque.x;
    this.jetBody.torque.y += localTorque.y;
    this.jetBody.torque.z += localTorque.z;

    this.simulatedMach = speed / 150;
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

class Wind {
  constructor(jetGroup) {
    this.particleCount = 4000;
    this.baseTailLength = 4.0;
    this.TUNNEL_RADIUS = 15;
    this.PARTICLE_START_Z = 35;
    this.PARTICLE_END_Z = -35;

    this.originalX = [];
    this.originalY = [];

    this.buildGeometry(jetGroup);
  }
  buildGeometry(jetGroup) {
    this.lineGeometry = new THREE.BufferGeometry();
    this.particlePositions = new Float32Array(this.particleCount * 2 * 3);
    const particleColors = new Float32Array(this.particleCount * 2 * 3);

    for (let i = 0; i < this.particleCount; i++) {
      const r = this.TUNNEL_RADIUS * 0.95 * Math.sqrt(Math.random());
      const theta = Math.random() * Math.PI * 2;
      const x = r * Math.cos(theta);
      const y = r * Math.sin(theta);
      const z =
        this.PARTICLE_START_Z -
        Math.random() * (this.PARTICLE_START_Z - this.PARTICLE_END_Z);

      this.originalX[i] = x;
      this.originalY[i] = y;

      const idx = i * 6;
      this.particlePositions[idx] = x;
      this.particlePositions[idx + 1] = y;
      this.particlePositions[idx + 2] = z;
      this.particlePositions[idx + 3] = x;
      this.particlePositions[idx + 4] = y;
      this.particlePositions[idx + 5] = z + this.baseTailLength;

      particleColors[idx] = 0.0;
      particleColors[idx + 1] = 1.0;
      particleColors[idx + 2] = 1.0;
      particleColors[idx + 3] = 0.0;
      particleColors[idx + 4] = 1.0;
      particleColors[idx + 5] = 1.0;
    }

    this.lineGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(this.particlePositions, 3)
    );
    this.lineGeometry.setAttribute(
      "color",
      new THREE.BufferAttribute(particleColors, 3)
    );

    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.windParticles = new THREE.LineSegments(this.lineGeometry, material);
    jetGroup.add(this.windParticles);
  }
  update(velocityMag, simulatedMach, userOpacity, viewMode) {
    this.windParticles.material.opacity =
      Math.min(1.0, velocityMag * 0.02) * userOpacity;
    if (velocityMag < 5) return;

    const windFlowSpeed = velocityMag * 0.03;
    const tailLength = this.baseTailLength + velocityMag * 0.05;
    const colors = this.lineGeometry.attributes.color.array;

    for (let i = 0; i < this.particleCount; i++) {
      const idx = i * 6;
      let px = this.particlePositions[idx];
      let py = this.particlePositions[idx + 1];
      let pz = this.particlePositions[idx + 2];
      pz -= windFlowSpeed;

      let stress = 0;
      const fV =
        (px * px) / (2.8 * 2.8) +
        (py * py) / (2.8 * 2.8) +
        (pz * pz) / (12.0 * 12.0);
      const wZ = pz + 1.0;
      const wV =
        (px * px) / (10.0 * 10.0) +
        (py * py) / (1.8 * 1.8) +
        (wZ * wZ) / (5.5 * 5.5);
      const tY = py - 1.5;
      const tZ = pz + 4.5;
      const tV =
        (px * px) / (1.5 * 1.5) +
        (tY * tY) / (4.5 * 4.5) +
        (tZ * tZ) / (5.0 * 5.0);
      const minV = Math.min(fV, wV, tV);

      if (minV < 1.8) {
        let nx = 0,
          ny = 0,
          nz = 0;
        if (minV === fV) {
          nx = (2 * px) / (2.8 * 2.8);
          ny = (2 * py) / (2.8 * 2.8);
          nz = (2 * pz) / (12.0 * 12.0);
        } else if (minV === wV) {
          nx = (2 * px) / (10.0 * 10.0);
          ny = (2 * py) / (1.8 * 1.8);
          nz = (2 * wZ) / (5.5 * 5.5);
        } else {
          nx = (2 * px) / (1.5 * 1.5);
          ny = (2 * tY) / (4.5 * 4.5);
          nz = (2 * tZ) / (5.0 * 5.0);
        }

        const nLen = Math.sqrt(nx * nx + ny * ny + nz * nz);
        if (nLen > 0.001) {
          nx /= nLen;
          ny /= nLen;
          nz /= nLen;
        }

        const pushFactor = (1.8 - minV) * 1.2;
        px += nx * pushFactor;
        py += ny * pushFactor;
        pz += nz * pushFactor * 0.15;
        stress = Math.min(1.0, pushFactor * 1.5);
      } else {
        px += (this.originalX[i] - px) * 0.015;
        py += (this.originalY[i] - py) * 0.015;
        if (pz < -6.0 && pz > -25.0) {
          px += Math.sin(pz * 0.5 + i) * 0.03 * simulatedMach;
          py += Math.cos(pz * 0.4 - i) * 0.03 * simulatedMach;
        }
      }

      if (pz < this.PARTICLE_END_Z) {
        pz = this.PARTICLE_START_Z + Math.random() * 5;
        px = this.originalX[i];
        py = this.originalY[i];
      }

      this.particlePositions[idx] = px;
      this.particlePositions[idx + 1] = py;
      this.particlePositions[idx + 2] = pz;
      this.particlePositions[idx + 3] = px;
      this.particlePositions[idx + 4] = py;
      this.particlePositions[idx + 5] = pz + tailLength;

      let r = 0,
        g = 1,
        b = 1;
      if (viewMode === 0 && stress > 0.01) {
        if (stress < 0.5) {
          const t = stress * 2.0;
          r = t;
          g = 1.0;
          b = 1.0 - t;
        } else {
          const t = (stress - 0.5) * 2.0;
          r = 1.0;
          g = 1.0 - t;
          b = 0.0;
        }
      } else if (viewMode === 1) {
        r = 0.0;
        g = 0.8;
        b = 1.0;
      } else if (viewMode === 2) {
        const v = Math.min(1.0, simulatedMach * 0.4 + stress);
        r = v;
        g = 1.0 - v * 0.5;
        b = 1.0;
      } else if (viewMode === 3) {
        const v = Math.min(1.0, stress * 1.5);
        r = v * 0.5;
        g = 1.0;
        b = v * 0.2;
      }

      colors[idx] = r;
      colors[idx + 1] = g;
      colors[idx + 2] = b;
      colors[idx + 3] = r;
      colors[idx + 4] = g;
      colors[idx + 5] = b;
    }

    this.lineGeometry.attributes.position.needsUpdate = true;
    this.lineGeometry.attributes.color.needsUpdate = true;
  }
}

class FlightSim {
  constructor() {
    this.setupGraphics();
    this.setupPhysics();

    this.input = new InputController();
    this.ui = new UIManager();
    this.environment = new Environment(
      this.scene,
      this.world,
      this.physicsMaterial
    );

    this.jet = new Jet(
      this.scene,
      this.world,
      this.physicsContactMaterial.materials[0],
      () => {
        this.input.needReset = true;
      }
    );

    this.wind = new Wind(this.jet.jetGroup);

    window.addEventListener("resize", () => this.onWindowResize());
    this.ui.updateGear(this.input.gearDown);
  }
  setupGraphics() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      5000
    );
    this.camera.position.set(0, 158, -25);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    const container = document.getElementById("canvas-container");
    if (container) container.appendChild(this.renderer.domElement);
  }
  setupPhysics() {
    this.world = new CANNON.World();
    this.world.gravity.set(0, -15, 0);
    this.world.broadphase = new CANNON.NaiveBroadphase();
    this.world.solver.iterations = 10;

    this.physicsMaterial = new CANNON.Material("standard");
    this.physicsContactMaterial = new CANNON.ContactMaterial(
      this.physicsMaterial,
      this.physicsMaterial,
      { friction: 0.05, restitution: 0.1 }
    );
    this.world.addContactMaterial(this.physicsContactMaterial);
  }
  updateCamera() {
    const baseOffset = new THREE.Vector3(0, 8, -25); // HEIGHT, DISTANCE
    const yawQuat = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      this.input.orbitYaw
    );
    const pitchQuat = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(1, 0, 0),
      this.input.orbitPitch
    );

    const orbitOffset = baseOffset
      .clone()
      .applyQuaternion(pitchQuat)
      .applyQuaternion(yawQuat);
    orbitOffset.applyQuaternion(this.jet.jetGroup.quaternion);

    const targetPosition = this.jet.jetGroup.position.clone().add(orbitOffset);
    this.camera.position.lerp(targetPosition, 0.1);

    const lookTarget = new THREE.Vector3(0, 0, 20)
      .applyQuaternion(this.jet.jetGroup.quaternion)
      .add(this.jet.jetGroup.position);
    const worldUpFromJet = new THREE.Vector3(0, 1, 0).applyQuaternion(
      this.jet.jetGroup.quaternion
    );

    this.camera.up.lerp(worldUpFromJet, 0.1);
    this.camera.lookAt(lookTarget);
  }
  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
  animate() {
    requestAnimationFrame(() => this.animate());

    this.input.update();

    if (this.input.needReset) {
      this.jet.reset();
      this.input.needReset = false;
      this.input.gearDown = false;
      this.input.orbitYaw = 0;
      this.input.orbitPitch = 0;
      this.input.throttle = 0.5;
    }

    this.jet.applyFlightPhysics(this.input);
    this.world.step(1 / 60);

    const speed = this.jet.jetBody.velocity.length();
    this.wind.update(
      speed,
      this.jet.simulatedMach,
      this.ui.userWindOpacity,
      this.ui.currentViewMode
    );

    this.ui.updateGear(this.input.gearDown);
    this.ui.updateFlightData(
      speed,
      this.jet.simulatedMach,
      this.jet.jetBody.position.y,
      this.jet.jetBody.velocity.y * 180,
      this.input.throttle
    );
    this.ui.updateVelocityVector(this.jet.jetBody);
    this.ui.updateHorizon(this.jet.jetGroup);
    this.updateCamera();
    this.renderer.render(this.scene, this.camera);
  }
}

new FlightSim().animate();
