import { InputController } from "../input/InputController.js";
import { createPhysicsWorld } from "../physics/PhysicsWorld.js";
import { metersPerSecondToFeetPerMinute } from "../physics/UnitConversions.js";
import { AircraftModel } from "../rendering/AircraftModel.js";
import { Environment } from "../rendering/Environment.js";
import { Renderer } from "../rendering/Renderer.js";
import { WindVisualization } from "../rendering/WindVisualization.js";
import { HudController } from "../ui/HudController.js";

/** Coordinates the independently testable input, physics, rendering, and UI systems. */
export class FlightSimulator {
  constructor({
    THREE,
    CANNON,
    window,
    document,
    rendererSystem,
    physics,
  } = {}) {
    this.THREE = THREE;
    this.CANNON = CANNON;
    this.window = window;
    this.document = document;
    this.fixedTimeStep = 1 / 60;
    this.maxSubSteps = 5;
    this.maxFrameDelta = this.fixedTimeStep * this.maxSubSteps;
    this.paused = false;
    this.clock = new THREE.Clock(false);
    this.rendererSystem =
      rendererSystem ??
      new Renderer({
        THREE,
        window,
        container: document.getElementById("canvas-container"),
      });
    this.scene = this.rendererSystem.scene;
    this.camera = this.rendererSystem.camera;
    const physicsSystem = physics ?? createPhysicsWorld(CANNON);
    this.world = physicsSystem.world;
    this.physicsMaterial = physicsSystem.material;

    this.input = new InputController({
      eventTarget: window,
      navigator: window.navigator,
    });
    this.ui = new HudController({
      document,
      eventTarget: window,
      THREE,
      CANNON,
    });
    this.environment = new Environment(
      this.scene,
      this.world,
      this.physicsMaterial,
      { THREE, CANNON },
    );
    this.aircraft = new AircraftModel(
      this.scene,
      this.world,
      this.physicsMaterial,
      () => {
        this.input.needReset = true;
      },
      { THREE, CANNON, eventTarget: window },
    );
    // Compatibility name for integrations that previously accessed `jet`.
    this.jet = this.aircraft;
    this.wind = new WindVisualization(this.aircraft.jetGroup, { THREE });
    this.world.addEventListener("preStep", () => {
      if (!this.paused) this.aircraft.applyFlightPhysics(this.input);
    });
    window.addEventListener("resize", () => this.rendererSystem.resize());
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) this.clock.stop();
      else if (!this.paused) this.clock.start();
    });
    document
      .getElementById("pause-toggle")
      ?.addEventListener("click", () => this.setPaused(!this.paused));
    this.ui.updateGear(this.input.gearDown);
    this.ui.updateAerodynamics(this.aircraft.flightData);
    this.ui.updatePaused(this.paused);
  }

  setPaused(paused) {
    this.paused = paused;
    if (paused) this.clock.stop();
    else if (!this.document.hidden) this.clock.start();
    this.ui.updatePaused(paused);
  }

  updateCamera(deltaTime = 1 / 60) {
    const THREE = this.THREE;
    const baseOffset = new THREE.Vector3(0, 8, -25);
    const yaw = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      this.input.orbitYaw,
    );
    const pitch = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(1, 0, 0),
      this.input.orbitPitch,
    );
    const orbitOffset = baseOffset
      .clone()
      .applyQuaternion(pitch)
      .applyQuaternion(yaw);
    orbitOffset.applyQuaternion(this.aircraft.jetGroup.quaternion);
    const cameraAlpha = 1 - Math.pow(1 - 0.1, deltaTime * 60);
    this.camera.position.lerp(
      this.aircraft.jetGroup.position.clone().add(orbitOffset),
      cameraAlpha,
    );
    const target = new THREE.Vector3(0, 0, 20)
      .applyQuaternion(this.aircraft.jetGroup.quaternion)
      .add(this.aircraft.jetGroup.position);
    this.camera.up.lerp(
      new THREE.Vector3(0, 1, 0).applyQuaternion(
        this.aircraft.jetGroup.quaternion,
      ),
      cameraAlpha,
    );
    this.camera.lookAt(target);
  }

  update(deltaTime = this.fixedTimeStep) {
    const safeDelta = Math.max(0, Math.min(deltaTime, this.maxFrameDelta));
    if (this.paused || this.document.hidden) {
      this.rendererSystem.render();
      return;
    }
    this.input.update(safeDelta);
    if (this.input.needReset) {
      this.aircraft.reset();
      this.input.reset();
    }
    this.world.step(this.fixedTimeStep, safeDelta, this.maxSubSteps);
    this.aircraft.updateAnimations(this.input, safeDelta);
    const body = this.aircraft.jetBody;
    const speed = body.velocity.length();
    this.wind.update(
      speed,
      this.aircraft.simulatedMach,
      this.ui.userWindOpacity,
      this.ui.currentViewMode,
      safeDelta,
    );
    this.ui.updateGear(this.input.gearDown);
    this.ui.updateAerodynamics(this.aircraft.flightData);
    this.ui.updateFlightData(
      speed,
      this.aircraft.simulatedMach,
      body.position.y,
      metersPerSecondToFeetPerMinute(body.velocity.y),
      this.input.throttle,
    );
    this.ui.updateVelocityVector(body);
    this.ui.updateHorizon(this.aircraft.jetGroup);
    this.updateCamera(safeDelta);
    this.rendererSystem.render();
  }

  animate() {
    if (!this.clock.running && !this.paused && !this.document.hidden)
      this.clock.start();
    this.window.requestAnimationFrame(() => this.animate());
    this.update(this.clock.running ? this.clock.getDelta() : 0);
  }
}
