// components/stats-screen.js
import { EventBus } from "../js/event-bus.js";

class StatsScreen extends HTMLElement {
  constructor() {
    super();
    this.stats = null;
    this.isLoading = true;

    this._donutId = `donutChart-${Math.random().toString(36).slice(2)}`;

    // FIX: stats-ready sends stats directly, not { payload }
    this._onStatsReady = (stats) => {
      this.stats = stats;
      this.isLoading = false;
      this.update();
    };

    this._onAuthState = ({ showPin }) => {
      this.style.display = showPin ? "none" : "block";
    };
  }

  connectedCallback() {
    this.render();
    EventBus.on("stats-ready", this._onStatsReady);
    EventBus.on("auth-state-changed", this._onAuthState);

    // Render initial empty state if no stats yet
    this.update();
  }

  disconnectedCallback() {
    EventBus.off("stats-ready", this._onStatsReady);
    EventBus.off("auth-state-changed", this._onAuthState);
  }

  render() {
    this.innerHTML = `
      <div class="stats-container">
        <div class="stats-header">
          <h1 class="stats-title">Statistics</h1>
          <p class="stats-subtitle">Your spending overview</p>
        </div>

        <div class="stats-content" id="statsBlock">
          <div class="stats-loading">
            <div class="loading-spinner"></div>
            <p>Loading your statistics...</p>
          </div>
        </div>
      </div>
    `;
  }

  update() {
    const block = this.querySelector("#statsBlock");
    if (!block) return;

    // Still loading?
    if (this.isLoading && !this.stats) return;

    if (!this.stats || !Object.keys(this.stats.categoryTotals || {}).length) {
      block.innerHTML = this.getEmptyState();
      return;
    }

    const { categoryTotals = {}, average = 0, topCategory = null } = this.stats;

    const sanitized = Object.fromEntries(
      Object.entries(categoryTotals).map(([k, v]) => [k, Number(v) || 0])
    );

    const total = Object.values(sanitized).reduce((s, v) => s + v, 0);
    const sorted = Object.entries(sanitized).sort((a, b) => b[1] - a[1]);

    block.innerHTML = `
      ${this.buildSummaryCard(total, sorted.length, average, topCategory)}
      ${this.buildDonutChart(sorted, total)}
      ${this.buildCategoryList(sorted, total)}
    `;

    requestAnimationFrame(() => this.drawDonutChart(sorted, total));
  }

  // -------------------------
  // COMPONENT BUILDERS
  // -------------------------

  buildSummaryCard(total, count, average, topCategory) {
    const nf = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });

    return `
      <div class="summary-card">
        <div class="summary-header">
          <div class="summary-icon">
            <svg viewBox="0 0 24 24" width="28" height="28">
              <path d="M21 12c.55 0 1-.45.95-.998A10 10 0 0 0 13 2.05c-.55-.05-1 .4-1 .95v8a1 1 0 0 0 1 1z"/>
              <path d="M21.21 15.89A10 10 0 1 1 8 2.83"/>
            </svg>
          </div>
          <div class="summary-main">
            <div class="summary-label">Total Spending</div>
            <div class="summary-amount">$${nf.format(total)}</div>
          </div>
        </div>

        <div class="summary-stats">
          <div class="summary-stat">
            <div class="stat-label">Categories</div>
            <div class="stat-value">${count}</div>
          </div>
          <div class="summary-divider"></div>
          <div class="summary-stat">
            <div class="stat-label">Avg Spend</div>
            <div class="stat-value">$${Math.round(average)}</div>
          </div>
          <div class="summary-divider"></div>
          <div class="summary-stat">
            <div class="stat-label">Top Category</div>
            <div class="stat-value">${topCategory || "N/A"}</div>
          </div>
        </div>
      </div>
    `;
  }

  buildDonutChart(categories, total) {
    const colors = [
      '#2563eb', '#06b6d4', '#2dd4bf', '#10b981',
      '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'
    ];

    const legend = categories
      .map(([cat, amount], i) => {
        const p = total ? ((amount / total) * 100).toFixed(1) : 0;
        return `
          <div class="legend-item">
            <div class="legend-color" style="background:${colors[i % colors.length]}"></div>
            <div class="legend-label">${cat}</div>
            <div class="legend-value">${p}%</div>
          </div>
        `;
      })
      .join("");

    return `
      <div class="chart-section">
        <div class="section-title">Spending by Category</div>
        <div class="donut-container">
          <div class="donut-wrapper">
            <svg class="donut-chart" viewBox="0 0 200 200" id="${this._donutId}"></svg>
            <div class="donut-center">
              <div class="donut-total">$${Math.round(total)}</div>
              <div class="donut-label">Total</div>
            </div>
          </div>
          <div class="chart-legend">${legend}</div>
        </div>
      </div>
    `;
  }

  drawDonutChart(categories, total) {
    const svg = this.querySelector(`#${this._donutId}`);
    if (!svg) return;

    svg.innerHTML = "";

    const colors = [
      '#2563eb', '#06b6d4', '#2dd4bf', '#10b981',
      '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'
    ];

    const radius = 90;
    const circ = 2 * Math.PI * radius;
    let angle = -90;

    // Base ring
    const base = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    base.setAttribute("cx", 100);
    base.setAttribute("cy", 100);
    base.setAttribute("r", radius);
    base.setAttribute("fill", "none");
    base.setAttribute("stroke", "rgba(255,255,255,0.05)");
    base.setAttribute("stroke-width", 30);
    svg.appendChild(base);

    if (!total) return;

    categories.slice(0, 8).forEach(([cat, amt], i) => {
      const pct = amt / total;
      const arc = pct * circ;
      const a = pct * 360;

      const slice = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      slice.setAttribute("cx", 100);
      slice.setAttribute("cy", 100);
      slice.setAttribute("r", radius);
      slice.setAttribute("fill", "none");
      slice.setAttribute("stroke", colors[i % colors.length]);
      slice.setAttribute("stroke-width", 30);
      slice.setAttribute("stroke-dasharray", `${arc} ${circ}`);
      slice.setAttribute("transform", `rotate(${angle} 100 100)`);
      svg.appendChild(slice);

      angle += a;
    });
  }

  buildCategoryList(categories, total) {
    return `
      <div class="categories-section">
        <div class="section-title">All Categories</div>
        <div class="categories-list">
          ${categories
            .map(([cat, amount]) => {
              const p = total ? ((amount / total) * 100).toFixed(1) : 0;
              return `
                <div class="category-item">
                  <div class="category-header">
                    <div class="category-info">
                      <span class="category-name">${cat}</span>
                    </div>
                    <div class="category-amounts">
                      <span class="category-amount">$${amount.toFixed(2)}</span>
                      <span class="category-percent">${p}%</span>
                    </div>
                  </div>
                  <div class="category-bar">
                    <div class="category-bar-fill" style="width:${p}%"></div>
                  </div>
                </div>
              `;
            })
            .join("")}
        </div>
      </div>
    `;
  }

  getEmptyState() {
    return `
      <div class="stats-empty">
        <svg viewBox="0 0 24 24" width="48" height="48">
          <circle cx="12" cy="12" r="10" fill="rgba(255,255,255,0.04)"/>
          <path d="M12 6v6l4 2" stroke="currentColor" stroke-width="1.5" fill="none"/>
        </svg>
        <h3>No Data Yet</h3>
        <p>Start adding expenses to see your statistics</p>
      </div>
    `;
  }
}

customElements.define("stats-screen", StatsScreen);
