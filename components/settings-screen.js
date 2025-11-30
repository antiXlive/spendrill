// components/settings-screen.js
import { EventBus } from "../js/event-bus.js";
import * as DB from "../js/db.js";
import { THEMES } from "../js/constants.js";

class SettingsScreen extends HTMLElement {
  constructor() {
    super();
    this.state = null;
  }

  connectedCallback() {
    this.render();
    this.bindEvents();

    EventBus.on("state-changed", (state) => {
      this.state = state;
      this.update();
    });

    EventBus.on("auth-state-changed", ({ showPin }) => {
      this.style.display = showPin ? "none" : "block";
    });
  }

  render() {
    this.innerHTML = `
      <div class="settings-container">
        <div class="title">Settings</div>

        <div class="settings-group">
          <div class="label">Theme</div>
          <select id="themeSelect"></select>
        </div>

        <div class="settings-group">
          <button id="backupBtn">Choose Backup Folder</button>
        </div>

        <div class="settings-group">
          <button id="exportBtn">Export JSON</button>
          <button id="importBtn">Import JSON</button>
        </div>

        <div class="settings-group">
          <button id="resetBtn" class="danger">Reset Everything (Clear All Data)</button>
        </div>
      </div>
    `;
  }

  bindEvents() {
    this.querySelector("#themeSelect").addEventListener("change", (e) => {
      EventBus.emit("theme-change", { theme: e.target.value });
    });

    this.querySelector("#backupBtn").addEventListener("click", () =>
      EventBus.emit("choose-backup-folder")
    );

    this.querySelector("#exportBtn").addEventListener("click", () =>
      EventBus.emit("export-json")
    );

    this.querySelector("#importBtn").addEventListener("click", () =>
      EventBus.emit("import-json")
    );

    this.querySelector("#resetBtn").addEventListener("click", async () => {
      if (!confirm("Are you sure? This will erase ALL data.")) return;

      await DB.wipeAll();
      location.reload(); // restart fresh
    });
  }

  update() {
    if (!this.state) return;

    const select = this.querySelector("#themeSelect");
    select.innerHTML = THEMES.map(
      (t) => `<option value="${t}" ${this.state.settings.theme === t ? "selected" : ""}>${t}</option>`
    ).join("");
  }
}

customElements.define("settings-screen", SettingsScreen);
