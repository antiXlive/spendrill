// components/tab-bar.js
import EventBus from "../js/event-bus.js";

class TabBar extends HTMLElement {
  constructor() {
    super();
    this.active = "home";
  }

  connectedCallback() {
    this.render();
    this.bindEvents();

    EventBus.on("navigated", ({ to }) => this.setActive(to));
  }

  disconnectedCallback() {
    EventBus.off("navigated");
  }

  render() {
    this.innerHTML = `
      <div class="tb-pill">

        <svg width="0" height="0">
          <defs>
            <linearGradient id="aiGradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#2563eb"/>
              <stop offset="40%" stop-color="#06b6d4"/>
              <stop offset="100%" stop-color="#2dd4bf"/>
            </linearGradient>
          </defs>
        </svg>

        <div class="tb-grid">

          <div id="tab-home" class="tb-item active">
            <svg viewBox="0 0 24 24">
              <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/>
              <path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            </svg>
            <span>Home</span>
          </div>

          <div id="tab-ai" class="tb-item">
            <svg viewBox="0 0 24 24">
              <path d="M22 12C22 17.5 17.5 22 12 22S2 17.5 2 12 6.5 2 12 2"/>
              <path d="M13 6.5C16.1 6.5 17.5 5.2 17.5 2c0 3.2 1.3 4.5 4.5 4.5-3.2 0-4.5 1.4-4.5 4.5 0-3.1-1.4-4.5-4.5-4.5z"/>
            </svg>
            <span>AI</span>
          </div>

          <div class="tb-center">
            <button id="tab-add" class="tb-fab">
              <svg viewBox="0 0 24 24">
                <path d="M12 4v16"/>
                <path d="M4 12h16"/>
              </svg>
            </button>
          </div>

          <div id="tab-stats" class="tb-item">
            <svg viewBox="0 0 24 24">
              <path d="M21 12c.55 0 1-.45.95-.998A10 10 0 0 0 13 2.05c-.55-.05-1 .4-1 .95v8a1 1 0 0 0 1 1z"/>
              <path d="M21.21 15.89A10 10 0 1 1 8 2.83"/>
            </svg>
            <span>Stats</span>
          </div>

          <div id="tab-settings" class="tb-item">
            <svg viewBox="0 0 24 24">
              <path d="M9.7 4.13a2.34 2.34 0 0 1 4.66 0 2.34 2.34 0 0 0 3.32 1.92 2.34 2.34 0 0 1 2.33 4.03 2.34 2.34 0 0 0 0 3.83 2.34 2.34 0 0 1-2.33 4.03 2.34 2.34 0 0 0-3.32 1.92 2.34 2.34 0 0 1-4.66 0 2.34 2.34 0 0 0-3.32-1.92 2.34 2.34 0 0 1-2.33-4.03 2.34 2.34 0 0 0 0-3.83A2.34 2.34 0 0 1 6.35 6.05a2.34 2.34 0 0 0 3.32-1.92"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            <span>Settings</span>
          </div>

        </div>
      </div>
    `;
  }

  bindEvents() {
    this.querySelector("#tab-home").onclick = () => this.activate("home");
    this.querySelector("#tab-ai").onclick   = () => this.activate("ai");
    this.querySelector("#tab-stats").onclick= () => this.activate("stats");
    this.querySelector("#tab-settings").onclick = () => this.activate("settings");

    this.querySelector("#tab-add").onclick = () => {
      this.querySelector("#tab-add").classList.add("tap");
      setTimeout(() => this.querySelector("#tab-add").classList.remove("tap"), 180);
      EventBus.emit("open-entry-sheet", {});
    };
  }

  activate(to) {
    EventBus.emit("navigate", { to });
    this.setActive(to);
  }

  setActive(tab) {
    this.querySelectorAll(".tb-item").forEach(e => e.classList.remove("active"));
    const el = this.querySelector(`#tab-${tab}`);
    if (el) el.classList.add("active");
  }
}

customElements.define("tab-bar", TabBar);
export default TabBar;