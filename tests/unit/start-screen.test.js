import { beforeEach, describe, expect, it, vi } from "vitest";
import { StartScreen } from "../../src/ui/StartScreen.js";

describe("StartScreen", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="start-screen"><button id="start-button">TAKE OFF</button></div>`;
  });

  it("holds the flight until the button is pressed", () => {
    const onStart = vi.fn();
    const screen = new StartScreen({ onStart });
    const root = document.querySelector("#start-screen");

    expect(screen.showing).toBe(true);
    expect(root.classList).not.toContain("dismissed");
    expect(onStart).not.toHaveBeenCalled();

    document.querySelector("#start-button").click();

    expect(screen.showing).toBe(false);
    expect(root.classList).toContain("dismissed");
    expect(root.getAttribute("aria-hidden")).toBe("true");
    expect(onStart).toHaveBeenCalledOnce();
  });

  it("only starts the flight once", () => {
    const onStart = vi.fn();
    new StartScreen({ onStart });

    document.querySelector("#start-button").click();
    document.querySelector("#start-button").click();

    expect(onStart).toHaveBeenCalledOnce();
  });

  it("stays out of the way in a document with no overlay", () => {
    document.body.innerHTML = "";
    const onStart = vi.fn();
    const screen = new StartScreen({ onStart });

    // Nothing to dismiss, so an embedded or test page is not held back.
    expect(screen.showing).toBe(false);
    screen.dismiss();
    expect(onStart).not.toHaveBeenCalled();
  });
});
