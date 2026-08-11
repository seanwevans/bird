import { FlightSimulator } from "./app/FlightSimulator.js";

const { THREE, CANNON } = window;
if (!THREE || !CANNON)
  throw new Error("Three.js and Cannon.js must be loaded before the simulator");

new FlightSimulator({ THREE, CANNON, window, document }).animate();
