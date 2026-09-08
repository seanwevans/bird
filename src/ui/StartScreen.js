/** The title overlay shown before the flight begins.
 *
 * It is dismissed by CSS class rather than by removing the element, so the
 * fade-out and the removal from hit testing and the accessibility tree are
 * both described in one place in `style.css`.
 */
export class StartScreen {
  constructor({ document = globalThis.document, onStart } = {}) {
    this.document = document;
    this.onStart = onStart;
    this.root = document.getElementById("start-screen");
    this.button = document.getElementById("start-button");
    this.dismissed = !this.root;
    this.button?.addEventListener("click", () => this.dismiss());
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
