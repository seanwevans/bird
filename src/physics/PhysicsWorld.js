import { AIRCRAFT_CONFIG } from "./AircraftConfig.js";

export function createPhysicsWorld(CANNON) {
  const world = new CANNON.World();
  world.gravity.set(0, AIRCRAFT_CONFIG.gravity, 0);
  world.broadphase = new CANNON.NaiveBroadphase();
  world.solver.iterations = 10;
  const material = new CANNON.Material("standard");
  const contactMaterial = new CANNON.ContactMaterial(material, material, {
    friction: 0.05,
    restitution: 0.1,
  });
  world.addContactMaterial(contactMaterial);
  return { world, material, contactMaterial };
}
