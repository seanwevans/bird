import * as CANNON from "cannon-es";
import * as THREE from "three";

import { FlightSimulator } from "./app/FlightSimulator.js";

// Reaching this line means the bare imports above resolved, so the page's
// build-step hint is not needed.
clearTimeout(window.__bootTimeout);

new FlightSimulator({ THREE, CANNON, window, document }).animate();
