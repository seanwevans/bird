import { AIRCRAFT_CONFIG } from "./AircraftConfig.js";
import { speedToSimulatedMach } from "./UnitConversions.js";

export function rotateVector(vector, quaternion) {
  const { x, y, z } = vector;
  const { x: qx, y: qy, z: qz, w: qw } = quaternion;
  const ix = qw * x + qy * z - qz * y, iy = qw * y + qz * x - qx * z, iz = qw * z + qx * y - qy * x, iw = -qx * x - qy * y - qz * z;
  return { x: ix * qw + iw * -qx + iy * -qz - iz * -qy, y: iy * qw + iw * -qy + iz * -qx - ix * -qz, z: iz * qw + iw * -qz + ix * -qy - iy * -qx };
}

/** Pure aerodynamic calculation; safe to execute without Three.js or Cannon.js. */
export function calculateAerodynamicForces(state, input, config = AIRCRAFT_CONFIG) {
  const speed = Math.hypot(state.velocity.x, state.velocity.y, state.velocity.z);
  const forward = rotateVector({ x: 0, y: 0, z: 1 }, state.quaternion);
  const up = rotateVector({ x: 0, y: 1, z: 0 }, state.quaternion);
  const thrust = config.maxThrust * input.throttle;
  const lift = speed * speed * config.liftCoefficient;
  const force = { x: forward.x * thrust + up.x * lift, y: forward.y * thrust + up.y * lift, z: forward.z * thrust + up.z * lift };
  const authority = Math.min(1, speed / config.controlSpeed);
  const torque = rotateVector({ x: input.pitch * config.pitchTorque * authority, y: input.yaw * config.yawTorque * authority, z: input.roll * config.rollTorque * authority }, state.quaternion);
  return { force, torque, speed, mach: speedToSimulatedMach(speed, config.simulatedSpeedOfSound) };
}

export class AircraftDynamics {
  constructor({ CANNON, world, material, onCrash = () => {}, config = AIRCRAFT_CONFIG }) {
    this.CANNON = CANNON; this.world = world; this.config = config; this.onCrash = onCrash;
    this.body = new CANNON.Body({ mass: config.mass, position: new CANNON.Vec3(...Object.values(config.initialPosition)), velocity: new CANNON.Vec3(...Object.values(config.initialVelocity)), material, linearDamping: 0.4, angularDamping: 0.8 });
    this.body.addShape(new CANNON.Box(new CANNON.Vec3(...Object.values(config.halfExtents))));
    world.addBody(this.body);
    this.body.addEventListener("collide", (event) => this.handleCollision(event));
    this.gearDown = false; this.mach = 0;
  }
  update(input) {
    this.gearDown = input.gearDown;
    const result = calculateAerodynamicForces(this.body, input, this.config);
    for (const axis of ["x", "y", "z"]) { this.body.force[axis] += result.force[axis]; this.body.torque[axis] += result.torque[axis]; }
    this.mach = result.mach;
    return result;
  }
  handleCollision(event) {
    const impact = Math.abs(event.contact.getImpactVelocityAlongNormal());
    if (event.body.isBuilding) return this.onCrash();
    if (!event.body.isGround) return;
    const up = rotateVector({ x: 0, y: 1, z: 0 }, this.body.quaternion);
    if ((!this.gearDown && impact > 2) || (this.gearDown && (impact > 12 || up.y < 0.8))) this.onCrash();
  }
  reset() { const p = this.config.initialPosition, v = this.config.initialVelocity; this.body.position.set(p.x,p.y,p.z); this.body.velocity.set(v.x,v.y,v.z); this.body.angularVelocity.set(0,0,0); this.body.quaternion.set(0,0,0,1); }
}
