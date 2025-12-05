// components/settings-screen.js
// Readable, refactored SettingsScreen
// - Internal CategoryManager class (kept inside this file per your choice C)
// - Uses toast.js for notifications
// - Uses backup-utils.js for import/export
// - Uses DB (Dexie) functions and StateModule for app state
// - Keeps theme logic inside this component

import { EventBus } from "../js/event-bus.js";
import StateModule from "../js/state.js";
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

import { esc } from "../js/utils.js";
import { showToast } from "../js/toast.js";
import { exportBackup, importBackup } from "../js/backup-utils.js";
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
  { id: "storm", name: "Storm" }
];

function uuidFallback() {
  try {
    return crypto.randomUUID();
  } catch {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }
}

/* ===========================
   Internal CategoryManager
   - Keeps category list operations encapsulated
   - Uses DB.* functions to persist
   =========================== */
class CategoryManager {
  constructor(hostComponent) {
    this.host = hostComponent;
    this._categories = [];
  }

  async load() {
    const rows = await getAllCategories();
    this._categories = (rows || []).map(c => ({
      id: c.id,
      name: c.name,
      emoji: c.emoji || "🏷️",
      image: c.image || "",
      subcategories: c.subcategories || []
    }));
    this.render();
  }

  getAll() {
    return this._categories;
  }

  async ensureSeed(defaults = DEFAULT_CATEGORIES) {
    const exists = (await getAllCategories()).length;
    if (exists) return;
    for (const cat of defaults) {
      await addCategory({
        id: uuidFallback(),
        name: cat.name,
        emoji: cat.emoji || "🏷️",
        image: cat.image || "",
        subcategories: (cat.subcategories || []).map(s => ({ name: s.name || s }))
      });
    }
    await this.load();
  }

  render() {
    const cont = this.host.querySelector("#cat-mgr");
    if (!cont) return;
    cont.innerHTML = "";

    if (!this._categories.length) {
      cont.innerHTML = `<div class="empty">No categories</div>`;
      return;
    }

    this._categories.forEach((c) => {
      const row = document.createElement("div");
      row.className = "cat-row";
      row.tabIndex = 0;

      const subPreview = c.subcategories.slice(0, 3).map(s => s.name).join(", ");
      const more = c.subcategories.length > 3 ? "…" : "";

      row.innerHTML = `
        <div class="cat-main" data-id="${esc(c.id)}">
          <div class="emoji-btn">${c.image ? `<img src="${esc(c.image)}" class="cat-list-image" alt="${esc(c.name)}"/>` : esc(c.emoji)}</div>
          <div class="cat-info">
            <div class="cat-name">${esc(c.name)}</div>
            <div class="cat-subtext">${esc(subPreview)}${more}</div>
          </div>
        </div>
      `;

      // click & keyboard enter open editor
      row.addEventListener("click", () => this.openEditor(c));
      row.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter" || ev.key === " ") this.openEditor(c);
      });

      cont.appendChild(row);
    });
  }

  async openEditor(category) {
    // Create category-editor component and pass the category
    const modal = document.createElement("category-editor");
    document.body.appendChild(modal);
    // Defer load to next paint to ensure component attached
    requestAnimationFrame(() => modal.load(category));
    // When editor emits update events, we'll refresh via EventBus listeners in SettingsScreen
  }
}

/* ===========================
   SettingsScreen web component
   =========================== */
class SettingsScreen extends HTMLElement {
  constructor() {
    super();
    this.catMgr = new CategoryManager(this);
    this._toastTimer = null;

    // Bind handlers
    this._onCategoryUpdated = this._onCategoryUpdated.bind(this);
    this._onCategoryDeleted = this._onCategoryDeleted.bind(this);
  }

  connectedCallback() {
    this.render();
    this._bind();
    this._init();

    EventBus.on("category-updated", this._onCategoryUpdated);
    EventBus.on("category-deleted", this._onCategoryDeleted);
  }

  disconnectedCallback() {
    EventBus.off("category-updated", this._onCategoryUpdated);
    EventBus.off("category-deleted", this._onCategoryDeleted);
  }

  /* ----------------- INIT ----------------- */
  async _init() {
    // Ensure DB ready
    if (getDBStatus() !== DBStatus.READY) await initDB();

    // Ensure default categories exist
    await this.catMgr.ensureSeed();

    // Load categories into manager and render
    await this.catMgr.load();

    // Render theme gallery state
    this._renderThemeGallery();
  }

  /* ----------------- RENDER ----------------- */
  render() {
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
                <div class="row-sub">Use fingerprint or face unlock</div>
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
                <div class="row-sub">Restore from a JSON backup</div>
              </div>
              <div class="row-actions import-wrap">
                <input id="file-import" type="file" accept="application/json" />
              </div>
            </div>

            <div class="card-row border-top">
              <div class="row-info">
                <div class="row-title">Reset All</div>
                <div class="row-sub">Delete all categories, transactions & settings</div>
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
  }

  /* ----------------- BIND ----------------- */
  _bind() {
    const $ = (s) => this.querySelector(s);

    $("#btn-export")?.addEventListener("click", async () => {
      try {
        // Use shared backup util
        const data = await exportBackup();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "spendrill-backup.json";
        a.click();
        URL.revokeObjectURL(url);
        showToast("Exported");
      } catch (err) {
        console.error("Export failed", err);
        showToast("Export failed");
      }
    });

    const fileImport = $("#file-import");
    fileImport?.addEventListener("change", async (evt) => {
      const file = evt.target.files[0];
      if (!file) return;
      try {
        // importBackup handles parsing and DB writes
        const replace = confirm("Replace existing data? OK = Replace, Cancel = Merge");
        await importBackup(file, replace);
        await this.catMgr.load();
        showToast("Imported");
      } catch (err) {
        console.error("Import failed", err);
        showToast("Import failed");
      } finally {
        fileImport.value = "";
      }
    });

    $("#btn-reset-all")?.addEventListener("click", async () => {
      if (!confirm("⚠ Delete ALL data?")) return;
      try {
        await wipeAll();
        await this.catMgr.load();
        showToast("Data cleared");
      } catch (err) {
        console.error("Reset failed", err);
        showToast("Reset failed");
      }
    });

    $("#btn-add-cat")?.addEventListener("click", () => this._addCategory());

    $("#btn-change-pin")?.addEventListener("click", () => EventBus.emit("request-change-pin"));
    $("#btn-toggle-bio")?.addEventListener("click", () => EventBus.emit("toggle-biometric"));
  }

  /* ----------------- THEMES ----------------- */
  _renderThemeGallery() {
    const root = this.querySelector("#themeGallery");
    const current = document.documentElement.getAttribute("data-theme") || "midnight";

    root.innerHTML = THEMES.map(t => `
      <button class="theme-card" data-theme="${t.id}">
        <div class="theme-preview" data-theme="${t.id}"></div>
        <div class="theme-label">${esc(t.name)}</div>
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
    showToast("Theme applied");
    EventBus.emit("theme-change", { theme: id });
  }

  /* ----------------- CATEGORY HELPERS ----------------- */
  _addCategory() {
    const emptyCat = {
      id: uuidFallback(),
      name: "",
      emoji: "🏷️",
      image: "",
      subcategories: []
    };
    this.catMgr.openEditor(emptyCat);
  }

  /* ----------------- EVENT HANDLERS ----------------- */
  async _onCategoryUpdated() {
    await this.catMgr.load();
  }

  async _onCategoryDeleted() {
    await this.catMgr.load();
  }
}

customElements.define("settings-screen", SettingsScreen);
