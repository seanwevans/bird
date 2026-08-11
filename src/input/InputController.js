import { GAMEPAD_MAPPING, applyDeadzone, buttonPressed, buttonValue } from "./GamepadMapping.js";

export const INPUT_CONFIG = Object.freeze({ deadzone: 0.15, throttleStep: 0.01, orbitSensitivity: 0.04, orbitPitchLimit: Math.PI / 3 });
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export class InputController {
  constructor({ eventTarget = globalThis.window, gamepadProvider = () => globalThis.navigator?.getGamepads?.()[0] ?? null, config = INPUT_CONFIG } = {}) {
    this.eventTarget = eventTarget;
    this.gamepadProvider = gamepadProvider;
    this.config = config;
    this.keys = { w: false, a: false, s: false, d: false, q: false, e: false, Shift: false, Control: false };
    Object.assign(this, { throttle: 1, pitch: 0, roll: 0, yaw: 0, orbitYaw: 0, orbitPitch: 0, gearDown: false, needReset: false, lastGearBtn: false, lastResetBtn: false });
    this.bindEvents();
  }

  bindEvents() {
    this.eventTarget?.addEventListener("keydown", (event) => {
      const key = this.normalizeKey(event.key);
      if (key in this.keys) this.keys[key] = true;
      if (key === "g" && !event.repeat) this.gearDown = !this.gearDown;
    });
    this.eventTarget?.addEventListener("keyup", (event) => {
      const key = this.normalizeKey(event.key);
      if (key in this.keys) this.keys[key] = false;
    });
  }

  normalizeKey(key) { return key.length === 1 ? key.toLowerCase() : key; }

  update() {
    this.pitch = this.roll = this.yaw = 0;
    const gamepad = this.gamepadProvider();
    if (gamepad) this.applyGamepad(gamepad);
    else { this.applyKeyboard(); this.lastGearBtn = this.lastResetBtn = false; }
  }

  applyKeyboard() {
    const { throttleStep } = this.config;
    if (this.keys.Shift) this.throttle = clamp(this.throttle + throttleStep, 0, 1);
    if (this.keys.Control) this.throttle = clamp(this.throttle - throttleStep, 0, 1);
    if (this.keys.w) this.pitch = -1;
    if (this.keys.s) this.pitch = 1;
    if (this.keys.a) this.roll = 1;
    if (this.keys.d) this.roll = -1;
    if (this.keys.q) this.yaw = 1;
    if (this.keys.e) this.yaw = -1;
  }

  applyGamepad(gamepad) {
    const m = GAMEPAD_MAPPING;
    this.throttle = clamp(this.throttle + (buttonValue(gamepad, m.throttleUpButton) - buttonValue(gamepad, m.throttleDownButton)) * this.config.throttleStep, 0, 1);
    this.pitch = -applyDeadzone(gamepad.axes[m.pitchAxis], this.config.deadzone);
    this.roll = applyDeadzone(gamepad.axes[m.rollAxis], this.config.deadzone);
    if (buttonPressed(gamepad, m.yawLeftButton)) this.yaw = 1;
    if (buttonPressed(gamepad, m.yawRightButton)) this.yaw = -1;
    const gearPressed = buttonPressed(gamepad, m.gearButton);
    if (gearPressed && !this.lastGearBtn) this.gearDown = !this.gearDown;
    this.lastGearBtn = gearPressed;
    const resetPressed = m.resetButtons.some((button) => buttonPressed(gamepad, button));
    if (resetPressed && !this.lastResetBtn) this.needReset = true;
    this.lastResetBtn = resetPressed;
    this.orbitYaw -= applyDeadzone(gamepad.axes[m.orbitXAxis], this.config.deadzone) * this.config.orbitSensitivity;
    this.orbitPitch = clamp(this.orbitPitch - applyDeadzone(gamepad.axes[m.orbitYAxis], this.config.deadzone) * this.config.orbitSensitivity, -this.config.orbitPitchLimit, this.config.orbitPitchLimit);
  }
}
