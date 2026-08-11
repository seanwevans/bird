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
    window.addEventListener("resize", () => this.rendererSystem.resize());
    this.ui.updateGear(this.input.gearDown);
  }

  updateCamera() {
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
    this.camera.position.lerp(
      this.aircraft.jetGroup.position.clone().add(orbitOffset),
      0.1,
    );
    const target = new THREE.Vector3(0, 0, 20)
      .applyQuaternion(this.aircraft.jetGroup.quaternion)
      .add(this.aircraft.jetGroup.position);
    this.camera.up.lerp(
      new THREE.Vector3(0, 1, 0).applyQuaternion(
        this.aircraft.jetGroup.quaternion,
      ),
      0.1,
    );
    this.camera.lookAt(target);
  }

  update() {
    this.input.update();
    if (this.input.needReset) {
      this.aircraft.reset();
      this.input.reset();
    }
    this.aircraft.applyFlightPhysics(this.input);
    this.world.step(1 / 60);
    const body = this.aircraft.jetBody;
    const speed = body.velocity.length();
    this.wind.update(
      speed,
      this.aircraft.simulatedMach,
      this.ui.userWindOpacity,
      this.ui.currentViewMode,
    );
    this.ui.updateGear(this.input.gearDown);
    this.ui.updateFlightData(
      speed,
      this.aircraft.simulatedMach,
      body.position.y,
      metersPerSecondToFeetPerMinute(body.velocity.y),
      this.input.throttle,
    );
    this.ui.updateVelocityVector(body);
    this.ui.updateHorizon(this.aircraft.jetGroup);
    this.updateCamera();
    this.rendererSystem.render();
  }

  animate() {
    this.window.requestAnimationFrame(() => this.animate());
    this.update();
  }
}
