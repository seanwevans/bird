import { formatFlightData } from "./HudFormatter.js";

export class HudController {
  constructor({
    document = globalThis.document,
    eventTarget = globalThis.window,
    THREE = globalThis.THREE,
    CANNON = globalThis.CANNON,
  } = {}) {
    this.document = document;
    this.eventTarget = eventTarget;
    this.THREE = THREE;
    this.CANNON = CANNON;
    this.dom = {
      machDisplay: this.document.getElementById("mach-display"),
      altDisplay: this.document.getElementById("alt-val"),
      vsiDisplay: this.document.getElementById("vsi-val"),
      speedDisplay: this.document.getElementById("speed-val"),
      throttleDisplay: this.document.getElementById("throttle-val"),
      hudSpeedOnScreen: this.document.getElementById("hud-speed-on-screen"),
      hudAltOnScreen: this.document.getElementById("hud-alt-on-screen"),
      hudVsiOnScreen: this.document.getElementById("hud-vsi-on-screen"),
      velocityVectorEl: this.document.getElementById("velocity-vector"),
      viewBtns: this.document.querySelectorAll(".view-btn"),
      opacitySlider: this.document.getElementById("opacity-slider"),
      opacityValDisplay: this.document.getElementById("opacity-val"),
      horizonTransform: this.document.getElementById("horizon-transform"),
      hudToggle: this.document.getElementById("hud-toggle"),
      hudPanel: this.document.getElementById("hud-panel"),
      hudChevron: this.document.getElementById("hud-chevron"),
      controllerStatus: this.document.getElementById("controller-status"),
      hudGear: this.document.getElementById("hud-gear-on-screen"),
      pauseButton: this.document.getElementById("pause-toggle"),
    };

    // Initialize from the slider so the wind matches the value shown in the
    // UI (2.5%) on load instead of starting invisible until the slider moves.
    this.userWindOpacity = this.dom.opacitySlider
      ? parseFloat(this.dom.opacitySlider.value)
      : 0.025;
    this.currentViewMode = 0;

    this.bindEvents();
  }
  updatePaused(paused) {
    if (!this.dom.pauseButton) return;
    this.dom.pauseButton.textContent = paused ? "Resume" : "Pause";
    this.dom.pauseButton.setAttribute("aria-pressed", String(paused));
  }
  bindEvents() {
    if (this.dom.hudToggle && this.dom.hudPanel && this.dom.hudChevron) {
      this.dom.hudToggle.addEventListener("click", () => {
        this.dom.hudPanel.classList.toggle("hidden");
        this.dom.hudChevron.classList.toggle("rotate-180");
      });
    }

    if (this.dom.opacitySlider && this.dom.opacityValDisplay) {
      this.dom.opacitySlider.addEventListener("input", (e) => {
        this.userWindOpacity = parseFloat(e.target.value);
        this.dom.opacityValDisplay.innerText = `${Math.round(
          this.userWindOpacity * 100,
        )}%`;
      });
    }

    this.dom.viewBtns.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        this.dom.viewBtns.forEach((b) =>
          b.classList.remove(
            "active",
            "bg-cyan-900/40",
            "border-cyan-500/50",
            "text-cyan-300",
          ),
        );
        e.currentTarget.classList.add(
          "active",
          "bg-cyan-900/40",
          "border-cyan-500/50",
          "text-cyan-300",
        );
        this.currentViewMode = parseInt(
          e.currentTarget.getAttribute("data-mode"),
          10,
        );

        // Dispatch custom event so the Jet can update materials
        this.eventTarget?.dispatchEvent(
          new this.eventTarget.CustomEvent("viewModeChanged", {
            detail: this.currentViewMode,
          }),
        );
      });
    });

    this.eventTarget?.addEventListener("gamepadconnected", () =>
      this.updateControllerStatus(true),
    );
    this.eventTarget?.addEventListener("gamepaddisconnected", () =>
      this.updateControllerStatus(false),
    );
  }
  updateControllerStatus(connected) {
    if (!this.dom.controllerStatus) return;
    if (connected) {
      this.dom.controllerStatus.innerText = "Gamepad: Online";
      this.dom.controllerStatus.classList.replace(
        "text-slate-400",
        "text-green-400",
      );
      this.dom.controllerStatus.classList.add("border-green-500/50");
    } else {
      this.dom.controllerStatus.innerText = "Gamepad: Disconnected";
      this.dom.controllerStatus.classList.replace(
        "text-green-400",
        "text-slate-400",
      );
      this.dom.controllerStatus.classList.remove("border-green-500/50");
    }
  }
  updateFlightData(speed, mach, altitude, vsi, throttle) {
    const formatted = formatFlightData(speed, mach, altitude, vsi, throttle);

    if (this.dom.machDisplay) this.dom.machDisplay.innerText = formatted.mach;
    if (this.dom.speedDisplay)
      this.dom.speedDisplay.innerText = formatted.speed;
    if (this.dom.altDisplay) this.dom.altDisplay.innerText = formatted.altitude;
    if (this.dom.vsiDisplay)
      this.dom.vsiDisplay.innerText = formatted.verticalSpeed;
    if (this.dom.throttleDisplay)
      this.dom.throttleDisplay.innerText = formatted.throttle;

    if (this.dom.hudSpeedOnScreen)
      this.dom.hudSpeedOnScreen.innerText = formatted.speedValue;
    if (this.dom.hudAltOnScreen)
      this.dom.hudAltOnScreen.innerText = formatted.altitudeValue;
    if (this.dom.hudVsiOnScreen)
      this.dom.hudVsiOnScreen.innerText = formatted.verticalSpeedValue;
  }
  updateGear(gearDown) {
    if (!this.dom.hudGear) return;
    if (gearDown) {
      this.dom.hudGear.innerText = "GEAR DOWN";
      this.dom.hudGear.className =
        "font-mono text-sm font-bold text-green-400 drop-shadow-[0_0_4px_rgba(74,222,128,0.8)] transition-colors duration-300";
    } else {
      this.dom.hudGear.innerText = "GEAR UP";
      this.dom.hudGear.className =
        "font-mono text-sm font-bold text-red-500 drop-shadow-[0_0_4px_rgba(239,68,68,0.8)] transition-colors duration-300";
    }
  }
  updateVelocityVector(jetBody) {
    if (!this.dom.velocityVectorEl) return;
    const invQuat = new this.CANNON.Quaternion();
    jetBody.quaternion.inverse(invQuat);
    const localVel = new this.CANNON.Vec3();
    invQuat.vmult(jetBody.velocity, localVel);

    if (localVel.z > 0.1) {
      const yawOffset = Math.atan2(localVel.x, localVel.z) * 350;
      const pitchOffset = Math.atan2(localVel.y, localVel.z) * 350;
      const cx = Math.max(-180, Math.min(180, yawOffset));
      const cy = Math.max(-180, Math.min(180, pitchOffset));
      this.dom.velocityVectorEl.style.transform = `translate(calc(-50% + ${cx}px), calc(-50% - ${cy}px))`;
      this.dom.velocityVectorEl.style.opacity = "1";
    } else {
      this.dom.velocityVectorEl.style.opacity = "0";
    }
  }
  updateHorizon(jetGroup) {
    if (!this.dom.horizonTransform) return;
    const jetFwd = new this.THREE.Vector3(0, 0, 1).applyQuaternion(
      jetGroup.quaternion,
    );
    const jetRight = new this.THREE.Vector3(1, 0, 0).applyQuaternion(
      jetGroup.quaternion,
    );
    const jetUp = new this.THREE.Vector3(0, 1, 0).applyQuaternion(
      jetGroup.quaternion,
    );

    const pitchAngle = Math.asin(jetFwd.y);
    const rollAngle = Math.atan2(jetRight.y, jetUp.y);
    const pitchOffset = Math.max(-150, Math.min(150, pitchAngle * 250));

    this.dom.horizonTransform.style.transform = `rotate(${-rollAngle}rad) translateY(${pitchOffset}px)`;
  }
}
