// components/header-bar.js
import { EventBus } from "../js/event-bus.js";

class HeaderBar extends HTMLElement {
  constructor() {
    super();
    this.screen = "home";
    this._scrollHandler = null;
  }

  connectedCallback() {
    this.render();
    this.bindEvents();
    this.setupScrollDetection();

    EventBus.on("screen-changed", (screen) => this.update(screen));
    EventBus.on("navigated", ({ to }) => this.update(to));
    EventBus.on("auth-state-changed", (s) => this.visibility(s));
  }

  disconnectedCallback() {
    if (this._scrollHandler) {
      const currentScreen = document.querySelector('[data-screen]:not([hidden])');
      if (currentScreen) {
        currentScreen.removeEventListener('scroll', this._scrollHandler);
      }
    }
  }

  render() {
    this.innerHTML = `
      <header id="header-bar">
        <div class="header-inner">
          <div id="header-title">Home</div>

          <div class="header-actions">
            <button id="btn-search" class="header-btn" aria-label="Search">🔍</button>
            <button id="btn-more" class="header-btn" aria-label="More options">⋮</button>
          </div>
        </div>
      </header>
    `;
  }

  bindEvents() {
    const searchBtn = this.querySelector("#btn-search");
    const moreBtn = this.querySelector("#btn-more");

    if (searchBtn) searchBtn.addEventListener("click", () => EventBus.emit("header-search"));
    if (moreBtn) moreBtn.addEventListener("click", () => EventBus.emit("header-menu"));
  }

  setupScrollDetection() {
    const header = this.querySelector("#header-bar");
    if (!header) return;

    this._scrollHandler = () => {
      const currentScreen = document.querySelector('[data-screen]:not([hidden])');
      if (!currentScreen) return;

      const scrollTop = currentScreen.scrollTop;
      
      if (scrollTop > 10) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    };

    // Attach to current visible screen
    const attachScrollListener = () => {
      const currentScreen = document.querySelector('[data-screen]:not([hidden])');
      if (currentScreen) {
        currentScreen.addEventListener('scroll', this._scrollHandler, { passive: true });
      }
    };

    attachScrollListener();

    // Re-attach when screen changes
    EventBus.on('navigated', () => {
      // Remove from all screens
      document.querySelectorAll('[data-screen]').forEach(screen => {
        screen.removeEventListener('scroll', this._scrollHandler);
      });
      // Attach to new visible screen
      attachScrollListener();
    });
  }

  update(screen) {
    this.screen = screen;

    const titleMap = {
      home: "Home",
      ai: "AI Insights",
      stats: "Statistics",
      settings: "Settings",
    };

    const titleEl = this.querySelector("#header-title");
    if (titleEl) titleEl.textContent = titleMap[this.screen] || "Spendrill";
  }

  visibility(authState) {
    const isPinVisible = authState?.showPin === true;
    this.style.display = isPinVisible ? "none" : "block";
  }
}

customElements.define("header-bar", HeaderBar);