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

  update(deltaTime = 1 / 60) {
    this.pitch = this.roll = this.yaw = 0;
    // Both sources are read every frame: a connected but idle gamepad reports
    // neutral axes, and leaving it in sole control would silently disable the
    // keyboard for anyone who has a controller plugged in.
    this.applyKeyboard(deltaTime);
    const gamepad = this.navigator?.getGamepads?.()[0];
    if (gamepad) this.applyGamepad(gamepad);
    else this.lastGearBtn = this.lastResetBtn = false;
  }

  applyKeyboard(deltaTime = 1 / 60) {
    const throttleChange = 0.6 * deltaTime;
    if (this.keys.Shift)
      this.throttle = Math.min(1, this.throttle + throttleChange);
    if (this.keys.Control)
      this.throttle = Math.max(0, this.throttle - throttleChange);
    // Signs match the gamepad mapping: positive pitch is nose down, positive
    // roll is right wing down, and positive yaw is nose left.
    if (this.keys.w) this.pitch = 1;
    if (this.keys.s) this.pitch = -1;
    if (this.keys.a) this.roll = -1;
    if (this.keys.d) this.roll = 1;
    if (this.keys.q) this.yaw = 1;
    if (this.keys.e) this.yaw = -1;
  }

  applyGamepad(gamepad) {
    const mapped = normalizeGamepad(gamepad, this, {
      deadzone: this.GAMEPAD_DEADZONE,
      orbitSensitivity: this.ORBIT_SENSITIVITY,
      orbitPitchLimit: this.ORBIT_PITCH_LIMIT,
    });
    // A deflected stick or bumper wins; a neutral one leaves the keyboard
    // command from this frame in place. Throttle is already accumulated from
    // the current value, so keyboard and trigger adjustments both apply.
    Object.assign(this, {
      pitch: mapped.pitch || this.pitch,
      roll: mapped.roll || this.roll,
      yaw: mapped.yaw || this.yaw,
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
