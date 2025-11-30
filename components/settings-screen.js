// components/settings-screen.js
// Full Settings screen (light DOM) — Category manager + data & backup controls
// - No Shadow DOM, uses external CSS at ../css/settings-screen.css
// - Emits EventBus events: categories-updated, data-imported
// - Works with db.categories where a category has shape { id, name, emoji, subcategories: [{id,name}] }

import { EventBus } from "../js/event-bus.js";
import { db, wipeAll as dbWipeAll, addCategoryWithSubs } from "../js/db.js";
import { DEFAULT_CATEGORIES } from "../js/default-categories.js"; // your file with default categories

function uuid() {
  try { return crypto.randomUUID(); } catch (e) { return Date.now().toString(36) + Math.random().toString(36).slice(2); }
}

class SettingsScreen extends HTMLElement {
  constructor() {
    super();
    // local cached categories
    this._categories = [];
    this._toastTimer = null;
  }

  connectedCallback() {
    // render UI
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

    // Seed & load categories
    this._ensureCategoriesSeeded()
      .then(() => this._loadCategories())
      .catch((e) => {
        console.warn("Seed/load categories failed:", e);
        this._loadCategories(); // attempt best-effort
      });

    // Listen for external category changes
    EventBus.on("categories-updated", (cats) => {
      if (Array.isArray(cats)) {
        this._categories = cats;
        this._renderCategories();
      } else {
        // refresh from DB
        this._loadCategories();
      }
    });
  }

  disconnectedCallback() {
    try { EventBus.off("categories-updated"); } catch (_) {}
    if (this._toastTimer) clearTimeout(this._toastTimer);
  }

  /* ---------------- Data helpers ---------------- */
  async _ensureCategoriesSeeded() {
    try {
      if (db && db.categories) {
        const cnt = await db.categories.count();
        if (cnt === 0) {
          // seed using addCategoryWithSubs where available
          for (const c of DEFAULT_CATEGORIES) {
            // convert subcategories to plain { name } entries if necessary
            const cat = {
              name: c.name,
              emoji: c.emoji || "",
              subcategories: (c.subcategories || []).map(s => typeof s === "string" ? { name: s } : { name: s.name || "" })
            };
            if (typeof addCategoryWithSubs === "function") {
              await addCategoryWithSubs(cat);
            } else {
              // fallback: write directly preserving structure
              const id = c.id || uuid();
              await db.categories.put({
                id,
                name: c.name,
                emoji: c.emoji || "",
                subcategories: (c.subcategories || []).map(s => ({ id: (s && s.id) || uuid(), name: (s && s.name) || s || "" }))
              });
            }
          }
          await db.categories.toArray(); // touch DB
          console.log("Default categories seeded");
        }
      }
    } catch (e) {
      console.warn("Seed categories error, falling back to localStorage", e);
      // localStorage fallback (simple)
      try {
        if (!localStorage.getItem("categories")) {
          localStorage.setItem("categories", JSON.stringify(DEFAULT_CATEGORIES));
        }
      } catch (_) {}
    }
  }

  async _loadCategories() {
    try {
      if (db && db.categories) {
        const cats = await db.categories.toArray();
        // normalize to expected shape
        this._categories = (cats || []).map(c => ({
          id: c.id || uuid(),
          name: c.name || "Unnamed",
          emoji: c.emoji || (c.icon || "🏷️"),
          subcategories: (c.subcategories || []).map(s => ({ id: s.id || uuid(), name: s.name || "" }))
        }));
      } else {
        // fallback to localStorage
        const raw = JSON.parse(localStorage.getItem("categories") || "null") || DEFAULT_CATEGORIES;
        this._categories = raw.map(c => ({
          id: c.id || uuid(),
          name: c.name || "Unnamed",
          emoji: c.emoji || "🏷️",
          subcategories: (c.subcategories || []).map(s => (typeof s === "string" ? { id: uuid(), name: s } : { id: s.id || uuid(), name: s.name || "" }))
        }));
      }
    } catch (e) {
      console.error("Load categories error", e);
      this._categories = DEFAULT_CATEGORIES.map(c => ({
        id: c.id || uuid(),
        name: c.name,
        emoji: c.emoji || "🏷️",
        subcategories: (c.subcategories || []).map(s => (typeof s === "string" ? { id: uuid(), name: s } : { id: s.id || uuid(), name: s.name || "" }))
      }));
    }

    this._renderCategories();
    EventBus.emit("categories-updated", this._categories);
  }

  // Persist categories to DB (simple clear + bulk)
  async _persistCategoriesToDb() {
    try {
      if (db && db.categories) {
        // clear and re-add preserving ids
        await db.transaction('rw', db.categories, async () => {
          await db.categories.clear();
          if (this._categories.length) {
            const toAdd = this._categories.map(c => ({
              id: c.id,
              name: c.name,
              emoji: c.emoji,
              subcategories: (c.subcategories || []).map(s => ({ id: s.id, name: s.name }))
            }));
            // bulkAdd will error on duplicate keys; use put instead
            for (const r of toAdd) await db.categories.put(r);
          }
        });
        return true;
      }
    } catch (e) {
      console.warn("Persist to DB failed", e);
    }

    try {
      // fallback to localStorage
      const dump = this._categories.map(c => ({
        id: c.id, name: c.name, emoji: c.emoji, subcategories: (c.subcategories || []).map(s => ({ id: s.id, name: s.name }))
      }));
      localStorage.setItem("categories", JSON.stringify(dump));
      return true;
    } catch (e) {
      console.error("Persist fallback failed", e);
      return false;
    }
  }

  async _persistCategories() {
    const ok = await this._persistCategoriesToDb();
    if (ok) {
      this._showToast("Categories saved");
      EventBus.emit("categories-updated", this._categories);
    } else {
      this._showToast("Failed to save categories");
    }
  }

  /* ---------------- UI binding ---------------- */
  _bind() {
    // helpers
    const $ = (sel) => this.querySelector(sel);

    // Export
    $("#btn-export")?.addEventListener("click", async () => {
      try {
        const snapshot = {
          meta: { exportedAt: new Date().toISOString() },
          categories: this._categories
        };
        // include transactions/settings if DB present
        if (db && db.transactions && db.settings) {
          const [txs, settings] = await Promise.all([db.transactions.toArray(), db.settings.toArray()]);
          snapshot.transactions = txs;
          snapshot.settings = settings;
        }
        const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `spendrill-export-${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        this._showToast("Export started");
      } catch (e) {
        console.error(e);
        this._showToast("Export failed");
      }
    });

    // Import
    const fileImport = $("#file-import");
    fileImport?.addEventListener("change", async (evt) => {
      const f = evt.target.files && evt.target.files[0];
      if (!f) return;
      try {
        const text = await f.text();
        const data = JSON.parse(text);
        let newCats = [];

        if (Array.isArray(data.categories) && data.categories.length && data.categories[0].subcategories !== undefined) {
          // likely our shape
          newCats = (data.categories || []).map(c => ({
            id: c.id || uuid(),
            name: c.name || "Unnamed",
            emoji: c.emoji || "🏷️",
            subcategories: (c.subcategories || []).map(s => ({ id: s.id || uuid(), name: s.name || "" }))
          }));
        } else if (Array.isArray(data.categories) && data.categories.length && data.categories[0].catId !== undefined) {
          // DB export shape (categories + subcategories separate) — reconstruct
          const catsById = {};
          (data.categories || []).forEach(c => catsById[c.id] = { id: c.id, name: c.name, emoji: c.emoji || "🏷️", subcategories: [] });
          (data.subcategories || []).forEach(s => {
            if (!catsById[s.catId]) catsById[s.catId] = { id: s.catId, name: "Unknown", emoji: "🏷️", subcategories: [] };
            catsById[s.catId].subcategories.push({ id: s.id, name: s.name });
          });
          newCats = Object.values(catsById);
        } else {
          // fallback to simple array of {name,subcategories}
          newCats = (data.categories || []).map(c => ({
            id: c.id || uuid(),
            name: c.name || c.title || "Unnamed",
            emoji: c.emoji || "🏷️",
            subcategories: (c.subcategories || []).map(s => (typeof s === "string" ? { id: uuid(), name: s } : { id: s.id || uuid(), name: s.name || "" }))
          }));
        }

        // save to db
        this._categories = newCats;
        await this._persistCategories();
        this._renderCategories();
        EventBus.emit("data-imported", data);
        this._showToast("Import successful");
      } catch (err) {
        console.error(err);
        this._showToast("Import failed");
      } finally {
        fileImport.value = "";
      }
    });

    // Choose backup folder
    $("#btn-choose-backup")?.addEventListener("click", async () => {
      EventBus.emit("choose-backup-folder");
    });

    // Backup now
    $("#btn-backup-now")?.addEventListener("click", async () => {
      // attempt auto-backup via app-level handler
      EventBus.emit("request-backup-now");
      this._showToast("Backup requested");
    });

    // Reset all
    $("#btn-reset-all")?.addEventListener("click", async () => {
      if (!confirm("Delete all app data (categories, transactions, settings)? This cannot be undone.")) return;
      try {
        if (typeof dbWipeAll === "function") {
          await dbWipeAll();
        } else if (db) {
          if (db.transactions) await db.transactions.clear();
          if (db.categories) await db.categories.clear();
          if (db.settings) await db.settings.clear();
        }
        // reload state
        this._categories = [];
        this._renderCategories();
        EventBus.emit("categories-updated", this._categories);
        this._showToast("All data cleared");
      } catch (e) {
        console.error(e);
        this._showToast("Reset failed");
      }
    });

    // Add category button
    $("#btn-add-cat")?.addEventListener("click", () => this._onAddCategory());

    // Security buttons — fire events (app listens)
    $("#btn-change-pin")?.addEventListener("click", () => EventBus.emit("request-change-pin", {}));
    $("#btn-toggle-bio")?.addEventListener("click", () => EventBus.emit("toggle-biometric", {}));
  }

  /* ---------------- Category UI rendering & CRUD --------------- */
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
      row.innerHTML = `
        <div class="cat-main">
          <button class="emoji-btn" data-idx="${idx}">${this._escape(c.emoji || "🏷️")}</button>
          <div class="cat-info">
            <div class="cat-name">${this._escape(c.name || "Unnamed")}</div>
            <div class="cat-subtext">${this._escape((c.subcategories||[]).map(s=>s.name).slice(0,3).join(", "))}${(c.subcategories && c.subcategories.length>3) ? "…" : ""}</div>
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

    // Wire handlers
    cont.querySelectorAll(".emoji-btn").forEach(b => b.addEventListener("click", (e) => this._onChangeEmoji(e.currentTarget.dataset.idx)));
    cont.querySelectorAll(".btn-edit").forEach(b => b.addEventListener("click", (e) => this._onEditCategory(e.currentTarget.dataset.idx)));
    cont.querySelectorAll(".btn-delete").forEach(b => b.addEventListener("click", (e) => this._onDeleteCategory(e.currentTarget.dataset.idx)));
    cont.querySelectorAll(".btn-subs").forEach(b => b.addEventListener("click", (e) => this._toggleSubpanel(e.currentTarget.dataset.idx)));
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
      for (let si = 0; si < cat.subcategories.length; si++) {
        const s = cat.subcategories[si];
        const item = document.createElement("div");
        item.className = "sub-row";
        item.innerHTML = `
          <div class="sub-left">${this._escape(s.name)}</div>
          <div class="sub-actions">
            <button class="btn btn-ghost edit-sub" data-c="${cat.id}" data-idx="${si}">Edit</button>
            <button class="btn btn-danger del-sub" data-c="${cat.id}" data-idx="${si}">Delete</button>
          </div>
        `;
        list.appendChild(item);
      }
    }

    const addWrap = document.createElement("div");
    addWrap.className = "sub-add";
    addWrap.innerHTML = `<button class="btn btn-ghost add-sub" data-c="${cat.id}">＋ Add subcategory</button>`;

    panel.appendChild(list);
    panel.appendChild(addWrap);

    // Wire
    panel.querySelectorAll(".edit-sub").forEach(b => b.addEventListener("click", (e) => {
      const catId = e.currentTarget.dataset.c;
      const idx = Number(e.currentTarget.dataset.idx);
      this._onEditSubcategory(catId, idx);
    }));
    panel.querySelectorAll(".del-sub").forEach(b => b.addEventListener("click", (e) => {
      const catId = e.currentTarget.dataset.c;
      const idx = Number(e.currentTarget.dataset.idx);
      this._onDeleteSubcategory(catId, idx);
    }));
    panel.querySelectorAll(".add-sub").forEach(b => b.addEventListener("click", (e) => {
      const catId = e.currentTarget.dataset.c;
      this._onAddSubcategory(catId);
    }));
  }

  async _onChangeEmoji(idx) {
    const i = Number(idx);
    const cat = this._categories[i];
    if (!cat) return;
    const emoji = prompt("Choose emoji (paste or type):", cat.emoji || "🏷️");
    if (emoji == null) return;
    this._categories[i] = { ...cat, emoji };
    await this._persistCategories();
    this._renderCategories();
    EventBus.emit("categories-updated", this._categories);
  }

  async _onEditCategory(idx) {
    const i = Number(idx);
    const cat = this._categories[i];
    if (!cat) return;
    const name = prompt("Category name:", cat.name || "");
    if (name == null) return;
    this._categories[i] = { ...cat, name };
    await this._persistCategories();
    this._renderCategories();
    EventBus.emit("categories-updated", this._categories);
  }

  async _onDeleteCategory(idx) {
    const i = Number(idx);
    const cat = this._categories[i];
    if (!cat) return;
    if (!confirm(`Delete "${cat.name}" and all its subcategories?`)) return;
    this._categories.splice(i, 1);
    await this._persistCategories();
    this._renderCategories();
    EventBus.emit("categories-updated", this._categories);
  }

  _onAddCategory() {
    const name = prompt("Category name:");
    if (!name) return;
    const emoji = prompt("Emoji for category (optional):", "🏷️") || "🏷️";
    const c = { id: uuid(), name, emoji, subcategories: [] };
    this._categories.push(c);
    this._persistCategories();
    this._renderCategories();
    EventBus.emit("categories-updated", this._categories);
  }

  _onAddSubcategory(catId) {
    const cat = this._categories.find(c => c.id === catId);
    if (!cat) return;
    const name = prompt(`Add subcategory under "${cat.name}":`);
    if (!name) return;
    cat.subcategories = cat.subcategories || [];
    cat.subcategories.push({ id: uuid(), name });
    this._persistCategories();
    // refresh any open subpanel
    const panel = this.querySelector(`#subpanel-${cat.id}`);
    if (panel && panel.style.display !== "none") this._renderSubpanel(cat, panel);
    this._renderCategories();
    EventBus.emit("categories-updated", this._categories);
  }

  _onEditSubcategory(catId, idx) {
    const cat = this._categories.find(c => c.id === catId);
    if (!cat || !cat.subcategories || !cat.subcategories[idx]) return;
    const s = cat.subcategories[idx];
    const name = prompt("Edit subcategory name:", s.name || "");
    if (name == null) return;
    s.name = name;
    this._persistCategories();
    const panel = this.querySelector(`#subpanel-${cat.id}`);
    if (panel && panel.style.display !== "none") this._renderSubpanel(cat, panel);
    this._renderCategories();
    EventBus.emit("categories-updated", this._categories);
  }

  _onDeleteSubcategory(catId, idx) {
    const cat = this._categories.find(c => c.id === catId);
    if (!cat || !cat.subcategories || !cat.subcategories[idx]) return;
    const s = cat.subcategories[idx];
    if (!confirm(`Delete subcategory "${s.name}"?`)) return;
    cat.subcategories.splice(idx, 1);
    this._persistCategories();
    const panel = this.querySelector(`#subpanel-${cat.id}`);
    if (panel && panel.style.display !== "none") this._renderSubpanel(cat, panel);
    this._renderCategories();
    EventBus.emit("categories-updated", this._categories);
  }

  /* ---------------- small utilities ---------------- */
  _escape(s = "") {
    return String(s).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  }

  _showToast(msg = "", timeout = 1600) {
    const t = this.querySelector("#settings-toast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("show");
    if (this._toastTimer) clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => t.classList.remove("show"), timeout);
  }
}

customElements.define("settings-screen", SettingsScreen);
