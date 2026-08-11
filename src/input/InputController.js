import { GAMEPAD_CONFIG, normalizeGamepad } from "./GamepadMapping.js";

export function normalizeKey(key) {
  return key.length === 1 ? key.toLowerCase() : key;
}

export class InputController {
  constructor({
    eventTarget = globalThis.window,
    navigator = globalThis.navigator,
  } = {}) {
    this.eventTarget = eventTarget;
    this.navigator = navigator;
    this.keys = Object.fromEntries(
      ["w", "a", "s", "d", "q", "e", "Shift", "Control"].map((key) => [
        key,
        false,
      ]),
    );
    Object.assign(this, {
      throttle: 1,
      pitch: 0,
      roll: 0,
      yaw: 0,
      orbitYaw: 0,
      orbitPitch: 0,
      gearDown: false,
      needReset: false,
      lastGearBtn: false,
      lastResetBtn: false,
    });
    // Backwards-compatible names for callers that tune controller behavior.
    this.GAMEPAD_DEADZONE = GAMEPAD_CONFIG.deadzone;
    this.ORBIT_SENSITIVITY = GAMEPAD_CONFIG.orbitSensitivity;
    this.ORBIT_PITCH_LIMIT = GAMEPAD_CONFIG.orbitPitchLimit;
    this.bindEvents();
  }

  bindEvents() {
    this.eventTarget?.addEventListener("keydown", (event) => {
      const key = normalizeKey(event.key);
      if (key in this.keys) this.keys[key] = true;
      if (key === "g" && !event.repeat) this.gearDown = !this.gearDown;
    });
    this.eventTarget?.addEventListener("keyup", (event) => {
      const key = normalizeKey(event.key);
      if (key in this.keys) this.keys[key] = false;
    });
  }

  normalizeKey(key) {
    return normalizeKey(key);
  }

  update() {
    this.pitch = this.roll = this.yaw = 0;
    const gamepad = this.navigator?.getGamepads?.()[0];
    if (gamepad) this.applyGamepad(gamepad);
    else {
      this.applyKeyboard();
      this.lastGearBtn = this.lastResetBtn = false;
    }
  }

  applyKeyboard() {
    if (this.keys.Shift) this.throttle = Math.min(1, this.throttle + 0.01);
    if (this.keys.Control) this.throttle = Math.max(0, this.throttle - 0.01);
    if (this.keys.w) this.pitch = -1;
    if (this.keys.s) this.pitch = 1;
    if (this.keys.a) this.roll = 1;
    if (this.keys.d) this.roll = -1;
    if (this.keys.q) this.yaw = 1;
    if (this.keys.e) this.yaw = -1;
  }

  applyGamepad(gamepad) {
    const mapped = normalizeGamepad(gamepad, this, {
      deadzone: this.GAMEPAD_DEADZONE,
      orbitSensitivity: this.ORBIT_SENSITIVITY,
      orbitPitchLimit: this.ORBIT_PITCH_LIMIT,
    });
    Object.assign(this, {
      pitch: mapped.pitch,
      roll: mapped.roll,
      yaw: mapped.yaw,
      throttle: mapped.throttle,
      orbitYaw: mapped.orbitYaw,
      orbitPitch: mapped.orbitPitch,
    });
    if (mapped.gearPressed && !this.lastGearBtn) this.gearDown = !this.gearDown;
    if (mapped.resetPressed && !this.lastResetBtn) this.needReset = true;
    this.lastGearBtn = mapped.gearPressed;
    this.lastResetBtn = mapped.resetPressed;
  }

  reset() {
    Object.assign(this, {
      needReset: false,
      gearDown: false,
      orbitYaw: 0,
      orbitPitch: 0,
      throttle: 0.5,
    });
  }
}
