// components/tab-bar.js
import { EventBus } from "../js/event-bus.js";

class TabBar extends HTMLElement {
  constructor() {
    super();
    this.active = "home";
  }

  connectedCallback() {
    this.render();
    this.bindEvents();

    EventBus.on("screen-changed", (screen) => {
      this.setActive(screen);
    });

    EventBus.on("auth-state-changed", ({ showPin }) => {
      this.style.display = showPin ? "none" : "flex";
    });
  }

  render() {
    this.innerHTML = `
      
      <div class="tab-pill">

        <!-- Home -->
        <div class="tab-item" data-tab="home">
          <svg viewBox="0 0 24 24">
            <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/>
            <path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          </svg>
          <span>Home</span>
        </div>

        <!-- AI -->
        <div class="tab-item" data-tab="ai">
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" />
            <path d="M13 6.5c3.1 0 4.5-1.3 4.5-4.5 0 3.2 1.4 4.5 4.5 4.5-3.1 0-4.5 1.4-4.5 4.5 0-3.1-1.4-4.5-4.5-4.5z"/>
          </svg>
          <span>AI</span>
        </div>

        <!-- FAB -->
        <div class="fab-wrapper">
          <div class="fab-btn" id="fab">
            <svg viewBox="0 0 24 24">
              <path d="M12 4v16"/>
              <path d="M4 12h16"/>
            </svg>
          </div>
        </div>

        <!-- Stats -->
        <div class="tab-item" data-tab="stats">
          <svg viewBox="0 0 24 24">
            <path d="M21 12c.55 0 1-.45.95-.99a10 10 0 0 0-9-8.96C12.4 2 12 2.45 12 3v8a1 1 0 0 0 1 1h8z"/>
            <path d="M21.21 15.89A10 10 0 1 1 8 2.83"/>
          </svg>
          <span>Stats</span>
        </div>

        <!-- Settings -->
        <div class="tab-item" data-tab="settings">
          <svg viewBox="0 0 24 24">
            <path d="M9.7 4.1a2.3 2.3 0 0 1 4.6 0 2.3 2.3 0 0 0 3.3 1.9 2.3 2.3 0 0 1 2.3 4 2.3 2.3 0 0 0 0 3.8 2.3 2.3 0 0 1-2.3 4 2.3 2.3 0 0 0-3.3 1.9 2.3 2.3 0 0 1-4.6 0 2.3 2.3 0 0 0-3.3-1.9 2.3 2.3 0 0 1-2.3-4 2.3 2.3 0 0 0 0-3.8A2.3 2.3 0 0 1 6.4 6a2.3 2.3 0 0 0 3.3-1.9"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          <span>Settings</span>
        </div>

      </div>
    `;
  }

  bindEvents() {
    this.querySelectorAll(".tab-item").forEach((tab) => {
      tab.addEventListener("click", () => {
        const screen = tab.dataset.tab;
        EventBus.emit("navigate", { screen });
      });
    });

    const fab = this.querySelector("#fab");
    fab.addEventListener("click", () => {
      fab.classList.remove("tap");
      void fab.offsetWidth; // reflow
      fab.classList.add("tap");
      EventBus.emit("open-entry-sheet", {});
    });
  }

  setActive(tab) {
    this.active = tab;

    this.querySelectorAll(".tab-item").forEach((t) => {
      const isActive = t.dataset.tab === tab;
      t.classList.toggle("active", isActive);
    });
  }
}

customElements.define("tab-bar", TabBar);
