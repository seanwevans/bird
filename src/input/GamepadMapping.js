import { clamp } from "../physics/AircraftDynamics.js";

export const GAMEPAD_CONFIG = Object.freeze({
  deadzone: 0.15,
  orbitSensitivity: 0.04,
  orbitPitchLimit: Math.PI / 3,
});

export const applyDeadzone = (value, deadzone = GAMEPAD_CONFIG.deadzone) =>
  Math.abs(value ?? 0) > deadzone ? value : 0;

/** Normalize a browser Gamepad into application controls. */
export function normalizeGamepad(
  gamepad,
  previous = {},
  config = GAMEPAD_CONFIG,
) {
  const button = (index) =>
    gamepad.buttons[index] ?? { value: 0, pressed: false };
  const gearPressed = button(0).pressed;
  const resetPressed = button(1).pressed || button(9).pressed;
  return {
    pitch: -applyDeadzone(gamepad.axes[1], config.deadzone),
    roll: applyDeadzone(gamepad.axes[0], config.deadzone),
    yaw: button(4).pressed ? 1 : button(5).pressed ? -1 : 0,
    throttle: clamp(
      (previous.throttle ?? 1) +
        button(7).value * 0.01 -
        button(6).value * 0.01,
    ),
    orbitYaw:
      (previous.orbitYaw ?? 0) -
      applyDeadzone(gamepad.axes[2], config.deadzone) * config.orbitSensitivity,
    orbitPitch: clamp(
      (previous.orbitPitch ?? 0) -
        applyDeadzone(gamepad.axes[3], config.deadzone) *
          config.orbitSensitivity,
      -config.orbitPitchLimit,
      config.orbitPitchLimit,
    ),
    gearPressed,
    resetPressed,
  };
}
