import * as CANNON from "cannon-es";
import * as THREE from "three";

import { FlightSimulator } from "./app/FlightSimulator.js";

new FlightSimulator({ THREE, CANNON, window, document }).animate();
