// /components/home-screen.js
// Home Screen — refined spacing, proper icon/image ratio, improved spacing.

import { EventBus } from "../js/event-bus.js";
import {
  esc,
  fmtCurrency,
  dateLabelFromKey,
  resolveIcon
} from "../js/utils.js";

import {
  getTransactionsByMonth,
  groupByDate,
  computeMiniChart,
  computeTopCategory,
  deleteTransaction
} from "../js/state-selectors.js";

import { renderMiniBarChart } from "../js/charts.js";
import { createRipple, attachLongPress, enableSwipe } from "../js/ui-interactions.js";

class HomeScreen extends HTMLElement {
  constructor() {
    super();
    this.current = new Date();
    this.tx = [];
    this.grouped = [];
    this.render();
  }

  connectedCallback() {
    this._bind();
    this._loadMonth(this.current.getFullYear(), this.current.getMonth());

    this._stateHandler = () => this._loadMonth(this.current.getFullYear(), this.current.getMonth());
    EventBus.on("state-changed", this._stateHandler);
    EventBus.on("stats-ready", this._stateHandler);

    enableSwipe(this, () => this._changeMonth(1), () => this._changeMonth(-1));
  }

  disconnectedCallback() {
    EventBus.off("state-changed", this._stateHandler);
    EventBus.off("stats-ready", this._stateHandler);
  }

  async _loadMonth(y, m) {
    try {
      this.tx = await getTransactionsByMonth(y, m);
      this.grouped = groupByDate(this.tx).map(g => ({ ...g, label: dateLabelFromKey(g.dateKey) }));
      this._render();

      const daily = computeMiniChart(this.tx);
      const chart = this.querySelector("#miniChart");
      renderMiniBarChart(chart, daily, "red");
    } catch (err) {
      console.error("HomeScreen _loadMonth failed:", err);
      this.tx = [];
      this.grouped = [];
      this._render();
    }
  }

  _changeMonth(dir) {
    const d = new Date(this.current.getFullYear(), this.current.getMonth() + dir, 1);
    this.current = d;
    this._loadMonth(d.getFullYear(), d.getMonth());
  }

  _bind() {
    this.addEventListener("click", (e) => {
      const el = e.target.closest("[data-action]");
      if (!el) return;
      const id = el.dataset.id;
      const tx = this.tx.find(t => String(t.id) === String(id));
      createRipple(e, el);
      EventBus.emit("open-entry-sheet", tx);
    });

    // Long press to delete
    this.addEventListener("touchstart", (e) => {
      const item = e.target.closest(".tx-item");
      if (!item) return;

      attachLongPress(item, () => {
        const id = item.dataset.id;
        const tx = this.tx.find(t => String(t.id) === String(id));
        if (tx && confirm(`Delete "${tx.note || tx.subName || tx.catName}"?`)) {
          item.classList.add("deleting");
          deleteTransaction(tx.id);
        }
      });
    }, { passive: true });
  }

  render() {
    this.innerHTML = `
      <div class="home-content">
        <div class="summary">
          <div class="summary-left">
            <div class="month-name" id="monthName">Month</div>
            <div class="total" id="monthTotal">₹0</div>
            <div class="meta">
              <span id="txCount"></span>
              <span class="dot">•</span>
              <span id="topCat"></span>
            </div>
          </div>
          <div class="summary-right">
            <svg class="mini-chart" id="miniChart" viewBox="0 0 160 60"></svg>
          </div>
        </div>

        <div class="swipe-hint">Swipe to change month • Long press to delete</div>

        <div id="daysList" class="days-list"></div>

        <div class="empty" id="emptyState" style="display:none;">
          <div class="empty-icon">💸</div>
          <div class="empty-title">No transactions this month</div>
          <div class="empty-subtitle">Tap + to add your first one</div>
        </div>
      </div>
    `;
  }

  _render() {
    const monthLabel = this.current.toLocaleString(undefined, { month: "long", year: "numeric" });
    this.querySelector("#monthName").textContent = monthLabel;

    const total = this.tx.reduce((s, t) => s + Number(t.amount || 0), 0);
    this.querySelector("#monthTotal").textContent = fmtCurrency(total);

    this.querySelector("#txCount").textContent = `${this.tx.length} transaction${this.tx.length !== 1 ? "s" : ""}`;
    const top = computeTopCategory(this.tx);
    this.querySelector("#topCat").textContent = top ? `${top.name} (${fmtCurrency(top.value)})` : "—";

    const daysList = this.querySelector("#daysList");
    const emptyState = this.querySelector("#emptyState");

    if (!this.grouped.length) {
      emptyState.style.display = "block";
      daysList.innerHTML = "";
      return;
    }

    emptyState.style.display = "none";
    daysList.innerHTML = "";

    for (const g of this.grouped) {
      const header = document.createElement("div");
      header.className = "day-header";
      header.innerHTML = `
        <span class="day-label">${esc(g.label)}</span>
        <span class="day-total">Σ - ${fmtCurrency(g.total)}</span>
      `;
      daysList.appendChild(header);

      const txWrapper = document.createElement("div");
      txWrapper.className = "tx-list";
      txWrapper.innerHTML = g.items.map(t => this._txHTML(t)).join("");
      daysList.appendChild(txWrapper);
    }
  }

  _txHTML(t) {
    const icon = resolveIcon(t);

    const amount = Number(t.amount || 0);
    const formatted = fmtCurrency(Math.abs(amount));

    const main = t.subName || t.catName || "Misc";
    const secondary = (t.subName && t.catName) ? t.catName : "";
    const note = t.note || "";

    const displayAmount = `-${formatted}`;

    return `
      <div class="tx-item" data-action="open-tx" data-id="${esc(t.id)}">

        <div class="tx-left">
          <div class="tx-emoji">${icon}</div>

          <div class="tx-text">
            <div class="tx-line1">
              <span class="tx-main">${esc(main)}</span>
              ${secondary ? `<span class="tx-dot">•</span><span class="tx-secondary">${esc(secondary)}</span>` : ""}
            </div>
            ${note ? `<div class="tx-note">${esc(note)}</div>` : ""}
          </div>
        </div>

        <div class="tx-amt negative">
          ${displayAmount}
        </div>
      </div>
    `;
  }
}

customElements.define("home-screen", HomeScreen);
