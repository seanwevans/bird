import { InputController } from "../input/InputController.js";
import { createPhysicsWorld } from "../physics/PhysicsWorld.js";
import { metersPerSecondToFeetPerMinute } from "../physics/UnitConversions.js";
import { AircraftModel } from "../rendering/AircraftModel.js";
import {
  DEFAULT_AIRFRAME,
  airframeById,
} from "../rendering/airframes/index.js";
import { Environment } from "../rendering/Environment.js";
import { Renderer } from "../rendering/Renderer.js";
import { WindVisualization } from "../rendering/WindVisualization.js";
import { HudController } from "../ui/HudController.js";
import { StartScreen } from "../ui/StartScreen.js";

/** How the camera behaves behind the start screen: a slow sweep around the
 * parked aircraft, from slightly above it. */
export const PREVIEW_ORBIT = Object.freeze({
  rate: 0.25,
  pitch: 0.22,
  /** Multiplier on the chase distance, to frame the whole aircraft. */
  distance: 1.5,
});

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
    this.pendingCrash = false;
    this.buildAircraft(DEFAULT_AIRFRAME);
    this.world.addEventListener("preStep", () => {
      if (!this.paused && this.started)
        this.aircraft.applyFlightPhysics(this.input);
    });
    window.addEventListener("resize", () => this.rendererSystem.resize());
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) this.clock.stop();
      else if (!this.paused) this.clock.start();
    });
    document
      .getElementById("pause-toggle")
      ?.addEventListener("click", () => this.setPaused(!this.paused));
    this.previewOrbitYaw = 0;
    this.startScreen = new StartScreen({
      document,
      onStart: () => this.start(),
      onSelect: (id) => this.selectAircraft(id),
    });
    // With no overlay in the page — an embedded or test document — there is
    // nothing to dismiss, so the flight begins immediately.
    this.started = !this.startScreen.showing;

    this.ui.updateGear(this.input.gearDown);
    this.ui.updateAerodynamics(this.aircraft.flightData);
    this.ui.updatePaused(this.paused);
  }

  /** Put an aircraft into the scene and the physics world, replacing whatever
   * was flying before. */
  buildAircraft(airframe) {
    this.aircraft?.dispose();
    this.aircraft = new AircraftModel(
      this.scene,
      this.world,
      this.physicsMaterial,
      () => {
        this.pendingCrash = true;
        this.input.needReset = true;
      },
      {
        THREE: this.THREE,
        CANNON: this.CANNON,
        eventTarget: this.window,
        airframe,
      },
    );
    this.airframe = airframe;
    // Compatibility name for integrations that previously accessed `jet`.
    this.jet = this.aircraft;
    this.wind = new WindVisualization(this.aircraft.jetGroup, {
      THREE: this.THREE,
    });
    this.ui.updateAerodynamics(this.aircraft.flightData);
  }

  /** Swap aircraft from the start screen. Once the flight is under way the
   * choice is fixed: rebuilding mid-air would teleport the player. */
  selectAircraft(id) {
    const airframe = airframeById(id);
    if (this.started || airframe === this.airframe) return;
    this.buildAircraft(airframe);
  }

  start() {
    if (this.started) return;
    this.started = true;
    // Hand the camera back to the player from wherever the preview left it,
    // and drop anything typed at the overlay.
    this.input.orbitYaw = 0;
    this.input.orbitPitch = 0;
    this.input.needReset = false;
    if (!this.document.hidden && !this.paused) this.clock.start();
  }

  setPaused(paused) {
    this.paused = paused;
    if (paused) this.clock.stop();
    else if (!this.document.hidden) this.clock.start();
    this.ui.updatePaused(paused);
  }

  /** The player's orbit while flying, an automatic sweep while the start
   * screen is up. */
  cameraOrbit() {
    return this.started
      ? {
          yaw: this.input.orbitYaw,
          pitch: this.input.orbitPitch,
          distance: 1,
          // Flying, the camera leads the aircraft so the view is down its
          // flight path; parked, it simply frames the aircraft itself.
          lookAhead: 20,
        }
      : {
          yaw: this.previewOrbitYaw,
          pitch: PREVIEW_ORBIT.pitch,
          distance: PREVIEW_ORBIT.distance,
          lookAhead: 0,
        };
  }

  updateCamera(deltaTime = 1 / 60) {
    const THREE = this.THREE;
    const orbit = this.cameraOrbit();
    const baseOffset = new THREE.Vector3(0, 8, -25).multiplyScalar(
      orbit.distance,
    );
    const yaw = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      orbit.yaw,
    );
    const pitch = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(1, 0, 0),
      orbit.pitch,
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
    const target = new THREE.Vector3(0, 0, orbit.lookAhead)
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

  /** Act on the one-shot key requests. Runs even while paused, so the pause
   * shortcut can start the simulation again. */
  applyRequests() {
    const pause = this.input.takeRequest("pauseToggleRequested");
    const hud = this.input.takeRequest("hudToggleRequested");
    // The requests are taken either way, so a key pressed at the start screen
    // does not fire the moment the flight begins.
    if (!this.started) return;
    if (pause) this.setPaused(!this.paused);
    if (hud) this.ui.toggleHudPanel();
  }

  update(deltaTime = this.fixedTimeStep) {
    const safeDelta = Math.max(0, Math.min(deltaTime, this.maxFrameDelta));
    this.applyRequests();
    if (!this.started) {
      this.previewOrbitYaw += safeDelta * PREVIEW_ORBIT.rate;
      this.updateCamera(safeDelta);
      this.rendererSystem.render();
      return;
    }
    if (this.paused || this.document.hidden) {
      this.ui.updateAlert(safeDelta);
      this.rendererSystem.render();
      return;
    }
    this.input.update(safeDelta);
    if (this.input.needReset) {
      this.aircraft.reset();
      this.input.reset();
      this.ui.showAlert(this.pendingCrash ? "AIRFRAME LOST" : "RESET");
      this.pendingCrash = false;
    }
    this.ui.updateAlert(safeDelta);
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
