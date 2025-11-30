// components/home-screen.js
// Full fixed version — works with new StateModule.loadSnapshot()
// No Shadow DOM. External CSS loaded from ../css/home-screen.css

import { EventBus } from "../js/event-bus.js";
import StateModule from "../js/state.js";

class HomeScreen extends HTMLElement {
  constructor() {
    super();

    this.current = new Date();
    this.tx = [];
    this.grouped = [];
    this._touch = { x: 0, y: 0, start: 0 };
    this._isAnimating = false;
    this._longPressTimer = null;
    this._onScrollBound = null;
    this._currentYearMonth = null;

    this.render();
  }

  connectedCallback() {
    this._bind();

    // initial load
    this._loadMonth(this.current.getFullYear(), this.current.getMonth());

    // auto-refresh on state changes
    this._stateChangedHandler = () => {
      this._loadMonth(this.current.getFullYear(), this.current.getMonth());
    };

    EventBus.on("state-changed", this._stateChangedHandler);
    EventBus.on("stats-ready", this._stateChangedHandler);

    this._onScrollBound = this._onScroll.bind(this);
    this.addEventListener("scroll", this._onScrollBound, { passive: true });
  }

  disconnectedCallback() {
    try {
      EventBus.off("state-changed", this._stateChangedHandler);
      EventBus.off("stats-ready", this._stateChangedHandler);
    } catch {}

    if (this._onScrollBound) {
      this.removeEventListener("scroll", this._onScrollBound);
    }
    if (this._longPressTimer) clearTimeout(this._longPressTimer);
  }

  /* --------------------------
     Currency util
  --------------------------- */
  _fmtCurrency(n) {
    try {
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0
      }).format(n);
    } catch {
      return "₹" + Math.round(n);
    }
  }

  _dateKey(iso) {
    return iso.slice(0, 10);
  }

  _labelFromKey(key) {
    const date = new Date(key);
    const today = new Date();
    const yest = new Date();
    yest.setDate(today.getDate() - 1);

    today.setHours(0, 0, 0, 0);
    yest.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    if (date.getTime() === today.getTime()) return "Today";
    if (date.getTime() === yest.getTime()) return "Yesterday";

    return date
      .toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })
      .replace(",", "");
  }

  _esc(s = "") {
    return String(s).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  }

  /* --------------------------
     LOAD MONTH (FIXED VERSION)
  --------------------------- */
  async _loadMonth(y, m) {
    const ym = `${y}-${String(m + 1).padStart(2, "0")}`;
    this._currentYearMonth = ym;

    try {
      // Load enriched snapshot with catName, subName, emoji
      const snapshot = await StateModule.loadSnapshot();
      const all = snapshot.transactions || [];

      // filter transactions for this month
      const txs = all.filter((t) => t.date && t.date.startsWith(ym));

      this.tx = txs.sort((a, b) => new Date(b.date) - new Date(a.date));
      this._groupByDate();
      this._render();
    } catch (err) {
      console.error("HomeScreen _loadMonth failed:", err);
      this.tx = [];
      this.grouped = [];
      this._render();
    }
  }

  _groupByDate() {
    const map = new Map();

    for (const t of this.tx) {
      const k = this._dateKey(t.date);
      if (!map.has(k)) map.set(k, { dateKey: k, items: [], total: 0 });

      const g = map.get(k);
      g.items.push(t);
      g.total += Number(t.amount || 0);
    }

    this.grouped = [...map.values()]
      .sort((a, b) => new Date(b.dateKey) - new Date(a.dateKey))
      .map((g) => ({ ...g, label: this._labelFromKey(g.dateKey) }));
  }

  /* --------------------------
     BIND EVENTS
  --------------------------- */
  _bind() {
    this.addEventListener("touchstart", (e) => this._onTouchStart(e), { passive: true });
    this.addEventListener("touchmove", (e) => this._onTouchMove(e), { passive: true });
    this.addEventListener("touchend", () => this._onTouchEnd(), { passive: true });

    this.addEventListener("click", (e) => {
      const el = e.target.closest("[data-action]");
      if (!el) return;
      const id = el.dataset.id;
      const tx = this.tx.find((t) => String(t.id) === String(id));
      this._createRipple(e, el);
      EventBus.emit("open-entry-sheet", tx || {});
    });
  }

  _onTouchStart(e) {
    const t = e.touches[0];
    this._touch.start = t.clientX;
    this._touch.x = t.clientX;
    this._touch.y = t.clientY;

    const item = e.target.closest(".tx-item");
    if (item && item.dataset.id) this._setupLongPress(item);
  }

  _onTouchMove(e) {
    const t = e.touches[0];
    const dx = Math.abs(t.clientX - this._touch.start);
    const dy = Math.abs(t.clientY - this._touch.y);

    if (dx > 10 || dy > 10) this._cancelLongPress();

    this._touch.x = t.clientX;
    this._touch.y = t.clientY;
  }

  _onTouchEnd() {
    this._cancelLongPress();
    if (this._isAnimating) return;

    const dx = this._touch.x - this._touch.start;
    if (dx < -60) this._changeMonth(-1);
    else if (dx > 60) this._changeMonth(1);
  }

  _changeMonth(dir) {
    if (this._isAnimating) return;
    this._isAnimating = true;

    const d = new Date(this.current.getFullYear(), this.current.getMonth() + dir, 1);
    this.current = d;

    const daysList = this.querySelector("#daysList");
    if (daysList) {
      daysList.style.opacity = "0";
      daysList.style.transform = `translateX(${dir * 20}px)`;
    }

    setTimeout(() => {
      this._loadMonth(d.getFullYear(), d.getMonth());

      setTimeout(() => {
        if (daysList) {
          daysList.style.transition = "all .3s ease";
          daysList.style.opacity = "1";
          daysList.style.transform = "translateX(0)";
        }
        setTimeout(() => {
          if (daysList) daysList.style.transition = "";
          this._isAnimating = false;
        }, 300);
      }, 50);
    }, 150);

    if (navigator.vibrate) navigator.vibrate(10);
  }

  _setupLongPress(el) {
    this._cancelLongPress();
    el.classList.add("pressing");

    this._longPressTimer = setTimeout(() => {
      const id = el.dataset.id;
      const tx = this.tx.find((t) => String(t.id) === String(id));

      if (navigator.vibrate) navigator.vibrate(50);
      if (tx && confirm(`Delete "${tx.note || tx.catName || tx.subName || "transaction"}"?`)) {
        el.classList.add("deleting");
        EventBus.emit("tx-delete", { id: tx.id });
      }

      el.classList.remove("pressing");
    }, 700);
  }

  _cancelLongPress() {
    if (this._longPressTimer) clearTimeout(this._longPressTimer);
    this._longPressTimer = null;

    this.querySelectorAll(".tx-item.pressing").forEach((el) => el.classList.remove("pressing"));
  }

  _createRipple(e, el) {
    const r = el.getBoundingClientRect();
    const ripple = document.createElement("span");
    ripple.className = "ripple";
    ripple.style.left = e.clientX - r.left + "px";
    ripple.style.top = e.clientY - r.top + "px";
    el.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  }

  _onScroll() {
    const y = this.scrollTop || 0;
    const summary = this.querySelector(".summary");
    if (!summary) return;

    const c = Math.min(y, 140);
    const translate = c * 0.25;
    const scale = 1 - c / 1200;
    const opacity = 1 - Math.min(c / 400, 0.2);

    summary.style.transform = `translateY(${translate}px) scale(${scale})`;
    summary.style.opacity = opacity;
  }

  /* --------------------------
     Render base DOM
     ⚠️ NO data-screen here - it's on the element itself in HTML
  --------------------------- */
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

  /* --------------------------
     Render dynamic month data
  --------------------------- */
  _render() {
    const monthName = this.querySelector("#monthName");
    const monthTotalEl = this.querySelector("#monthTotal");
    const txCount = this.querySelector("#txCount");
    const topCat = this.querySelector("#topCat");
    const miniChart = this.querySelector("#miniChart");
    const daysList = this.querySelector("#daysList");
    const emptyState = this.querySelector("#emptyState");

    const monthLabel = this.current.toLocaleString(undefined, {
      month: "long",
      year: "numeric"
    });
    monthName.textContent = monthLabel;

    const total = this.tx.reduce((s, t) => s + Number(t.amount || 0), 0);
    monthTotalEl.textContent = this._fmtCurrency(total);

    txCount.textContent = `${this.tx.length} transaction${this.tx.length !== 1 ? "s" : ""}`;
    topCat.textContent = `Top: ${this._topCategoryText()}`;

    const daily = this.grouped.map((g) => g.total).slice(0, 12).reverse();
    miniChart.innerHTML = this._renderMiniChart(daily);

    daysList.innerHTML = "";
    if (!this.grouped.length) {
      emptyState.style.display = "block";
      return;
    }

    emptyState.style.display = "none";

    for (const g of this.grouped) {
      const header = document.createElement("div");
      header.className = "day-header";
      if (g.label === "Today") header.classList.add("today");
      header.innerHTML = `
        <span class="day-label">${this._esc(g.label)}</span>
        <span class="day-total">${this._fmtCurrency(g.total)}</span>
      `;
      daysList.appendChild(header);

      const txWrapper = document.createElement("div");
      txWrapper.className = "tx-list";

      txWrapper.innerHTML = g.items
        .map((t) => {
          const amtClass = Number(t.amount) < 0 ? "negative" : "";
          const emoji = t.emoji || "🧾";
          return `
            <div class="tx-item" data-action="open-tx" data-id="${this._esc(t.id)}" tabindex="0">
              <div class="tx-left">
                <div class="tx-emoji">${emoji}</div>
                <div class="tx-meta">
                  <div class="tx-cat">${this._esc(t.catName || "Uncategorized")}</div>
                  ${t.subName ? `<div class="tx-subcat">${this._esc(t.subName)}</div>` : ""}
                  ${t.note ? `<div class="tx-note">${this._esc(t.note)}</div>` : ""}
                </div>
              </div>
              <div class="tx-amt ${amtClass}">
                ${this._fmtCurrency(Number(t.amount || 0))}
              </div>
            </div>
          `;
        })
        .join("");

      daysList.appendChild(txWrapper);
    }
  }

  _topCategoryText() {
    const map = new Map();
    for (const t of this.tx) {
      const k = t.catName || "Uncategorized";
      map.set(k, (map.get(k) || 0) + Number(t.amount || 0));
    }
    const arr = [...map.entries()].sort((a, b) => b[1] - a[1]);
    if (!arr.length) return "—";
    const [name, val] = arr[0];
    return `${name} (${this._fmtCurrency(val)})`;
  }

  _renderMiniChart(values) {
    if (!values.length) return "";
    const w = 160,
      h = 60,
      pad = 6;
    const max = Math.max(...values, 1);
    const step = w / values.length;

    let html = `
      <defs>
        <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:rgba(37,99,235,0.9);" />
          <stop offset="100%" style="stop-color:rgba(37,99,235,0.3);" />
        </linearGradient>
      </defs>
    `;

    values.forEach((v, i) => {
      const barW = Math.max(4, Math.floor(step * 0.7));
      const x = Math.floor(i * step) + Math.floor((step - barW) / 2);
      const barH = Math.round((v / max) * (h - pad * 2));
      const y = h - pad - barH;
      html += `<rect x="${x}" y="${y}" width="${barW}" height="${barH}" rx="4" fill="url(#chartGradient)" />`;
    });

    return html;
  }
}

customElements.define("home-screen", HomeScreen);