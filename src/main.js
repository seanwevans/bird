import { FlightSimulator } from "./app/FlightSimulator.js";
import { InputController } from "./input/InputController.js";
import { AircraftDynamics } from "./physics/AircraftDynamics.js";
import { Renderer } from "./rendering/Renderer.js";
import { Environment } from "./rendering/Environment.js";
import { AircraftModel } from "./rendering/AircraftModel.js";
import { WindVisualization } from "./rendering/WindVisualization.js";
import { HudController } from "./ui/HudController.js";

const { THREE, CANNON } = globalThis;
const renderer = new Renderer({ THREE, window, document });
const world = new CANNON.World();
world.gravity.set(0, -15, 0);
world.broadphase = new CANNON.NaiveBroadphase();
world.solver.iterations = 10;
const physicsMaterial = new CANNON.Material("standard");
world.addContactMaterial(new CANNON.ContactMaterial(physicsMaterial, physicsMaterial, { friction: 0.05, restitution: 0.1 }));
const input = new InputController({ eventTarget: window });
const hud = new HudController({ document, eventTarget: window, THREE, CANNON, CustomEvent });
const environment = new Environment({ THREE, CANNON, scene: renderer.scene, world, physicsMaterial });
const aircraftModel = new AircraftModel({ THREE, scene: renderer.scene });
const dynamics = new AircraftDynamics({ CANNON, world, material: physicsMaterial, onCrash: () => { input.needReset = true; } });
const wind = new WindVisualization({ THREE, aircraftGroup: aircraftModel.jetGroup });
window.addEventListener("viewModeChanged", (event) => aircraftModel.setViewMode(event.detail));

new FlightSimulator({ renderer, world, input, hud, environment, dynamics, aircraftModel, wind, requestFrame: requestAnimationFrame }).animate();
