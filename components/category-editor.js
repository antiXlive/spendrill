// components/category-editor.js
// FINAL version with:
// - Clickable emoji + image boxes
// - Placeholder image for empty slots
// - Small X delete button for subcategories
// - Cleaner & structured layout
// - Full compatibility with Spendrill DB

import { EventBus } from "../js/event-bus.js";
import {
  updateCategory,
  addCategory,
  deleteCategory,
  getCategoryById
} from "../js/db.js";

/* Dark minimal placeholder image */

const PLACEHOLDER_IMG =
"data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDEyMCAxMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iNjAiIGN5PSI2MCIgcj0iNTYiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2FhYWFhYSIgc3Ryb2tlLXdpZHRoPSI0Ii8+PHBhdGggZD0iTTYwIDQwTDkwIDgwSDMwIiBmaWxsPSJub25lIiBzdHJva2U9IiNhYWFhYWEiIHN0cm9rZS13aWR0aD0iNCIvPjxjaXJjbGUgY3g9Ijg1IiBjeT0iNTQiIHI9IjYiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2FhYWFhYSIgc3Ryb2tlLXdpZHRoPSI0Ii8+PC9zdmc+";



  class CategoryEditor extends HTMLElement {
  constructor() {
    super();
    this.category = null;
    this._subcache = [];
    this._isNew = false;
  }

  connectedCallback() {
    this.classList.add("cat-editor");

    this.innerHTML = `
      <div class="ce-backdrop"></div>

      <div class="ce-sheet">
        <header class="ce-header">
          <button id="ce-cancel" class="header-btn ghost">Cancel</button>
          <div class="header-title">Edit Category</div>
          <button id="ce-save" class="header-btn acc">Save</button>
        </header>

        <div class="ce-body">

          <!-- CATEGORY CARD -->
          <section class="ce-card">
            <div class="ce-card-title">Basic Info</div>

            <div class="ce-icon-row">
              
              <!-- EMOJI SLOT -->
              <div class="ce-icon emoji" id="ce-emoji-box">
                <span id="ce-emoji-btn">🏷️</span>
                <button id="ce-emoji-remove" class="ce-remove-btn" style="display:none;">✕</button>
              </div>

              <!-- IMAGE SLOT -->
              <div class="ce-icon image" id="ce-image-box">
                <img id="ce-image-preview" class="ce-image" />
                <button id="ce-image-remove" class="ce-remove-btn" style="display:none;">✕</button>
                <input id="ce-image-input" type="file" accept="image/*" hidden />
              </div>

            </div>

            <label class="ce-label">Category Name</label>
            <input id="ce-name-input" class="ce-input" placeholder="Category name" />
          </section>

          <!-- SUBCATEGORY CARD -->
          <section class="ce-card">
            <div class="ce-card-title">Subcategories</div>

            <div id="ce-sub-list" class="ce-sub-list"></div>

            <button id="ce-add-sub" class="btn outline wide mt12">+ Add Subcategory</button>
          </section>

          <!-- DELETE CATEGORY -->
          <section class="ce-card danger-card">
            <button id="ce-delete-cat" class="btn danger wide" style="display:none;">
              Delete Category
            </button>
          </section>

        </div>
      </div>
    `;

    this._bind();
  }

  /* LOAD CATEGORY --------------------------------------------------- */
  async load(cat) {
    if (!cat) return;

    let full = cat;
    try {
      if (cat.id) {
        const dbCat = await getCategoryById(cat.id);
        if (dbCat) full = dbCat;
      }
    } catch (_) {}

    this._isNew = !full || !full.id || !full.name;

    this.category = JSON.parse(JSON.stringify(full || {
      id: (cat && cat.id) || String(Date.now()),
      name: "",
      emoji: "🏷️",
      image: "",
      subcategories: []
    }));

    this._subcache = [...(this.category.subcategories || [])];

    /* EMOJI */
    this.querySelector("#ce-emoji-btn").textContent = this.category.emoji || "●";
    this.querySelector("#ce-emoji-remove").style.display =
      this.category.emoji ? "block" : "none";

    /* CATEGORY IMAGE */
    const preview = this.querySelector("#ce-image-preview");

    if (this.category.image) {
      preview.src = this.category.image;
      this.querySelector("#ce-image-remove").style.display = "block";
    } else {
      preview.src = PLACEHOLDER_IMG;
      this.querySelector("#ce-image-remove").style.display = "none";
    }
    preview.style.display = "block";

    /* NAME */
    this.querySelector("#ce-name-input").value = this.category.name || "";

    /* DELETE BUTTON VISIBILITY */
    this.querySelector("#ce-delete-cat").style.display =
      this._isNew ? "none" : "block";

    this._renderSubcategories();

    requestAnimationFrame(() => this.classList.add("open"));
  }

  /* BIND EVENTS ----------------------------------------------------- */
  _bind() {
    const $ = sel => this.querySelector(sel);

    $(".ce-backdrop").addEventListener("click", () => this._close());
    $("#ce-cancel").addEventListener("click", () => this._close());
    $("#ce-save").addEventListener("click", () => this._onSave());

    /* ---- CLICK EMOJI ---- */
    $("#ce-emoji-box").addEventListener("click", e => {
      if (e.target.id === "ce-emoji-remove") return; // avoid double trigger

      const emo = prompt("Choose emoji:", this.category.emoji);
      if (emo != null) {
        this.category.emoji = emo.trim();
        $("#ce-emoji-btn").textContent = emo.trim();
        $("#ce-emoji-remove").style.display = "block";
      }
    });

    /* REMOVE EMOJI */
    $("#ce-emoji-remove").addEventListener("click", e => {
      e.stopPropagation();
      this.category.emoji = "";
      $("#ce-emoji-btn").textContent = "●";
      $("#ce-emoji-remove").style.display = "none";
    });

    /* ---- CLICK IMAGE BOX ---- */
    $("#ce-image-box").addEventListener("click", e => {
      if (e.target.id === "ce-image-remove") return;
      $("#ce-image-input").click();
    });

    /* IMAGE INPUT */
    $("#ce-image-input").addEventListener("change", e => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        this.category.image = reader.result;
        $("#ce-image-preview").src = reader.result;
        $("#ce-image-remove").style.display = "block";
      };
      reader.readAsDataURL(file);

      e.target.value = "";
    });

    /* REMOVE CATEGORY IMAGE */
    $("#ce-image-remove").addEventListener("click", e => {
      e.stopPropagation();
      this.category.image = "";
      $("#ce-image-preview").src = PLACEHOLDER_IMG;
      $("#ce-image-remove").style.display = "none";
    });

    /* NAME INPUT */
    $("#ce-name-input").addEventListener("input", e => {
      this.category.name = e.target.value;
    });

    /* ADD SUBCATEGORY */
    $("#ce-add-sub").addEventListener("click", () => {
      const name = prompt("Subcategory name:");
      if (!name) return;

      this._subcache.push({
        id: Date.now() + "-" + Math.random().toString(36).slice(2),
        name: name.trim(),
        emoji: "",
        image: ""
      });

      this._renderSubcategories();
    });

    /* DELETE CATEGORY */
    $("#ce-delete-cat").addEventListener("click", async () => {
      if (!confirm("Delete this category permanently?")) return;

      await deleteCategory(this.category.id, true);
      EventBus.emit("category-deleted", this.category.id);
      this._close();
    });
  }

  /* RENDER SUBCATEGORIES ------------------------------------------- */
  _renderSubcategories() {
    const list = this.querySelector("#ce-sub-list");
    list.innerHTML = "";

    if (!this._subcache.length) {
      list.innerHTML = `<div class="ce-sub-empty">No subcategories</div>`;
      return;
    }

    this._subcache.forEach((s, i) => {
      const row = document.createElement("div");
      row.className = "ce-sub-row";

      row.innerHTML = `
        <div class="ce-sub-left">

          <div class="ce-sub-emoji-box" data-idx="${i}">
            <span>${s.emoji || "●"}</span>
            <button class="ce-remove-btn sub-rem" data-idx="${i}" data-type="emoji" style="${s.emoji ? "" : "display:none"}">✕</button>
          </div>

          <input class="ce-input ce-sub-input" data-idx="${i}" value="${s.name || ""}" />
        </div>

        <div class="ce-sub-right">

          <div class="ce-sub-image-box" data-idx="${i}">
            <img src="${s.image || PLACEHOLDER_IMG}" class="ce-sub-image" />
            <button class="ce-remove-btn sub-rem" data-type="image" data-idx="${i}" style="${s.image ? "" : "display:none"}">✕</button>
            <input type="file" accept="image/*" class="ce-sub-img-input" hidden data-idx="${i}" />
          </div>

          <button class="ce-sub-delete-x" data-idx="${i}">✕</button>

        </div>
      `;

      list.appendChild(row);
    });

    /* NAME INPUT */
    list.querySelectorAll(".ce-sub-input").forEach(inp => {
      inp.addEventListener("input", e => {
        const idx = Number(e.target.dataset.idx);
        this._subcache[idx].name = e.target.value;
      });
    });

    /* CLICK EMOJI */
    list.querySelectorAll(".ce-sub-emoji-box").forEach(box => {
      box.addEventListener("click", e => {
        if (e.target.classList.contains("ce-remove-btn")) return;
        const idx = Number(box.dataset.idx);
        const emo = prompt("Emoji:", this._subcache[idx].emoji);
        if (emo != null) {
          this._subcache[idx].emoji = emo.trim();
          this._renderSubcategories();
        }
      });
    });

    /* REMOVE EMOJI */
    list.querySelectorAll('button[data-type="emoji"]').forEach(btn => {
      btn.addEventListener("click", e => {
        e.stopPropagation();
        const idx = Number(btn.dataset.idx);
        this._subcache[idx].emoji = "";
        this._renderSubcategories();
      });
    });

    /* CLICK IMAGE BOX */
    list.querySelectorAll(".ce-sub-image-box").forEach(box => {
      box.addEventListener("click", e => {
        if (e.target.classList.contains("ce-remove-btn")) return;
        const idx = Number(box.dataset.idx);
        const inp = list.querySelector(`.ce-sub-img-input[data-idx="${idx}"]`);
        inp.click();
      });
    });

    /* IMAGE INPUT */
    list.querySelectorAll(".ce-sub-img-input").forEach(input => {
      input.addEventListener("change", e => {
        const idx = Number(e.target.dataset.idx);
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
          this._subcache[idx].image = reader.result;
          this._renderSubcategories();
        };
        reader.readAsDataURL(file);
      });
    });

    /* REMOVE IMAGE */
    list.querySelectorAll('button[data-type="image"]').forEach(btn => {
      btn.addEventListener("click", e => {
        e.stopPropagation();
        const idx = Number(btn.dataset.idx);
        this._subcache[idx].image = "";
        this._renderSubcategories();
      });
    });

    /* DELETE SUBCATEGORY (small x) */
    list.querySelectorAll(".ce-sub-delete-x").forEach(btn => {
      btn.addEventListener("click", e => {
        const idx = Number(btn.dataset.idx);
        if (!confirm("Remove this subcategory?")) return;
        this._subcache.splice(idx, 1);
        this._renderSubcategories();
      });
    });
  }

  /* SAVE ------------------------------------------------------------ */
  async _onSave() {
    if (!this.category.name.trim()) {
      alert("Category name cannot be empty");
      return;
    }

    const payload = {
      name: this.category.name.trim(),
      emoji: this.category.emoji,
      image: this.category.image || "",
      subcategories: this._subcache.map(s => ({
        id: s.id,
        name: s.name,
        emoji: s.emoji || "",
        image: s.image || ""
      }))
    };

    if (this._isNew) {
      await addCategory({ id: this.category.id, ...payload });
    } else {
      await updateCategory(this.category.id, payload);
    }

    EventBus.emit("category-updated", { id: this.category.id, ...payload });
    this._close();
  }

  _close() {
    this.classList.remove("open");
    setTimeout(() => this.remove(), 250);
  }
}

customElements.define("category-editor", CategoryEditor);
