// components/pin-screen.js
import { EventBus } from "../js/event-bus.js";

class PinScreen extends HTMLElement {
  constructor() {
    super();
    this.mode = "setup";
    this.biometricEnabled = false;
  }

  connectedCallback() {
    this.render();
    this.bindEvents();

    EventBus.on("request-pin", ({ mode, biometricEnabled }) => {
      this.mode = mode;
      this.biometricEnabled = biometricEnabled || false;
      this.update();
      this.show();
    });

    EventBus.on("auth-state-changed", ({ showPin }) => {
      this.style.display = showPin ? "flex" : "none";
    });
  }

  render() {
    this.innerHTML = `
      <link rel="stylesheet" href="../css/pin-screen.css">

      <div class="pin-wrapper">
        <div class="title" id="pinTitle">Set PIN</div>
        <div class="subtitle" id="pinSub"></div>

        <input id="pinInput" maxlength="4" inputmode="numeric" placeholder="••••" />

        <label class="bio-row hidden" id="bioRow">
          <input type="checkbox" id="bioCheck" /> Enable biometric unlock
        </label>

        <button id="pinSubmit" class="submit-btn">Continue</button>
      </div>
    `;
  }

  bindEvents() {
    this.querySelector("#pinSubmit").addEventListener("click", () => {
      const pin = this.querySelector("#pinInput").value.trim();
      const biometric = this.querySelector("#bioCheck").checked;

      EventBus.emit("pin-submit", { pin, biometric });
    });

    this.querySelector("#pinInput").addEventListener("input", (e) => {
      e.target.value = e.target.value.replace(/\D+/g, "").slice(0, 4);
    });
  }

  update() {
    const title = this.querySelector("#pinTitle");
    const subtitle = this.querySelector("#pinSub");
    const bioRow = this.querySelector("#bioRow");

    if (this.mode === "setup") {
      title.textContent = "Set a 4-digit PIN";
      subtitle.textContent = "Used to protect your app.";
      bioRow.classList.remove("hidden");
    } else {
      title.textContent = "Enter PIN";
      subtitle.textContent = "Unlock Spendrill";
      bioRow.classList.add("hidden");
    }
  }

  show() {
    this.style.display = "flex";
    this.querySelector("#pinInput").value = "";
  }
}

customElements.define("pin-screen", PinScreen);
