export const GAMEPAD_MAPPING = Object.freeze({
  pitchAxis: 1,
  rollAxis: 0,
  orbitXAxis: 2,
  orbitYAxis: 3,
  throttleUpButton: 7,
  throttleDownButton: 6,
  yawLeftButton: 4,
  yawRightButton: 5,
  gearButton: 0,
  resetButtons: [1, 9]
});

export function applyDeadzone(value = 0, deadzone = 0.15) {
  return Math.abs(value) > deadzone ? value : 0;
}

export function buttonValue(gamepad, index) {
  return gamepad.buttons[index]?.value ?? 0;
}

export function buttonPressed(gamepad, index) {
  return gamepad.buttons[index]?.pressed ?? false;
}
