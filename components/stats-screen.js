import { EventBus } from "../js/event-bus.js";
import { esc, fmtCurrency } from "../js/utils.js";
import { computeStats, computeSubStats } from "../js/state-selectors.js";
import StateModule from "../js/state.js";
import { renderDonutChart } from "../js/charts.js";

class StatsScreen extends HTMLElement {
  constructor() {
    super();

    this.stats = null;
    this.txList = [];
    this.categoryMap = new Map();

    this.level = "category";
    this.selectedCategory = null;
    this.selectedCategoryIndex = null;

    this._donutId = `donut-${Math.random().toString(36).slice(2)}`;
  }

  connectedCallback() {
    this.render();

    this._loadCategoryIcons();

    EventBus.on("stats-ready", (txList) => {
      this.txList = txList;
      this.stats = computeStats(txList);
      this.stats.txList = txList;

      this.isLoading = false;
      this.level = "category";
      this.selectedCategory = null;
      this.selectedCategoryIndex = null;

      this.update();
    });

    this.update();
  }

  async _loadCategoryIcons() {
    const snap = await StateModule.loadSnapshot();

    this.categoryMap.clear();
    (snap.categories || []).forEach((cat) => {
      this.categoryMap.set(cat.name, {
        emoji: cat.emoji,
        image: cat.image
      });
    });
  }

  render() {
    this.innerHTML = `
      <div class="stats-container">

        <div class="stats-hdr">
          <div class="hdr-left">
            <button class="back-btn" style="display:none;">
              <svg width="18" height="18" viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="2">
                <path d="M15 6l-6 6 6 6" />
              </svg>
              <span>Back</span>
            </button>
          </div>

          <div class="hdr-center">
            <h1 id="pageTitle">Statistics</h1>
            <p id="pageSubtitle">Tap any category to see details</p>
          </div>

          <div class="hdr-right"></div>
        </div>

        <div class="chart-card">
          <div class="donut-wrapper">
            <svg id="${this._donutId}" class="donut-chart" viewBox="0 0 200 200"></svg>

            <div class="donut-center">
              <div id="centerAmount" class="center-amount">₹0</div>
              <div id="centerLabel" class="center-label">Total Spending</div>
            </div>
          </div>

          <button class="drill-btn" style="display:none;">
            <span>View Breakdown</span>
            <svg width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="2">
              <path d="M9 6l6 6-6 6"/>
            </svg>
          </button>
        </div>

        <div id="breakdownList"></div>

      </div>
    `;
  }

  update() {
    if (!this.stats || this.isLoading) return;

    if (this.level === "category") {
      this._drawCategoryLevel();
    } else {
      this._drawSubcategoryLevel();
    }
  }

  /* ---------------------------------------------------------
     CATEGORY LEVEL
  --------------------------------------------------------- */
  _drawCategoryLevel() {
    const donut = this.querySelector(`#${this._donutId}`);
    const drillBtn = this.querySelector(".drill-btn");
    const backBtn = this.querySelector(".back-btn");
    const list = this.querySelector("#breakdownList");

    const title = this.querySelector("#pageTitle");
    const subtitle = this.querySelector("#pageSubtitle");

    title.textContent = "Statistics";
    subtitle.textContent = "Tap any category to see details";

    backBtn.style.display = "none";
    drillBtn.style.display = "none";

    const { total, categories } = this.stats;

    this._setCenter(total, "Total Spending");

    renderDonutChart(donut, categories, {
      onSliceClick: (cat, index) => {
        this.selectedCategory = cat;
        this.selectedCategoryIndex = index;

        this._setCenter(cat.value, cat.name);
        drillBtn.style.display = "flex";

        donut.__donut?.selectByIndex(index);
      }
    });

    // Reapply highlight if user re-renders
    if (this.selectedCategoryIndex != null) {
      donut.__donut?.selectByIndex(this.selectedCategoryIndex);
    }

    list.innerHTML = this._renderList(categories);
    
    drillBtn.onclick = () => {
      this.level = "subcategory";
      backBtn.style.display = "flex";
      drillBtn.style.display = "none";
      this.update();
    };
  }

  /* ---------------------------------------------------------
     SUBCATEGORY LEVEL
  --------------------------------------------------------- */
  _drawSubcategoryLevel() {
  const donut = this.querySelector(`#${this._donutId}`);
  const list = this.querySelector("#breakdownList");
  const backBtn = this.querySelector(".back-btn");

  const title = this.querySelector("#pageTitle");
  const subtitle = this.querySelector("#pageSubtitle");

  title.textContent = this.selectedCategory.name;
  subtitle.textContent = "Subcategory breakdown";

  const { subs, total } = computeSubStats(
    this.selectedCategory.name,
    this.txList
  );

  this._setCenter(total, "Subcategories");

  renderDonutChart(donut, subs, {
    onSliceClick: (sub, index) => {
      this._setCenter(sub.value, sub.name);
      donut.__donut?.selectByIndex(index);
    }
  });

  list.innerHTML = this._renderList(subs);

  // Back button
  backBtn.onclick = () => {
    this.level = "category";
    this.selectedCategory = null;
    this.selectedCategoryIndex = null;
    this.update();
  };

  // ⭐ NEW: Tap donut center to go back
  const center = this.querySelector(".donut-center");
  center.style.pointerEvents = "auto";
  center.onclick = () => {
    this.level = "category";
    this.selectedCategory = null;
    this.selectedCategoryIndex = null;
    this.update();
  };
}


  /* ---------------------------------------------------------
     HELPERS
  --------------------------------------------------------- */
  _setCenter(amount, label) {
    this.querySelector("#centerAmount").textContent = fmtCurrency(amount);
    this.querySelector("#centerLabel").textContent = label;
  }

  _getCategoryIcon(name) {
    const info = this.categoryMap.get(name);
    if (!info) return "💰";

    if (info.image) return `<img src="${info.image}" alt="" />`;
    if (info.emoji) return info.emoji;

    return "💰";
  }

  _renderList(items) {
    return `
      <div class="list-section">

        <div class="list-header">
          <span>Category</span>
          <span>Amount</span>
        </div>

        ${items.map((i) => `
          <div class="list-item">

            <div class="item-icon">
              ${this._getCategoryIcon(i.name)}
            </div>

            <div class="item-content">
              <div class="item-row">
                <span class="item-name">${esc(i.name)}</span>
                <span class="item-value">${fmtCurrency(i.value)}</span>
              </div>

              <div class="bar-row">
                <div class="bar">
                  <div class="bar-fill" style="width:${i.percent}%;"></div>
                </div>
                <span class="item-percent">${i.percent.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        `).join("")}

      </div>
    `;
  }
}

customElements.define("stats-screen", StatsScreen);
