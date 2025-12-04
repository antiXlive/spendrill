// components/settings-screen.js
// Clean Settings screen — now categories open in category-editor modal
// No inline editing. No subpanels. Full modern UX.

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
  { id: "cosmic", name: "Cosmic" },
  { id: "neon", name: "Neon" },
  { id: "tealglass", name: "Teal Glass" },
  { id: "onyx", name: "Onyx" },
  { id: "crimsonnight", name: "Crimson Night" },
  { id: "storm", name: "Storm" },
];

function uuid() {
  try { return crypto.randomUUID(); }
  catch { return Date.now().toString(36) + Math.random().toString(36).slice(2); }
}

class SettingsScreen extends HTMLElement {
  constructor() {
    super();
    this._categories = [];
    this._toastTimer = null;
  }

  connectedCallback() {
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
                <div class="row-sub">Update your unlock PIN</div>
              </div>
              <div class="row-actions">
                <button id="btn-change-pin" class="btn btn-ghost">Change</button>
              </div>
            </div>

            <div class="card-row">
              <div class="row-info">
                <div class="row-title">Biometric Unlock</div>
                <div class="row-sub">Use fingerprint/face unlock</div>
              </div>
              <div class="row-actions">
                <button id="btn-toggle-bio" class="btn btn-ghost">Toggle</button>
              </div>
            </div>
          </section>

          <!-- Themes -->
          <section class="card">
            <div class="card-title">Themes</div>
            <div class="card-sub">Choose a color theme</div>
            <div class="theme-gallery" id="themeGallery"></div>
          </section>

          <!-- Data & Backup -->
          <section class="card">
            <div class="card-title">Data & Backup</div>
            <div class="card-sub">Export / Import or reset all data</div>

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
                <div class="row-sub">Deletes EVERYTHING</div>
              </div>
              <div class="row-actions">
                <button id="btn-reset-all" class="btn btn-danger">Reset</button>
              </div>
            </div>
          </section>

          <!-- Categories -->
          <section class="card">
            <div class="card-title">Categories</div>
            <div class="card-sub">Tap a category to edit</div>

            <div id="cat-mgr" class="cat-mgr-list"></div>

            <div style="margin-top:12px;">
              <button id="btn-add-cat" class="btn btn-ghost wide-btn">＋ Add Category</button>
            </div>
          </section>

          <section class="card about-card">
            <div class="card-title">About</div>
            <div class="card-sub">Spendrill — Offline Expense Manager</div>
            <div class="card-sub">Made with ❤️ by Piyush</div>
            <div class="card-sub">© AntixBuilds</div>
          </section>

        </div>
      </div>

      <div id="settings-toast" class="settings-toast"></div>
    `;

    this._bind();
    this._init();

    // external updates (after modal saves)
    EventBus.on("category-updated", () => this._loadCategories());
    EventBus.on("category-deleted", () => this._loadCategories());
  }

  /* ---------------- Initialization ---------------- */
  async _init() {
    if (getDBStatus() !== DBStatus.READY) await initDB();
    await this._ensureSeed();
    await this._loadCategories();
    this._renderThemeGallery();
  }

  async _ensureSeed() {
    const cats = await getAllCategories();
    if (!cats.length) {
      for (const cat of DEFAULT_CATEGORIES) {
        await addCategory({
          id: uuid(),
          name: cat.name,
          emoji: cat.emoji || "🏷️",
          image: cat.image || "",
          subcategories: (cat.subcategories || []).map(s => ({ name: s.name || s }))
        });
      }
    }
  }

  /* ---------------- Category Rendering ---------------- */
  _renderCategories() {
    const cont = this.querySelector("#cat-mgr");
    cont.innerHTML = "";

    if (!this._categories.length) {
      cont.innerHTML = `<div class="empty">No categories</div>`;
      return;
    }

    this._categories.forEach((c) => {
      const row = document.createElement("div");
      row.className = "cat-row";

      const subPreview = c.subcategories.slice(0, 3).map(s => s.name).join(", ");
      const more = c.subcategories.length > 3 ? "…" : "";

      row.innerHTML = `
        <div class="cat-main" data-id="${c.id}">
          <div class="emoji-btn">${this._esc(c.emoji)}</div>
          <div class="cat-info">
            <div class="cat-name">${this._esc(c.name)}</div>
            <div class="cat-subtext">${this._esc(subPreview)}${more}</div>
          </div>
        </div>
      `;

      row.addEventListener("click", () => this._openEditor(c));

      cont.appendChild(row);
    });
  }

  /* ---------------- Open Fullscreen Editor ---------------- */
  _openEditor(cat) {
    const modal = document.createElement("category-editor");
    document.body.appendChild(modal);
    modal.load(cat);
  }

  /* Add category = open empty editor */
  _addCategory() {
    const modal = document.createElement("category-editor");
    document.body.appendChild(modal);
    modal.load({
      id: uuid(),
      name: "",
      emoji: "🏷️",
      subcategories: []
    });
  }

  /* ---------------- Theme Gallery ---------------- */
  _renderThemeGallery() {
    const root = this.querySelector("#themeGallery");
    const current = document.documentElement.getAttribute("data-theme") || "midnight";

    root.innerHTML = THEMES.map(t => `
      <button class="theme-card" data-theme="${t.id}">
        <div class="theme-preview" data-theme="${t.id}"></div>
        <div class="theme-label">${t.name}</div>
        <div class="theme-check">${t.id === current ? "✓" : ""}</div>
      </button>
    `).join("");

    root.querySelectorAll(".theme-card").forEach(btn => {
      btn.addEventListener("click", () => this._applyTheme(btn.dataset.theme));
    });
  }

  async _applyTheme(id) {
    document.documentElement.setAttribute("data-theme", id);
    await StateModule.saveSetting("theme", id);
    this._renderThemeGallery();
    this._showToast("Theme applied");
    EventBus.emit("theme-change", { theme: id });
  }

  /* ---------------- Import / Export / Reset ---------------- */
  _bind() {
    const $ = s => this.querySelector(s);

    $("#btn-export")?.addEventListener("click", async () => {
      try {
        const data = await exportData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "spendrill-backup.json";
        a.click();
        URL.revokeObjectURL(url);
        this._showToast("Exported");
      } catch {
        this._showToast("Export failed");
      }
    });

    const fileImport = $("#file-import");
    fileImport?.addEventListener("change", async (evt) => {
      const file = evt.target.files[0];
      if (!file) return;
      try {
        const txt = await file.text();
        const data = JSON.parse(txt);
        const replace = confirm("Replace existing data? OK = Replace, Cancel = Merge");
        await importData(data, replace);
        await this._loadCategories();
        this._showToast("Imported");
      } catch {
        this._showToast("Import failed");
      } finally {
        fileImport.value = "";
      }
    });

    $("#btn-reset-all")?.addEventListener("click", async () => {
      if (!confirm("⚠ Delete ALL data?")) return;
      await wipeAll();
      this._categories = [];
      this._renderCategories();
      this._showToast("Data cleared");
    });

    $("#btn-add-cat")?.addEventListener("click", () => this._addCategory());

    $("#btn-change-pin")?.addEventListener("click", () => EventBus.emit("request-change-pin"));
    $("#btn-toggle-bio")?.addEventListener("click", () => EventBus.emit("toggle-biometric"));
  }

  /* ---------------- Utilities ---------------- */
  _showToast(msg) {
    const t = this.querySelector("#settings-toast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => t.classList.remove("show"), 1300);
  }

  _esc(s) {
    return String(s).replace(/[&<>]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;" }[c]));
  }

  async _loadCategories() {
    const cats = await getAllCategories();
    this._categories = cats.map(c => ({
      id: c.id,
      name: c.name,
      emoji: c.emoji || "🏷️",
      subcategories: c.subcategories || []
    }));
    this._renderCategories();
  }
}

customElements.define("settings-screen", SettingsScreen);
