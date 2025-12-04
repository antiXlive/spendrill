// components/settings-screen.js
// Settings screen with horizontal theme gallery (scrollable cards)
// Works with global theme system: midnight, aqua, purple, forest, ember, sunset

import { EventBus } from "../js/event-bus.js";
import {
  initDB,
  wipeAll,
  addCategory,
  updateCategory,
  deleteCategory,
  getAllCategories,
  exportData,
  importData,
  getDBStatus,
  DBStatus
} from "../js/db.js";
import StateModule from "../js/state.js";
import { DEFAULT_CATEGORIES } from "../js/default-categories.js";

const THEMES = [
  { id: "midnight", name: "Midnight" },
  { id: "aqua", name: "Aqua" },
  { id: "purple", name: "Purple" },
  { id: "forest", name: "Forest" },
  { id: "ember", name: "Ember" },
  { id: "sunset", name: "Sunset" },
  { id: "cosmic", name: "cosmic" },
  { id: "neon", name: "neon" },
  { id: "tealglass", name: "tealglass" },
  { id: "onyx", name: "onyx" },
  { id: "crimsonnight", name: "Crimsonnight" },
  { id: "storm", name: "Storm" },

];

function uuid() {
  try { return crypto.randomUUID(); } catch { return Date.now().toString(36) + Math.random().toString(36).slice(2); }
}

class SettingsScreen extends HTMLElement {
  constructor() {
    super();
    this._categories = [];
    this._toastTimer = null;
  }

  connectedCallback() {
    // content wrapper matches home-content pattern (parent [data-screen] supplies padding)
    this.innerHTML = `
      <div class="settings-content">

        <div class="settings-header">
          <h1 class="title">Settings</h1>
          <div class="meta">Manage categories, themes, backup & security</div>
        </div>

        <div class="settings-container">

          <!-- Security -->
          <section class="card">
            <div class="card-title">Security</div>
            <div class="card-sub">Lock the app with PIN or biometric unlock</div>

            <div class="card-row">
              <div class="row-info">
                <div class="row-title">Change PIN</div>
                <div class="row-sub">Update your app unlock PIN</div>
              </div>
              <div class="row-actions">
                <button id="btn-change-pin" class="btn btn-ghost">Change</button>
              </div>
            </div>

            <div class="card-row">
              <div class="row-info">
                <div class="row-title">Biometric Unlock</div>
                <div class="row-sub">Use fingerprint / face unlock if available</div>
              </div>
              <div class="row-actions">
                <button id="btn-toggle-bio" class="btn btn-ghost">Toggle</button>
              </div>
            </div>
          </section>

          <!-- Themes -->
          <section class="card">
            <div class="card-title">Themes</div>
            <div class="card-sub">Choose a color theme — applied instantly</div>

            <div class="theme-gallery" id="themeGallery"></div>
          </section>

          <!-- Data & Backup -->
          <section class="card">
            <div class="card-title">Data & Backup</div>
            <div class="card-sub">Export / import or reset app data</div>

            <div class="card-row">
              <div class="row-info">
                <div class="row-title">Export Data</div>
                <div class="row-sub">Download JSON backup</div>
              </div>
              <div class="row-actions">
                <button id="btn-export" class="btn btn-acc">Export</button>
              </div>
            </div>

            <div class="card-row">
              <div class="row-info">
                <div class="row-title">Import Data</div>
                <div class="row-sub">Restore from JSON file</div>
              </div>
              <div class="row-actions import-wrap">
                <input id="file-import" type="file" accept="application/json" />
              </div>
            </div>

            <div class="card-row border-top">
              <div class="row-info">
                <div class="row-title">Reset All</div>
                <div class="row-sub">Delete all transactions, categories & settings</div>
              </div>
              <div class="row-actions">
                <button id="btn-reset-all" class="btn btn-danger">Reset</button>
              </div>
            </div>
          </section>

          <!-- Categories -->
          <section class="card">
            <div class="card-title">Categories</div>
            <div class="card-sub">Edit emojis, names, and subcategories</div>

            <div id="cat-mgr" class="cat-mgr-list"></div>

            <div style="margin-top:12px;">
              <button id="btn-add-cat" class="btn btn-ghost wide-btn">＋ Add Category</button>
            </div>
          </section>

          <!-- About -->
          <section class="card about-card">
            <div class="card-title">About</div>
            <div class="card-sub">Spendrill — Offline Expense Manager • dev build</div>
          </section>

        </div>
      </div>

      <div id="settings-toast" class="settings-toast" aria-live="polite" role="status"></div>
    `;

    this._bind();
    this._initialize();

    // listen for external category updates
    this._catUpdatedHandler = () => this._loadCategories();
    EventBus.on("categories-updated", this._catUpdatedHandler);
  }

  disconnectedCallback() {
    try { EventBus.off("categories-updated", this._catUpdatedHandler); } catch {}
    if (this._toastTimer) clearTimeout(this._toastTimer);
  }

  /* -------------------- Initialization -------------------- */
  async _initialize() {
    try {
      if (getDBStatus() !== DBStatus.READY) await initDB();
      await this._ensureCategoriesSeeded();
      await this._loadCategories();
      this._renderThemeGallery();
    } catch (err) {
      console.error("Settings init failed:", err);
      this._showToast("Initialization error");
    }
  }

  async _ensureCategoriesSeeded() {
    try {
      const cats = await getAllCategories();
      if (!cats || cats.length === 0) {
        for (const cat of DEFAULT_CATEGORIES) {
          const subcats = (cat.subcategories || []).map(s => ({
            name: s.name || (typeof s === "string" ? s : "")
          }));
          await addCategory({
            id: cat.id || uuid(),
            name: cat.name,
            emoji: cat.emoji || "🏷️",
            image: cat.image || "",
            subcategories: subcats
          });
        }
      }
    } catch (err) {
      console.error("Seeding categories failed:", err);
    }
  }

  async _loadCategories() {
    try {
      const cats = await getAllCategories();
      this._categories = (cats || []).map(c => ({
        id: c.id,
        name: c.name,
        emoji: c.emoji || "🏷️",
        subcategories: (c.subcategories || []).map(s => ({ id: s.id, name: s.name }))
      }));
      this._renderCategories();
    } catch (err) {
      console.error("Load categories failed:", err);
    }
  }

  /* -------------------- UI BIND -------------------- */
  _bind() {
    const $ = sel => this.querySelector(sel);

    // Theme gallery (click handlers attached dynamically)
    // Export
    $("#btn-export")?.addEventListener("click", async () => {
      try {
        const data = await exportData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `spendrill-export-${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        this._showToast("Export saved");
      } catch (err) {
        console.error("Export failed:", err);
        this._showToast("Export failed");
      }
    });

    // Import
    const fileImport = $("#file-import");
    fileImport?.addEventListener("change", async (evt) => {
      const f = evt.target.files?.[0];
      if (!f) return;
      try {
        const txt = await f.text();
        const data = JSON.parse(txt);
        const confirmClear = confirm("Replace all existing data? OK = Replace, Cancel = Merge");
        await importData(data, confirmClear);
        await this._loadCategories();
        EventBus.emit("data-imported", data);
        this._showToast("Import successful");
      } catch (err) {
        console.error("Import failed:", err);
        this._showToast("Import failed");
      } finally {
        fileImport.value = "";
      }
    });

    // Reset
    $("#btn-reset-all")?.addEventListener("click", async () => {
      if (!confirm("⚠️ Delete all data (transactions, categories, settings)?")) return;
      try {
        await wipeAll();
        this._categories = [];
        this._renderCategories();
        this._showToast("Cleared");
      } catch (err) {
        console.error("Reset failed:", err);
        this._showToast("Reset failed");
      }
    });

    // Add category
    $("#btn-add-cat")?.addEventListener("click", () => this._onAddCategory());

    // Security
    $("#btn-change-pin")?.addEventListener("click", () => EventBus.emit("request-change-pin"));
    $("#btn-toggle-bio")?.addEventListener("click", () => EventBus.emit("toggle-biometric"));
  }

  /* -------------------- Theme Gallery Rendering -------------------- */
  _renderThemeGallery() {
    const root = this.querySelector("#themeGallery");
    if (!root) return;

    const current = document.documentElement.getAttribute("data-theme") || (StateModule?.getState?.().settings?.theme) || "midnight";

    root.innerHTML = THEMES.map(t => `
      <button class="theme-card" data-theme="${t.id}" aria-pressed="${t.id === current}">
        <div class="theme-preview" data-theme="${t.id}"></div>
        <div class="theme-label">${t.name}</div>
        <div class="theme-check">${t.id === current ? "✓" : ""}</div>
      </button>
    `).join("");

    // wire up clicks
    root.querySelectorAll(".theme-card").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const id = btn.dataset.theme;
        this._applyTheme(id);
      });
    });
  }

  async _applyTheme(id) {
    try {
      // apply to document
      document.documentElement.setAttribute("data-theme", id);

      // persist via StateModule (if available)
      try {
        if (StateModule && typeof StateModule.saveSetting === "function") {
          await StateModule.saveSetting("theme", id);
        }
      } catch (err) {
        console.warn("Failed to persist theme via StateModule:", err);
      }

      // notify app
      EventBus.emit("theme-change", { theme: id });

      // update gallery UI
      this._renderThemeGallery();

      this._showToast("Theme applied");
    } catch (err) {
      console.error("Apply theme failed:", err);
      this._showToast("Theme apply failed");
    }
  }

  /* -------------------- Categories rendering -------------------- */
  _renderCategories() {
    const cont = this.querySelector("#cat-mgr");
    if (!cont) return;
    cont.innerHTML = "";

    if (!this._categories.length) {
      cont.innerHTML = `<div class="empty">No categories yet — add one</div>`;
      return;
    }

    this._categories.forEach((c, idx) => {
      const row = document.createElement("div");
      row.className = "cat-row";

      const subPreview = (c.subcategories || []).map(s => s.name).slice(0, 3).join(", ");
      const more = (c.subcategories || []).length > 3 ? "…" : "";

      row.innerHTML = `
        <div class="cat-main">
          <button class="emoji-btn" data-idx="${idx}">${this._esc(c.emoji)}</button>
          <div class="cat-info">
            <div class="cat-name">${this._esc(c.name)}</div>
            <div class="cat-subtext">${this._esc(subPreview)}${more}</div>
          </div>
        </div>

        <div class="cat-actions">
          <button class="btn btn-ghost btn-edit" data-idx="${idx}">Edit</button>
          <button class="btn btn-ghost btn-subs" data-idx="${idx}">Subs</button>
          <button class="btn btn-danger btn-delete" data-idx="${idx}">Delete</button>
        </div>

        <div class="subpanel" id="subpanel-${this._esc(c.id)}"></div>
      `;
      cont.appendChild(row);
    });

    // wire handlers
    cont.querySelectorAll(".emoji-btn").forEach(btn =>
      btn.addEventListener("click", (e) => this._onChangeEmoji(e.currentTarget.dataset.idx))
    );
    cont.querySelectorAll(".btn-edit").forEach(btn =>
      btn.addEventListener("click", (e) => this._onEditCategory(e.currentTarget.dataset.idx))
    );
    cont.querySelectorAll(".btn-delete").forEach(btn =>
      btn.addEventListener("click", (e) => this._onDeleteCategory(e.currentTarget.dataset.idx))
    );
    cont.querySelectorAll(".btn-subs").forEach(btn =>
      btn.addEventListener("click", (e) => this._toggleSubpanel(e.currentTarget.dataset.idx))
    );
  }

  _toggleSubpanel(idx) {
    const cat = this._categories[idx];
    if (!cat) return;
    const panel = this.querySelector(`#subpanel-${cat.id}`);
    if (!panel) return;
    if (panel.classList.contains("open")) {
      panel.classList.remove("open");
      panel.innerHTML = "";
    } else {
      this._renderSubpanel(cat, panel);
      panel.classList.add("open");
    }
  }

  _renderSubpanel(cat, panel) {
    panel.innerHTML = "";
    const list = document.createElement("div");
    list.className = "sub-list";

    if (!cat.subcategories || cat.subcategories.length === 0) {
      list.innerHTML = `<div class="empty">No subcategories</div>`;
    } else {
      cat.subcategories.forEach((s, si) => {
        const item = document.createElement("div");
        item.className = "sub-row";
        item.innerHTML = `
          <div class="sub-left">${this._esc(s.name)}</div>
          <div class="sub-actions">
            <button class="btn btn-ghost edit-sub" data-c="${cat.id}" data-idx="${si}">Edit</button>
            <button class="btn btn-danger del-sub" data-c="${cat.id}" data-idx="${si}">Del</button>
          </div>
        `;
        list.appendChild(item);
      });
    }

    const addWrap = document.createElement("div");
    addWrap.className = "sub-add";
    addWrap.innerHTML = `<button class="btn btn-ghost add-sub" data-c="${cat.id}">＋ Add subcategory</button>`;

    panel.appendChild(list);
    panel.appendChild(addWrap);

    panel.querySelectorAll(".edit-sub").forEach(btn =>
      btn.addEventListener("click", (e) => this._onEditSubcategory(e.currentTarget.dataset.c, Number(e.currentTarget.dataset.idx)))
    );
    panel.querySelectorAll(".del-sub").forEach(btn =>
      btn.addEventListener("click", (e) => this._onDeleteSubcategory(e.currentTarget.dataset.c, Number(e.currentTarget.dataset.idx)))
    );
    panel.querySelectorAll(".add-sub").forEach(btn =>
      btn.addEventListener("click", (e) => this._onAddSubcategory(e.currentTarget.dataset.c))
    );
  }

  /* -------------------- Category operations -------------------- */
  async _onChangeEmoji(idx) {
    const c = this._categories[idx];
    if (!c) return;
    const emoji = prompt("Emoji (paste or type):", c.emoji || "🏷️");
    if (emoji == null) return;
    try {
      await updateCategory(c.id, { emoji: emoji.trim() });
      await this._loadCategories();
      this._showToast("Emoji updated");
    } catch (err) {
      console.error("Emoji update failed:", err);
      this._showToast("Update failed");
    }
  }

  async _onEditCategory(idx) {
    const c = this._categories[idx];
    if (!c) return;
    const name = prompt("Category name:", c.name || "");
    if (!name) return;
    try {
      await updateCategory(c.id, { name: name.trim() });
      await this._loadCategories();
      this._showToast("Category updated");
    } catch (err) {
      console.error("Category update failed:", err);
      this._showToast("Update failed");
    }
  }

  async _onDeleteCategory(idx) {
    const c = this._categories[idx];
    if (!c) return;
    if (!confirm(`Delete "${c.name}"? This will remove related transactions.`)) return;
    try {
      await deleteCategory(c.id, true);
      await this._loadCategories();
      this._showToast("Category deleted");
    } catch (err) {
      console.error("Delete failed:", err);
      this._showToast("Delete failed");
    }
  }

  async _onAddCategory() {
    const name = prompt("Category name:");
    if (!name) return;
    const emoji = prompt("Emoji for category (optional):", "🏷️") || "🏷️";
    try {
      await addCategory({ name: name.trim(), emoji: emoji.trim(), subcategories: [] });
      await this._loadCategories();
      this._showToast("Category added");
    } catch (err) {
      console.error("Add category failed:", err);
      this._showToast("Add failed");
    }
  }

  async _onAddSubcategory(catId) {
    const name = prompt("Subcategory name:");
    if (!name) return;
    try {
      const cat = this._categories.find(c => c.id === catId);
      const updated = [...(cat.subcategories || []), { name: name.trim() }];
      await updateCategory(catId, { subcategories: updated });
      await this._loadCategories();
      this._showToast("Subcategory added");
    } catch (err) {
      console.error("Add sub failed:", err);
      this._showToast("Failed");
    }
  }

  async _onEditSubcategory(catId, idx) {
    const cat = this._categories.find(c => c.id === catId);
    if (!cat) return;
    const sub = cat.subcategories[idx];
    const name = prompt("Edit subcategory:", sub.name || "");
    if (!name) return;
    try {
      const updated = [...cat.subcategories];
      updated[idx] = { ...sub, name: name.trim() };
      await updateCategory(catId, { subcategories: updated });
      await this._loadCategories();
      this._showToast("Updated");
    } catch (err) {
      console.error("Update sub failed:", err);
      this._showToast("Failed");
    }
  }

  async _onDeleteSubcategory(catId, idx) {
    if (!confirm("Delete this subcategory?")) return;
    try {
      const cat = this._categories.find(c => c.id === catId);
      const updated = cat.subcategories.filter((_, i) => i !== idx);
      await updateCategory(catId, { subcategories: updated });
      await this._loadCategories();
      this._showToast("Deleted");
    } catch (err) {
      console.error("Delete sub failed:", err);
      this._showToast("Failed");
    }
  }

  /* -------------------- Utilities -------------------- */
  _esc(s = "") {
    return String(s).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  }

  _showToast(msg = "") {
    const t = this.querySelector("#settings-toast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => t.classList.remove("show"), 1400);
  }
}

customElements.define("settings-screen", SettingsScreen);
