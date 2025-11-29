// components/stats-screen.js
import { EventBus } from "../js/event-bus.js";

class StatsScreen extends HTMLElement {

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
      
      <div class="stats-container">
        <div class="title">Statistics</div>

        <div class="stats-block" id="statsBlock">
          <p class="muted">Waiting for stats...</p>
        </div>
      </div>
    `;
  }

  bindEvents() {}

  update() {
    if (!this.stats) return;
    const { categoryTotals, trend } = this.stats;

    const block = this.querySelector("#statsBlock");

    const categoryHTML = Object.entries(categoryTotals)
      .map(
        ([cat, total]) => `
        <div class="stat-card">
          <div class="left">${cat}</div>
          <div class="right">-$${total}</div>
        </div>
      `
      )
      .join("");

    const trendHTML = trend
      .map(
        (t) => `
        <div class="stat-card">
          <div class="left">${t.month}</div>
          <div class="right">-$${t.total}</div>
        </div>
      `
      )
      .join("");

    block.innerHTML = `
      <div class="section-title">By Category</div>
      ${categoryHTML}

      <div class="section-title" style="margin-top: 20px">Last 3 Months</div>
      ${trendHTML}
    `;
  }
}

customElements.define("stats-screen", StatsScreen);
