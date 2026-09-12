/** The title overlay shown before the flight begins.
 *
 * It is dismissed by CSS class rather than by removing the element, so the
 * fade-out and the removal from hit testing and the accessibility tree are
 * both described in one place in `style.css`.
 */
export class StartScreen {
  constructor({ document = globalThis.document, onStart, onSelect } = {}) {
    this.document = document;
    this.onStart = onStart;
    this.onSelect = onSelect;
    this.root = document.getElementById("start-screen");
    this.button = document.getElementById("start-button");
    this.tagline = document.getElementById("airframe-tagline");
    this.airframeButtons = [...document.querySelectorAll("[data-airframe]")];
    this.dismissed = !this.root;
    this.button?.addEventListener("click", () => this.dismiss());

    // The markup names the aircraft and describes them; the screen only tracks
    // which one is chosen, so adding an aircraft does not touch this file.
    this.selected =
      this.airframeButtons.find((button) => button.classList.contains("active"))
        ?.dataset.airframe ?? null;
    for (const button of this.airframeButtons)
      button.addEventListener("click", () =>
        this.select(button.dataset.airframe),
      );
  }

  select(id) {
    if (id === this.selected) return;
    this.selected = id;
    for (const button of this.airframeButtons) {
      const chosen = button.dataset.airframe === id;
      button.classList.toggle("active", chosen);
      button.setAttribute("aria-pressed", String(chosen));
      if (chosen && this.tagline)
        this.tagline.innerText = button.dataset.tagline ?? "";
    }
    this.onSelect?.(id);
  }

  /** True while the overlay is still holding the flight back. */
  get showing() {
    return !this.dismissed;
  }

  dismiss() {
    if (this.dismissed) return;
    this.dismissed = true;
    this.root?.classList.add("dismissed");
    this.root?.setAttribute("aria-hidden", "true");
    this.onStart?.();
  }
}
