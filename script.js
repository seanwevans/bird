// Compatibility facade. New code should import the focused modules directly.
export {
  FlightSimulator,
  FlightSimulator as FlightSim,
} from "./src/app/FlightSimulator.js";
export { InputController } from "./src/input/InputController.js";
export {
  AircraftModel,
  AircraftModel as Jet,
} from "./src/rendering/AircraftModel.js";
export {
  HudController,
  HudController as UIManager,
} from "./src/ui/HudController.js";
