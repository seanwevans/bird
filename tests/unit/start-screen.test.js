import { beforeEach, describe, expect, it, vi } from "vitest";
import { StartScreen } from "../../src/ui/StartScreen.js";

describe("StartScreen", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="start-screen">
        <button data-airframe="f22" data-tagline="Heavy." class="craft-btn active" aria-pressed="true"></button>
        <button data-airframe="f16" data-tagline="Light." class="craft-btn" aria-pressed="false"></button>
        <p id="airframe-tagline">Heavy.</p>
        <button id="start-button">TAKE OFF</button>
      </div>`;
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

  it("moves the selection and reports it once per change", () => {
    const onSelect = vi.fn();
    const screen = new StartScreen({ onSelect });
    const [f22, f16] = document.querySelectorAll("[data-airframe]");

    expect(screen.selected).toBe("f22");

    f16.click();
    expect(screen.selected).toBe("f16");
    expect(f16.getAttribute("aria-pressed")).toBe("true");
    expect(f16.classList).toContain("active");
    expect(f22.getAttribute("aria-pressed")).toBe("false");
    expect(f22.classList).not.toContain("active");
    expect(document.querySelector("#airframe-tagline").innerText).toBe(
      "Light.",
    );
    expect(onSelect).toHaveBeenCalledWith("f16");

    // Pressing the one already chosen is not a change.
    f16.click();
    expect(onSelect).toHaveBeenCalledOnce();
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
