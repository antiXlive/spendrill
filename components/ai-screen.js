// components/ai-screen.js
import { EventBus } from "../js/event-bus.js";

class AIScreen extends HTMLElement {

  constructor() {
    super();
    this.stats = null;
  }

  connectedCallback() {
    this.render();
    this.bindEvents();

    EventBus.on("stats-ready", (stats) => {
      this.stats = stats;
      this.update();
    });

    EventBus.on("auth-state-changed", ({ showPin }) => {
      this.style.display = showPin ? "none" : "block";
    });
  }

  render() {
    this.innerHTML = `
      
      <div class="ai-container">
        <div class="title">AI Insights</div>

        <p class="desc">Your spending trends will show here.</p>

        <div class="ai-block" id="aiBlock">
          <p class="muted">Waiting for stats...</p>
        </div>
      </div>
    `;
  }

  bindEvents() {}

  update() {
    const block = this.querySelector("#aiBlock");
    if (!this.stats) return;

    const { monthlyTotal, average, topCategory } = this.stats;

    block.innerHTML = `
      <div class="ai-card">
        <div class="label">This Month</div>
        <div class="value">-$${monthlyTotal}</div>
      </div>

      <div class="ai-card">
        <div class="label">Daily Avg</div>
        <div class="value">-$${average}</div>
      </div>

      <div class="ai-card">
        <div class="label">Top Category</div>
        <div class="value">${topCategory || "–"}</div>
      </div>
    `;
  }
}

customElements.define("ai-screen", AIScreen);
