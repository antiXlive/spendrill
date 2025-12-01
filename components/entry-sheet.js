// components/entry-sheet.js
// Premium Entry Sheet (light DOM) — uses global theme tokens and EventBus only

import EventBus from "../js/event-bus.js";

class EntrySheet extends HTMLElement {
  constructor() {
    super();

    // internal state
    this.tx = null;
    this._categories = [];
    this._selected = { catId: null, subId: null };
    this._bodyOverflow = null;
    this._tabBarDisplay = null;
    this._keydownHandler = null;
  }

  connectedCallback() {
    this.render();
    this._bindElements();
    this._bindEvents();

    // Open entry sheet - handles both add and edit
    EventBus.on("open-entry-sheet", (tx) => {
      if (tx && tx.id) {
        this._openForEdit(tx);
      } else {
        this._openForAdd();
      }
    });

    // When asked to edit, request tx from main
    EventBus.on("edit-entry", ({ id }) => {
      EventBus.emit("request-tx-by-id", { id });
    });

    // When tx is returned from app.js/db
    EventBus.on("tx-by-id", ({ tx }) => {
      if (!tx) return;
      this._openForEdit(tx);
    });

    // Keep categories fresh (state sends a full state object)
    EventBus.on("state-changed", (state) => {
      if (!state) return;
      this._categories = Array.isArray(state.categories) ? state.categories : [];
      this._renderCategories();
    });

    // Hide sheet when auth displays PIN
    EventBus.on("auth-state-changed", ({ showPin }) => {
      if (showPin) this._forceClose();
    });
  }

  disconnectedCallback() {
    try {
      EventBus.off("open-entry-sheet");
      EventBus.off("edit-entry");
      EventBus.off("tx-by-id");
      EventBus.off("state-changed");
      EventBus.off("auth-state-changed");
    } catch (e) {}

    // Clean up document event listener
    if (this._keydownHandler) {
      document.removeEventListener("keydown", this._keydownHandler);
    }
  }

  render() {
    this.innerHTML = `
      <div class="es-overlay" id="esOverlay" aria-hidden="true"></div>

      <div class="es-sheet" id="esSheet" role="dialog" aria-modal="true" aria-labelledby="esTitle">
        <div class="es-handle" aria-hidden="true"></div>

        <div class="es-header">
          <h2 id="esTitle" class="es-title">Add Transaction</h2>
        </div>

        <div class="es-card">
          <label class="es-label" for="esAmount">Amount</label>
          <input id="esAmount" type="number" inputmode="decimal" step="0.01" placeholder="0.00" autocomplete="off"/>
        </div>

        <div class="es-card es-date" id="esDateCard">
          <label class="es-label">Date</label>
          <input id="esDate" type="date" />
        </div>

        <div class="es-card" id="esCatCard">
          <div class="es-cat-field" id="esCatField" tabindex="0" role="button" aria-expanded="false" aria-controls="esCatPicker">
            <div>
              <div class="es-label">Category</div>
              <div id="esCatLabel" class="es-cat-label">Select category</div>
            </div>
            <div class="es-cat-arrow">›</div>
          </div>

          <div class="es-cat-picker" id="esCatPicker" aria-hidden="true">
            <div class="es-cat-list" id="esCatList"></div>
            <div class="es-sub-list" id="esSubList"><div class="es-empty">Select a category</div></div>
          </div>
        </div>

        <div class="es-card">
          <label class="es-label" for="esNote">Note (optional)</label>
          <textarea id="esNote" placeholder="Add a short note..."></textarea>
        </div>
      </div>

      <div class="es-actions" id="esActions" aria-hidden="true">
        <button class="es-btn es-cancel" id="esCancel">Cancel</button>
        <button class="es-btn es-delete" id="esDelete" style="display:none">Delete</button>
        <button class="es-btn es-save" id="esSave">Save</button>
      </div>
    `;
  }

  _bindElements() {
    this.$overlay = this.querySelector("#esOverlay");
    this.$sheet = this.querySelector("#esSheet");
    this.$actions = this.querySelector("#esActions");

    this.$amount = this.querySelector("#esAmount");
    this.$date = this.querySelector("#esDate");
    this.$dateCard = this.querySelector("#esDateCard");
    this.$note = this.querySelector("#esNote");

    this.$catCard = this.querySelector("#esCatCard");
    this.$catField = this.querySelector("#esCatField");
    this.$catLabel = this.querySelector("#esCatLabel");
    this.$catPicker = this.querySelector("#esCatPicker");
    this.$catList = this.querySelector("#esCatList");
    this.$subList = this.querySelector("#esSubList");

    this.$title = this.querySelector("#esTitle");
    this.$save = this.querySelector("#esSave");
    this.$delete = this.querySelector("#esDelete");
    this.$cancel = this.querySelector("#esCancel");
  }

  _bindEvents() {
    // Overlay / cancel
    this.$overlay.addEventListener("click", () => this.close());
    this.$cancel.addEventListener("click", () => this.close());

    // Date card opens native date picker
    this.$dateCard.addEventListener("click", () => {
      this.$date.showPicker?.();
      try { this.$date.focus(); } catch(e) {}
    });

    // Category toggle
    this.$catField.addEventListener("click", (e) => {
      e.stopPropagation();
      this._toggleCategoryPicker();
    });

    this.$catField.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        this._toggleCategoryPicker();
      }
    });

    // Clicking outside category picker closes it
    this.$sheet.addEventListener("click", (e) => {
      if (!this.$catPicker.contains(e.target) && !this.$catField.contains(e.target)) {
        this._closeCategoryPicker();
      }
    });

    // Save / Delete
    this.$save.addEventListener("click", () => this._handleSave());
    this.$delete.addEventListener("click", () => this._handleDelete());

    // Keyboard escape behavior on document
    this._keydownHandler = (e) => {
      if (e.key === "Escape") {
        if (this.$catPicker.classList.contains("es-show")) {
          this._closeCategoryPicker();
        } else if (this.style.display === "block") {
          this.close();
        }
      }
    };
    document.addEventListener("keydown", this._keydownHandler);
  }

  /* ---------- Category rendering & interactions ---------- */

  _renderCategories() {
    this.$catList.innerHTML = "";
    this.$subList.innerHTML = `<div class="es-empty">Select a category</div>`;

    if (!this._categories || !this._categories.length) {
      this.$catList.innerHTML = `<div class="es-empty">No categories available</div>`;
      return;
    }

    this._categories.forEach(cat => {
      const item = document.createElement("div");
      item.className = "es-cat-item";
      item.tabIndex = 0;
      item.dataset.catId = cat.id ?? cat.name;
      item.innerHTML = `
        <div class="es-cat-emoji">${cat.emoji || '🏷️'}</div>
        <div class="es-cat-name">${cat.name || 'Unnamed'}</div>
      `;
      item.addEventListener("click", () => this._onCategoryClick(cat, item));
      item.addEventListener("keydown", (e) => {
        if (e.key === "Enter") this._onCategoryClick(cat, item);
      });
      this.$catList.appendChild(item);
    });
  }

  _onCategoryClick(cat, el) {
    // highlight selected
    this.$catList.querySelectorAll(".es-cat-item").forEach(x => x.classList.remove("es-active"));
    el.classList.add("es-active");
    this._selected.catId = cat.id ?? cat.name;

    // render subcategories
    this._renderSubcategories(cat);
  }

  _renderSubcategories(cat) {
    this.$subList.innerHTML = "";

    if (!cat.subcategories || !cat.subcategories.length) {
      this.$subList.innerHTML = `<div class="es-empty">No subcategories</div>`;
      return;
    }

    cat.subcategories.forEach(sub => {
      const item = document.createElement("div");
      item.className = "es-sub-item";
      item.tabIndex = 0;
      item.innerHTML = `<div class="es-sub-name">${sub.name || 'Unnamed'}</div>`;
      item.addEventListener("click", () => this._selectCategory(cat, sub));
      item.addEventListener("keydown", (e) => { if (e.key === "Enter") this._selectCategory(cat, sub); });
      this.$subList.appendChild(item);
    });
  }

  _selectCategory(cat, sub) {
    this.tx = this.tx || {};
    this.tx.catId = cat.id ?? cat.name;
    this.tx.catName = `${cat.emoji || '🏷️'} ${cat.name}` + (sub ? ` / ${sub.name}` : '');
    this.tx.subId = sub?.id ?? null;

    this.$catLabel.textContent = this.tx.catName;
    this._closeCategoryPicker();
  }

  _toggleCategoryPicker() {
    const isOpen = this.$catPicker.classList.contains("es-show");
    if (isOpen) {
      this._closeCategoryPicker();
    } else {
      this._openCategoryPicker();
    }
  }

  _openCategoryPicker() {
    this._renderCategories();
    this.$catPicker.classList.add("es-show");
    this.$catField.classList.add("es-active");
    this.$catCard.classList.add("es-expanded");
    this.$catField.setAttribute("aria-expanded","true");
    this.$catPicker.setAttribute("aria-hidden","false");
  }

  _closeCategoryPicker() {
    this.$catPicker.classList.remove("es-show");
    this.$catField.classList.remove("es-active");
    this.$catCard.classList.remove("es-expanded");
    this.$catField.setAttribute("aria-expanded","false");
    this.$catPicker.setAttribute("aria-hidden","true");
    // reset selection highlight (keep chosen label)
    this.$catList?.querySelectorAll(".es-cat-item")?.forEach(x=>x.classList.remove("es-active"));
  }

  /* ---------- Open / Close behavior ---------- */

  _openForAdd() {
    this.tx = null;
    this._selected = { catId: null, subId: null };
    this.$title.textContent = "Add Transaction";
    this.$delete.style.display = "none";
    this.$catLabel.textContent = "Select category";
    this.$amount.value = "";
    this.$note.value = "";
    this.$date.value = new Date().toISOString().slice(0,10);

    this.open();
  }

  _openForEdit(tx) {
    this.tx = structuredClone(tx);
    this.$title.textContent = tx.id ? "Edit Transaction" : "Add Transaction";
    this.$delete.style.display = tx.id ? "block" : "none";
    this.$amount.value = tx.amount ?? "";
    this.$date.value = tx.date ? (tx.date.slice(0,10)) : new Date().toISOString().slice(0,10);
    this.$note.value = tx.note || "";
    this.$catLabel.textContent = tx.catName || "Select category";

    this.open();
  }

  open() {
    // show element
    this.style.display = "block";

    // lock body scroll & hide tab-bar (persist previous state)
    try {
      this._bodyOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";

      const tb = document.querySelector("tab-bar");
      if (tb) {
        this._tabBarDisplay = tb.style.display || "";
        tb.style.display = "none";
      }
    } catch (e) {}

    // animate in
    requestAnimationFrame(() => {
      this.$overlay.classList.add("es-show");
      this.$sheet.classList.add("es-show");
      setTimeout(() => this.$actions.classList.add("es-show"), 80);
    });

    // ensure category list is rendered with latest categories
    this._renderCategories();

    // focus amount after small delay
    setTimeout(()=>{ try{ this.$amount.focus(); this.$amount.select(); }catch(_){} }, 160);
  }

  close() {
    this._closeCategoryPicker();
    this.$actions.classList.remove("es-show");
    this.$sheet.classList.remove("es-show");
    this.$overlay.classList.remove("es-show");

    setTimeout(() => {
      this.style.display = "none";
      // restore body scroll & tab bar
      try {
        document.body.style.overflow = this._bodyOverflow || "";
        const tb = document.querySelector("tab-bar");
        if (tb) tb.style.display = this._tabBarDisplay || "";
      } catch (e) {}
      EventBus.emit("entry-close");
    }, 240); // match CSS transition
  }

  _forceClose() {
    // immediate close (no animations) for auth flow
    this.$actions.classList.remove("es-show");
    this.$sheet.classList.remove("es-show");
    this.$overlay.classList.remove("es-show");
    this.style.display = "none";
    try {
      document.body.style.overflow = this._bodyOverflow || "";
      const tb = document.querySelector("tab-bar");
      if (tb) tb.style.display = this._tabBarDisplay || "";
    } catch (e) {}
    EventBus.emit("entry-close");
  }

  /* ---------- Save / Delete ---------- */

  _handleSave() {
    const amount = parseFloat(this.$amount.value);
    const date = this.$date.value || new Date().toISOString().slice(0,10);
    const note = (this.$note.value || "").trim();

    // Validate amount
    if (!amount || amount <= 0) {
      this.$amount.focus();
      EventBus.emit("toast", { message: "Enter a valid amount", type: "error" });
      return;
    }

    // Validate category (optional but recommended)
    if (!this.tx?.catId) {
      EventBus.emit("toast", { message: "Please select a category", type: "error" });
      return;
    }

    // Simplified payload - catName is enriched by StateModule
    const payload = {
      id: this.tx?.id ?? undefined,
      amount: amount,
      date: date,
      note: note,
      catId: this.tx?.catId ?? null,
      subId: this.tx?.subId ?? null,
      createdAt: this.tx?.createdAt || new Date().toISOString()
    };

    if (payload.id) {
      EventBus.emit("tx-update", { tx: payload });
    } else {
      EventBus.emit("tx-add", { tx: payload });
    }

    this.close();
  }

  _handleDelete() {
    if (!this.tx?.id) return;
    
    const confirmMsg = `Delete "${this.tx.note || this.tx.catName || 'this transaction'}"?`;
    if (!confirm(confirmMsg)) return;
    
    EventBus.emit("tx-delete", { id: this.tx.id });
    this.close();
  }
}

customElements.define("entry-sheet", EntrySheet);
export default EntrySheet;