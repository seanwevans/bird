import { beforeEach, describe, expect, it, vi } from "vitest";
import { InputController } from "../../src/input/InputController.js";
import { HudController } from "../../src/ui/HudController.js";

describe("controllers", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <button id="hud-toggle"></button><span id="hud-chevron"></span>
      <div id="hud-panel" class="hidden"></div>
      <input id="opacity-slider" value="0.025">
      <span id="opacity-val"></span>
      <button class="view-btn active" data-mode="0"></button>
      <button class="view-btn" data-mode="2"></button>`;
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
  });
});
