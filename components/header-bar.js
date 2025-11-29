// components/header-bar.js
import { EventBus } from "../js/event-bus.js";

class HeaderBar extends HTMLElement {
  constructor() {
    super();
    this.screen = "home";
  }

  connectedCallback() {
    this.render();
    this.bindEvents();

    EventBus.on("screen-changed", (screen) => {
      this.screen = screen;
      this.update();
    });

    EventBus.on("auth-state-changed", ({ showPin }) => {
      this.style.display = showPin ? "none" : "flex";
    });
  }

  render() {
    this.innerHTML = `
      <link rel="stylesheet" href="../css/header-bar.css">
      <div class="header-container">
        <div class="title">Home</div>
      </div>
    `;
  }

  bindEvents() { }

  update() {
    const titleMap = {
      home: "Home",
      ai: "AI Insights",
      stats: "Statistics",
      settings: "Settings"
    };

    this.querySelector(".title").textContent = titleMap[this.screen] || "";
  }
}

customElements.define("header-bar", HeaderBar);
