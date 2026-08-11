import { metersPerSecondToFeetPerMinute } from "../physics/UnitConversions.js";

/** Coordinates the simulator's independently constructed systems. */
export class FlightSimulator {
  constructor({ renderer, world, input, hud, environment, dynamics, aircraftModel, wind, requestFrame }) {
    Object.assign(this, { renderer, world, input, hud, environment, dynamics, aircraftModel, wind });
    this.requestFrame = requestFrame;
    this.hud.updateGear(this.input.gearDown);
  }
  reset() {
    this.dynamics.reset();
    Object.assign(this.input, { needReset: false, gearDown: false, orbitYaw: 0, orbitPitch: 0, throttle: 0.5 });
  }
  tick() {
    this.input.update();
    if (this.input.needReset) this.reset();
    const flight = this.dynamics.update(this.input);
    this.world.step(1 / 60);
    this.aircraftModel.sync(this.dynamics.body, this.input, flight.mach);
    this.wind.update(flight.speed, flight.mach, this.hud.userWindOpacity, this.hud.currentViewMode);
    this.hud.updateGear(this.input.gearDown);
    this.hud.updateFlightData(flight.speed, flight.mach, this.dynamics.body.position.y, metersPerSecondToFeetPerMinute(this.dynamics.body.velocity.y), this.input.throttle);
    this.hud.updateVelocityVector(this.dynamics.body);
    this.hud.updateHorizon(this.aircraftModel.jetGroup);
    this.renderer.updateCamera(this.aircraftModel.jetGroup, this.input.orbitYaw, this.input.orbitPitch);
    this.renderer.render();
  }
  animate() { this.requestFrame(() => this.animate()); this.tick(); }
}
