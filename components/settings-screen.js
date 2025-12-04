// components/settings-screen.js
// Updated Settings screen using the new production-ready db.js functions
// - Works with optimized database layer
// - Uses proper error handling and validation
// - Emits EventBus events: categories-updated, data-imported

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
import { DEFAULT_CATEGORIES } from "../js/default-categories.js";

function uuid() {
  try {
    return crypto.randomUUID();
  } catch (e) {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }
}

class SettingsScreen extends HTMLElement {
  constructor() {
    super();
    this._categories = [];
    this._toastTimer = null;
  }

  connectedCallback() {
    this.innerHTML = `
      <div class="wrap settings-wrap" data-screen="settings">
        <div class="settings-container">

          <header class="settings-header">
            <h1 class="title">Settings</h1>
            <div class="meta">Manage themes, backup & categories</div>
          </header>

          <section class="card">
            <div class="card-row">
              <div>
                <div class="card-title">Security</div>
                <div class="card-sub">Lock the app with PIN or biometric.</div>
              </div>
              <div class="card-actions">
                <button id="btn-change-pin" class="btn btn-ghost">Change PIN</button>
              </div>
            </div>

            <div class="card-row">
              <div>
                <div class="card-title">Biometric</div>
                <div class="card-sub">Enable biometric unlock (if available).</div>
              </div>
              <div class="card-actions">
                <button id="btn-toggle-bio" class="btn btn-ghost">Toggle</button>
              </div>
            </div>
          </section>

          <section class="card">
            <div class="card-title">Data & Backup</div>
            <div class="card-sub">Export/import or choose backup folder.</div>

            <div class="card-row small-gap">
              <div>
                <div class="mini-title">Export</div>
                <div class="mini-sub">Download JSON backup of data.</div>
              </div>
              <div class="card-actions">
                <button id="btn-export" class="btn btn-acc">Export</button>
              </div>
            </div>

            <div class="card-row small-gap">
              <div>
                <div class="mini-title">Import</div>
                <div class="mini-sub">Restore from a JSON file.</div>
                <input id="file-import" type="file" accept="application/json" />
              </div>
            </div>

            <div class="card-row small-gap">
              <div>
                <div class="mini-title">Backup folder</div>
                <div class="mini-sub" id="backup-file-label">No folder selected</div>
              </div>
              <div class="card-actions">
                <button id="btn-choose-backup" class="btn btn-ghost">Choose</button>
                <button id="btn-backup-now" class="btn btn-acc">Backup</button>
              </div>
            </div>

            <div class="card-row small-gap">
              <div>
                <div class="mini-title">Reset</div>
                <div class="mini-sub">Delete all app data (categories, transactions, settings).</div>
              </div>
              <div class="card-actions">
                <button id="btn-reset-all" class="btn btn-danger">Reset All</button>
              </div>
            </div>
          </section>

          <section class="card">
            <div class="card-title">Categories</div>
            <div class="card-sub">Manage emojis, names and subcategories</div>

            <div id="cat-mgr" class="cat-mgr-list"></div>

            <div style="margin-top:12px;">
              <button id="btn-add-cat" class="btn btn-ghost">＋ Add category</button>
            </div>
          </section>

          <section class="card">
            <div class="card-title">About</div>
            <div class="card-sub">Expense Manager PWA · dev build</div>
          </section>

        </div>
      </div>

      <div id="settings-toast" class="settings-toast" aria-live="polite" role="status"></div>
    `;

    // Bind DOM events
    this._bind();

    // Initialize database and load categories
    this._initialize();

    // Listen for external category changes
    EventBus.on("categories-updated", (cats) => {
      if (Array.isArray(cats)) {
        this._categories = cats;
        this._renderCategories();
      } else {
        this._loadCategories();
      }
    });
  }

  disconnectedCallback() {
    try {
      EventBus.off("categories-updated");
    } catch (_) {}
    if (this._toastTimer) clearTimeout(this._toastTimer);
  }

  /* ---------------- Initialization ---------------- */
  async _initialize() {
    try {
      // Ensure database is initialized
      const status = getDBStatus();
      if (status !== DBStatus.READY) {
        await initDB();
      }

      // Seed default categories if needed
      await this._ensureCategoriesSeeded();

      // Load categories from database
      await this._loadCategories();
    } catch (error) {
      console.error("Failed to initialize settings:", error);
      this._showToast("Failed to load settings");
    }
  }

  async _ensureCategoriesSeeded() {
    try {
      const categories = await getAllCategories();
      
      if (categories.length === 0) {
        console.log("Seeding default categories...");
        
        // Add default categories using the new addCategory function
        for (const cat of DEFAULT_CATEGORIES) {
          await addCategory({
            name: cat.name,
            emoji: cat.emoji || "🏷️",
            image: cat.image || "",
            subcategories: (cat.subcategories || []).map(s => 
              typeof s === "string" ? { name: s } : { name: s.name || "" }
            )
          });
        }
        
        console.log("✅ Default categories seeded");
      }
    } catch (error) {
      console.error("❌ Failed to seed categories:", error);
      this._showToast("Failed to seed default categories");
    }
  }

  async _loadCategories() {
    try {
      const categories = await getAllCategories();
      
      // Normalize to expected shape
      this._categories = categories.map(c => ({
        id: c.id,
        name: c.name,
        emoji: c.emoji || "🏷️",
        image: c.image || "",
        subcategories: (c.subcategories || []).map(s => ({
          id: s.id,
          name: s.name
        }))
      }));

      this._renderCategories();
      EventBus.emit("categories-updated", this._categories);
    } catch (error) {
      console.error("❌ Failed to load categories:", error);
      this._showToast("Failed to load categories");
      this._categories = [];
      this._renderCategories();
    }
  }

  /* ---------------- UI Binding ---------------- */
  _bind() {
    const $ = (sel) => this.querySelector(sel);

    // Export data
    $("#btn-export")?.addEventListener("click", async () => {
      try {
        const exportedData = await exportData();
        
        const blob = new Blob([JSON.stringify(exportedData, null, 2)], {
          type: "application/json"
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `spendrill-export-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        
        this._showToast("Export successful");
      } catch (error) {
        console.error("Export failed:", error);
        this._showToast("Export failed");
      }
    });

    // Import data
    const fileImport = $("#file-import");
    fileImport?.addEventListener("change", async (evt) => {
      const file = evt.target.files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);

        // Use the new importData function with clearExisting option
        const confirmClear = confirm(
          "Do you want to replace all existing data?\n\n" +
          "Yes = Replace everything\n" +
          "No = Merge with existing data"
        );

        await importData(data, { clearExisting: confirmClear });

        // Reload categories
        await this._loadCategories();
        
        EventBus.emit("data-imported", data);
        this._showToast("Import successful");
      } catch (error) {
        console.error("Import failed:", error);
        this._showToast(`Import failed: ${error.message}`);
      } finally {
        fileImport.value = "";
      }
    });

    // Choose backup folder
    $("#btn-choose-backup")?.addEventListener("click", () => {
      EventBus.emit("choose-backup-folder");
    });

    // Backup now
    $("#btn-backup-now")?.addEventListener("click", () => {
      EventBus.emit("request-backup-now");
      this._showToast("Backup requested");
    });

    // Reset all data
    $("#btn-reset-all")?.addEventListener("click", async () => {
      if (!confirm(
        "⚠️ WARNING: This will delete ALL data!\n\n" +
        "• All transactions\n" +
        "• All categories\n" +
        "• All settings\n\n" +
        "This action cannot be undone. Continue?"
      )) {
        return;
      }

      try {
        await wipeAll();
        
        // Reload empty state
        this._categories = [];
        this._renderCategories();
        EventBus.emit("categories-updated", this._categories);
        
        this._showToast("All data cleared");
      } catch (error) {
        console.error("Reset failed:", error);
        this._showToast("Reset failed");
      }
    });

    // Add category
    $("#btn-add-cat")?.addEventListener("click", () => this._onAddCategory());

    // Security buttons
    $("#btn-change-pin")?.addEventListener("click", () => 
      EventBus.emit("request-change-pin", {})
    );
    $("#btn-toggle-bio")?.addEventListener("click", () => 
      EventBus.emit("toggle-biometric", {})
    );
  }

  /* ---------------- Category UI Rendering ---------------- */
  _renderCategories() {
    const cont = this.querySelector("#cat-mgr");
    if (!cont) return;
    cont.innerHTML = "";

    if (!this._categories || this._categories.length === 0) {
      cont.innerHTML = `<div class="empty">No categories yet. Add one to get started.</div>`;
      return;
    }

    this._categories.forEach((c, idx) => {
      const row = document.createElement("div");
      row.className = "cat-row";
      row.dataset.idx = idx;
      
      const subcatPreview = (c.subcategories || [])
        .map(s => s.name)
        .slice(0, 3)
        .join(", ");
      const hasMore = c.subcategories && c.subcategories.length > 3;

      row.innerHTML = `
        <div class="cat-main">
          <button class="emoji-btn" data-idx="${idx}">
            ${this._escape(c.emoji || "🏷️")}
          </button>
          <div class="cat-info">
            <div class="cat-name">${this._escape(c.name || "Unnamed")}</div>
            <div class="cat-subtext">
              ${this._escape(subcatPreview)}${hasMore ? "…" : ""}
            </div>
          </div>
        </div>
        <div class="cat-actions">
          <button class="btn btn-ghost btn-edit" data-idx="${idx}">Edit</button>
          <button class="btn btn-ghost btn-subs" data-idx="${idx}">Subs</button>
          <button class="btn btn-danger btn-delete" data-idx="${idx}">Delete</button>
        </div>
        <div class="subpanel" id="subpanel-${this._escape(c.id)}" style="display:none;"></div>
      `;
      cont.appendChild(row);
    });

    // Wire event handlers
    cont.querySelectorAll(".emoji-btn").forEach(btn =>
      btn.addEventListener("click", (e) => 
        this._onChangeEmoji(e.currentTarget.dataset.idx)
      )
    );
    cont.querySelectorAll(".btn-edit").forEach(btn =>
      btn.addEventListener("click", (e) => 
        this._onEditCategory(e.currentTarget.dataset.idx)
      )
    );
    cont.querySelectorAll(".btn-delete").forEach(btn =>
      btn.addEventListener("click", (e) => 
        this._onDeleteCategory(e.currentTarget.dataset.idx)
      )
    );
    cont.querySelectorAll(".btn-subs").forEach(btn =>
      btn.addEventListener("click", (e) => 
        this._toggleSubpanel(e.currentTarget.dataset.idx)
      )
    );
  }

  _toggleSubpanel(idx) {
    const i = Number(idx);
    const cat = this._categories[i];
    if (!cat) return;

    const panel = this.querySelector(`#subpanel-${cat.id}`);
    if (!panel) return;

    if (panel.style.display === "none") {
      this._renderSubpanel(cat, panel);
      panel.style.display = "block";
    } else {
      panel.style.display = "none";
    }
  }

  _renderSubpanel(cat, panel) {
    panel.innerHTML = "";
    const list = document.createElement("div");
    list.className = "sub-list";

    if (!cat.subcategories || cat.subcategories.length === 0) {
      list.innerHTML = `<div class="empty">No subcategories. Add one below.</div>`;
    } else {
      cat.subcategories.forEach((s, si) => {
        const item = document.createElement("div");
        item.className = "sub-row";
        item.innerHTML = `
          <div class="sub-left">${this._escape(s.name)}</div>
          <div class="sub-actions">
            <button class="btn btn-ghost edit-sub" data-c="${cat.id}" data-idx="${si}">
              Edit
            </button>
            <button class="btn btn-danger del-sub" data-c="${cat.id}" data-idx="${si}">
              Delete
            </button>
          </div>
        `;
        list.appendChild(item);
      });
    }

    const addWrap = document.createElement("div");
    addWrap.className = "sub-add";
    addWrap.innerHTML = `
      <button class="btn btn-ghost add-sub" data-c="${cat.id}">
        ＋ Add subcategory
      </button>
    `;

    panel.appendChild(list);
    panel.appendChild(addWrap);

    // Wire subcategory handlers
    panel.querySelectorAll(".edit-sub").forEach(btn =>
      btn.addEventListener("click", (e) => {
        const catId = e.currentTarget.dataset.c;
        const idx = Number(e.currentTarget.dataset.idx);
        this._onEditSubcategory(catId, idx);
      })
    );
    panel.querySelectorAll(".del-sub").forEach(btn =>
      btn.addEventListener("click", (e) => {
        const catId = e.currentTarget.dataset.c;
        const idx = Number(e.currentTarget.dataset.idx);
        this._onDeleteSubcategory(catId, idx);
      })
    );
    panel.querySelectorAll(".add-sub").forEach(btn =>
      btn.addEventListener("click", (e) => {
        const catId = e.currentTarget.dataset.c;
        this._onAddSubcategory(catId);
      })
    );
  }

  /* ---------------- Category CRUD Operations ---------------- */
  async _onChangeEmoji(idx) {
    const i = Number(idx);
    const cat = this._categories[i];
    if (!cat) return;

    const emoji = prompt("Choose emoji (paste or type):", cat.emoji || "🏷️");
    if (emoji == null) return;

    try {
      await updateCategory(cat.id, { emoji: emoji.trim() });
      await this._loadCategories();
      this._showToast("Emoji updated");
    } catch (error) {
      console.error("Failed to update emoji:", error);
      this._showToast("Failed to update emoji");
    }
  }

  async _onEditCategory(idx) {
    const i = Number(idx);
    const cat = this._categories[i];
    if (!cat) return;

    const name = prompt("Category name:", cat.name || "");
    if (name == null || !name.trim()) return;

    try {
      await updateCategory(cat.id, { name: name.trim() });
      await this._loadCategories();
      this._showToast("Category updated");
    } catch (error) {
      console.error("Failed to update category:", error);
      this._showToast("Failed to update category");
    }
  }

  async _onDeleteCategory(idx) {
    const i = Number(idx);
    const cat = this._categories[i];
    if (!cat) return;

    if (!confirm(
      `Delete "${cat.name}"?\n\n` +
      `This will also delete all associated transactions.`
    )) {
      return;
    }

    try {
      // Delete with force option (deletes related transactions)
      await deleteCategory(cat.id, true);
      await this._loadCategories();
      this._showToast("Category deleted");
    } catch (error) {
      console.error("Failed to delete category:", error);
      this._showToast(`Delete failed: ${error.message}`);
    }
  }

  async _onAddCategory() {
    const name = prompt("Category name:");
    if (!name || !name.trim()) return;

    const emoji = prompt("Emoji for category (optional):", "🏷️") || "🏷️";

    try {
      await addCategory({
        name: name.trim(),
        emoji: emoji.trim(),
        subcategories: []
      });
      
      await this._loadCategories();
      this._showToast("Category added");
    } catch (error) {
      console.error("Failed to add category:", error);
      this._showToast("Failed to add category");
    }
  }

  /* ---------------- Subcategory Operations ---------------- */
  async _onAddSubcategory(catId) {
    const cat = this._categories.find(c => c.id === catId);
    if (!cat) return;

    const name = prompt(`Add subcategory under "${cat.name}":`);
    if (!name || !name.trim()) return;

    try {
      const updatedSubcategories = [
        ...(cat.subcategories || []),
        { name: name.trim() }
      ];

      await updateCategory(cat.id, { subcategories: updatedSubcategories });
      await this._loadCategories();

      // Refresh subpanel if open
      const panel = this.querySelector(`#subpanel-${cat.id}`);
      if (panel && panel.style.display !== "none") {
        const updatedCat = this._categories.find(c => c.id === catId);
        if (updatedCat) this._renderSubpanel(updatedCat, panel);
      }

      this._showToast("Subcategory added");
    } catch (error) {
      console.error("Failed to add subcategory:", error);
      this._showToast("Failed to add subcategory");
    }
  }

  async _onEditSubcategory(catId, idx) {
    const cat = this._categories.find(c => c.id === catId);
    if (!cat || !cat.subcategories || !cat.subcategories[idx]) return;

    const sub = cat.subcategories[idx];
    const name = prompt("Edit subcategory name:", sub.name || "");
    if (name == null || !name.trim()) return;

    try {
      const updatedSubcategories = [...cat.subcategories];
      updatedSubcategories[idx] = { ...sub, name: name.trim() };

      await updateCategory(cat.id, { subcategories: updatedSubcategories });
      await this._loadCategories();

      // Refresh subpanel
      const panel = this.querySelector(`#subpanel-${cat.id}`);
      if (panel && panel.style.display !== "none") {
        const updatedCat = this._categories.find(c => c.id === catId);
        if (updatedCat) this._renderSubpanel(updatedCat, panel);
      }

      this._showToast("Subcategory updated");
    } catch (error) {
      console.error("Failed to update subcategory:", error);
      this._showToast("Failed to update subcategory");
    }
  }

  async _onDeleteSubcategory(catId, idx) {
    const cat = this._categories.find(c => c.id === catId);
    if (!cat || !cat.subcategories || !cat.subcategories[idx]) return;

    const sub = cat.subcategories[idx];
    if (!confirm(`Delete subcategory "${sub.name}"?`)) return;

    try {
      const updatedSubcategories = cat.subcategories.filter((_, i) => i !== idx);

      await updateCategory(cat.id, { subcategories: updatedSubcategories });
      await this._loadCategories();

      // Refresh subpanel
      const panel = this.querySelector(`#subpanel-${cat.id}`);
      if (panel && panel.style.display !== "none") {
        const updatedCat = this._categories.find(c => c.id === catId);
        if (updatedCat) this._renderSubpanel(updatedCat, panel);
      }

      this._showToast("Subcategory deleted");
    } catch (error) {
      console.error("Failed to delete subcategory:", error);
      this._showToast("Failed to delete subcategory");
    }
  }

  /* ---------------- Utilities ---------------- */
  _escape(s = "") {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  _showToast(msg = "", timeout = 1600) {
    const toast = this.querySelector("#settings-toast");
    if (!toast) return;

    toast.textContent = msg;
    toast.classList.add("show");

    if (this._toastTimer) clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      toast.classList.remove("show");
    }, timeout);
  }
}

customElements.define("settings-screen", SettingsScreen);