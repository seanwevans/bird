import { beforeEach, describe, expect, it, vi } from "vitest";
import { InputController } from "../../src/input/InputController.js";
import { HudController } from "../../src/ui/HudController.js";

describe("controllers", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <button id="hud-toggle"></button><span id="hud-chevron"></span>
      <button id="pause-toggle" aria-pressed="false">Pause</button>
      <div id="hud-panel" class="hidden"></div>
      <input id="opacity-slider" value="0.025">
      <span id="opacity-val"></span>
      <button class="view-btn active" data-mode="0"></button>
      <button class="view-btn" data-mode="2"></button>
      <div id="velocity-vector"></div>`;
  });

  it("applies gamepad deadzones and edge-triggers buttons", () => {
    const input = new InputController();
    const gamepad = {
      axes: [0.1, -0.5, 0, 0],
      buttons: Array.from({ length: 10 }, () => ({ value: 0, pressed: false })),
    };
    gamepad.buttons[0].pressed = true;
    input.applyGamepad(gamepad);
    expect(input.roll).toBe(0);
    expect(input.pitch).toBe(0.5);
    expect(input.gearDown).toBe(true);
    input.applyGamepad(gamepad);
    expect(input.gearDown).toBe(true);

    gamepad.buttons[1].pressed = true;
    input.applyGamepad(gamepad);
    expect(input.needReset).toBe(true);
  });

  it("maps keyboard pitch and roll to the same signs as the gamepad", () => {
    const keyboard = new InputController();
    Object.assign(keyboard.keys, { w: true, a: true, q: true });
    keyboard.applyKeyboard();

    const gamepad = new InputController();
    const buttons = Array.from({ length: 10 }, () => ({
      value: 0,
      pressed: false,
    }));
    buttons[4].pressed = true; // left bumper: yaw left
    // Left stick pushed forward and to the left.
    gamepad.applyGamepad({ axes: [-1, -1, 0, 0], buttons });

    // W pitches the nose down, A rolls left, Q yaws left.
    expect(keyboard.pitch).toBe(1);
    expect(keyboard.roll).toBe(-1);
    expect(keyboard.yaw).toBe(1);
    expect(keyboard.pitch).toBe(gamepad.pitch);
    expect(keyboard.roll).toBe(gamepad.roll);
    expect(keyboard.yaw).toBe(gamepad.yaw);

    const opposite = new InputController();
    Object.assign(opposite.keys, { s: true, d: true, e: true });
    opposite.applyKeyboard();
    expect(opposite.pitch).toBe(-1);
    expect(opposite.roll).toBe(1);
    expect(opposite.yaw).toBe(-1);
  });

  it("keeps the keyboard live while an idle gamepad is connected", () => {
    const idle = {
      axes: [0, 0, 0, 0],
      buttons: Array.from({ length: 10 }, () => ({ value: 0, pressed: false })),
    };
    const input = new InputController({
      navigator: { getGamepads: () => [idle] },
    });
    Object.assign(input.keys, { w: true, d: true, q: true });
    input.update(1 / 60);

    expect(input.pitch).toBe(1);
    expect(input.roll).toBe(1);
    expect(input.yaw).toBe(1);
  });

  it("lets a deflected gamepad axis override the keyboard command", () => {
    const gamepad = {
      axes: [0, 0, 0, 0],
      buttons: Array.from({ length: 10 }, () => ({ value: 0, pressed: false })),
    };
    const input = new InputController({
      navigator: { getGamepads: () => [gamepad] },
    });
    input.keys.w = true;
    gamepad.axes[1] = 1; // Left stick pulled back: nose up.
    input.update(1 / 60);

    expect(input.pitch).toBe(-1);
  });

  it("changes keyboard throttle at the same rate for different frame times", () => {
    const atThirtyFps = new InputController();
    const atOneTwentyFps = new InputController();
    atThirtyFps.keys.Control = true;
    atOneTwentyFps.keys.Control = true;

    for (let frame = 0; frame < 30; frame++) atThirtyFps.update(1 / 30);
    for (let frame = 0; frame < 120; frame++) atOneTwentyFps.update(1 / 120);

    expect(atThirtyFps.throttle).toBeCloseTo(0.4, 10);
    expect(atOneTwentyFps.throttle).toBeCloseTo(0.4, 10);
  });

  it("draws the flight path marker on the side the aircraft is sliding toward", () => {
    // Minimal identity-rotation stand-ins: the body already reports its
    // velocity in aircraft-local axes.
    const CANNON = {
      Quaternion: class {
        vmult(vector, target) {
          return Object.assign(target, {
            x: vector.x,
            y: vector.y,
            z: vector.z,
          });
        }
      },
      Vec3: class {
        constructor(x = 0, y = 0, z = 0) {
          Object.assign(this, { x, y, z });
        }
      },
    };
    const bodyWith = (velocity) => ({
      quaternion: { inverse: (target) => target },
      velocity,
    });
    // The element is offset by `translate(calc(-50% + Xpx), calc(-50% - Ypx))`,
    // so a positive X draws the marker right of centre and a positive Y above.
    const offsets = () => {
      const [x, y] = document
        .querySelector("#velocity-vector")
        .style.transform.match(/-?\d+(?:\.\d+)?(?=px)/g)
        .map(Number);
      return { x, y };
    };

    const ui = new HudController({ CANNON });

    // +x points out the left wing, so this is a slide to the left and the
    // marker belongs left of centre.
    ui.updateVelocityVector(bodyWith(new CANNON.Vec3(10, 0, 100)));
    expect(offsets().x).toBeLessThan(0);

    ui.updateVelocityVector(bodyWith(new CANNON.Vec3(-10, 0, 100)));
    expect(offsets().x).toBeGreaterThan(0);

    // Climbing relative to the airframe puts the marker above centre.
    ui.updateVelocityVector(bodyWith(new CANNON.Vec3(0, 10, 100)));
    expect(offsets().y).toBeGreaterThan(0);
  });

  it("opens the HUD and dispatches sensor-mode selection", () => {
    const ui = new HudController();
    const listener = vi.fn();
    window.addEventListener("viewModeChanged", listener, { once: true });
    document.querySelector("#hud-toggle").click();
    expect(document.querySelector("#hud-panel").classList).not.toContain(
      "hidden",
    );
    document.querySelector('[data-mode="2"]').click();
    expect(ui.currentViewMode).toBe(2);
    expect(listener).toHaveBeenCalledOnce();
    ui.updatePaused(true);
    expect(document.querySelector("#pause-toggle").textContent).toBe("Resume");
    expect(
      document.querySelector("#pause-toggle").getAttribute("aria-pressed"),
    ).toBe("true");
  });
});
