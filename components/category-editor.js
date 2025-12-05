// components/category-editor.js
// Fullscreen Category Editor (Improved Layout + Same Theme)
// Emits: category-updated, category-deleted

import { EventBus } from "../js/event-bus.js";
import {
  updateCategory,
  addCategory,
  deleteCategory,
  getCategoryById
} from "../js/db.js";

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

        <!-- HEADER -->
        <header class="ce-header">
          <button id="ce-cancel" class="header-btn ghost">Cancel</button>
          <div class="header-title">Edit Category</div>
          <button id="ce-save" class="header-btn acc">Save</button>
        </header>

        <div class="ce-body">

          <!-- CATEGORY CARD -->
          <section class="ce-card">
            <div class="ce-card-title">Category Details</div>

            <div class="ce-icon-grid">
              <button id="ce-emoji-btn" class="ce-icon-box emoji">🏷️</button>

              <div class="ce-icon-box image">
                <img id="ce-image-preview" class="ce-image" alt="" />
              </div>

              <div class="ce-image-controls">
                <input id="ce-image-input" type="file" accept="image/*" hidden />
                <button id="ce-image-btn" class="btn small">Change Image</button>
                <button id="ce-image-remove" class="btn small danger">Remove</button>
              </div>
            </div>

            <label class="ce-label">Name</label>
            <input id="ce-name-input" class="ce-input" placeholder="Category name" />
          </section>

          <!-- SUBCATEGORIES -->
          <section class="ce-card">
            <div class="ce-card-title">Subcategories</div>

            <div id="ce-sub-list" class="ce-sub-list"></div>

            <button id="ce-add-sub" class="btn outline wide mt12">+ Add Subcategory</button>
          </section>

          <!-- DELETE CATEGORY -->
          <section>
            <button id="ce-delete-cat" class="btn danger wide" style="display:none;">
              Delete Category
            </button>
          </section>
        </div>
      </div>
    `;

    this._bind();
  }

  /* ---------------------------------
     LOAD CATEGORY INTO UI
  ---------------------------------- */
  async load(cat) {
    if (!cat) return;

    let full = cat;
    try {
      if (cat.id) {
        const dbCat = await getCategoryById(cat.id);
        if (dbCat) full = dbCat;
      }
    } catch (e) {}

    this._isNew = !full || !full.id || !full.name;

    this.category = JSON.parse(JSON.stringify(full || {
      id: (cat && cat.id) || String(Date.now()),
      name: "",
      emoji: "🏷️",
      image: "",
      subcategories: []
    }));

    this._subcache = (this.category.subcategories || []).map(s => ({ ...s }));

    // Fill UI
    this.querySelector("#ce-emoji-btn").textContent = this.category.emoji;
    this.querySelector("#ce-name-input").value = this.category.name || "";

    const imgPreview = this.querySelector("#ce-image-preview");
    if (this.category.image) {
      imgPreview.src = this.category.image;
      imgPreview.style.display = "block";
    } else {
      imgPreview.src = "";
      imgPreview.style.display = "none";
    }

    this.querySelector("#ce-delete-cat").style.display =
      this._isNew ? "none" : "block";

    this._renderSubcategories();

    requestAnimationFrame(() => {
      this.classList.add("open");
    });
  }

  /* ---------------------------------
     EVENT BINDING
  ---------------------------------- */
  _bind() {
    const $ = sel => this.querySelector(sel);

    $(".ce-backdrop").addEventListener("click", () => this._onCancel());
    $("#ce-cancel").addEventListener("click", () => this._onCancel());

    $("#ce-save").addEventListener("click", () => this._onSave());

    // Emoji change
    $("#ce-emoji-btn").addEventListener("click", () => {
      const emoji = prompt("Choose emoji:", this.category.emoji);
      if (emoji == null) return;
      this.category.emoji = emoji.trim();
      $("#ce-emoji-btn").textContent = this.category.emoji;
    });

    // Name input
    $("#ce-name-input").addEventListener("input", e => {
      this.category.name = e.target.value;
    });

    // Image upload
    const imgInput = $("#ce-image-input");
    const imgPreview = $("#ce-image-preview");

    $("#ce-image-btn").addEventListener("click", () => imgInput.click());

    imgInput.addEventListener("change", e => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        this.category.image = reader.result;
        imgPreview.src = reader.result;
        imgPreview.style.display = "block";
      };
      reader.readAsDataURL(file);

      imgInput.value = "";
    });

    $("#ce-image-remove").addEventListener("click", () => {
      if (!this.category.image) return;
      if (!confirm("Remove image?")) return;

      this.category.image = "";
      imgPreview.src = "";
      imgPreview.style.display = "none";
    });

    // Add subcategory
    $("#ce-add-sub").addEventListener("click", () => {
      const name = prompt("Subcategory name:");
      if (!name) return;

      this._subcache.push({
        id: String(Date.now()) + "-" + Math.random().toString(36).slice(2),
        name: name.trim(),
        emoji: "",
        image: ""
      });

      this._renderSubcategories();
    });

    // Delete entire category
    $("#ce-delete-cat").addEventListener("click", async () => {
      if (!confirm(`Delete category "${this.category.name}"?`)) return;

      try {
        await deleteCategory(this.category.id, true);
        EventBus.emit("category-deleted", this.category.id);
        this._close();
      } catch (err) {
        alert(err.message || "Delete failed");
      }
    });
  }

  /* ---------------------------------
     RENDER SUBCATEGORIES
  ---------------------------------- */
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
          <div class="ce-sub-emoji" data-idx="${i}">
            ${this._escape(s.emoji || "●")}
          </div>

          <input class="ce-input ce-sub-input"
                 data-idx="${i}"
                 value="${this._escape(s.name || "")}">
        </div>

        <div class="ce-sub-right">
          ${
            s.image
              ? `<img class="ce-sub-image-preview" src="${s.image}" />`
              : ""
          }

          <button class="btn small ce-sub-emoji-btn" data-idx="${i}">
            Emoji
          </button>

          <button class="btn small ce-sub-img-btn" data-idx="${i}">
            Image
          </button>

          <button class="btn small danger ce-sub-del" data-idx="${i}">
            Delete
          </button>

          <input class="ce-sub-img-input" type="file" accept="image/*" hidden data-idx="${i}" />
        </div>
      `;

      list.appendChild(row);
    });

    // Bind input
    list.querySelectorAll(".ce-sub-input").forEach(inp => {
      inp.addEventListener("input", e => {
        const idx = Number(e.target.dataset.idx);
        this._subcache[idx].name = e.target.value;
      });
    });

    // Emoji editing
    list.querySelectorAll(".ce-sub-emoji-btn").forEach(btn => {
      btn.addEventListener("click", e => {
        const idx = Number(e.currentTarget.dataset.idx);
        const emo = prompt("Emoji:", this._subcache[idx].emoji || "");
        if (emo == null) return;

        this._subcache[idx].emoji = emo.trim();
        this._renderSubcategories();
      });
    });

    // Delete subcategory
    list.querySelectorAll(".ce-sub-del").forEach(btn => {
      btn.addEventListener("click", e => {
        const idx = Number(e.currentTarget.dataset.idx);
        if (!confirm("Delete subcategory?")) return;

        this._subcache.splice(idx, 1);
        this._renderSubcategories();
      });
    });

    // Image upload for subcategory
    list.querySelectorAll(".ce-sub-img-btn").forEach(btn => {
      btn.addEventListener("click", e => {
        const idx = Number(e.target.dataset.idx);
        const input = list.querySelector(`.ce-sub-img-input[data-idx="${idx}"]`);
        input.click();
      });
    });

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
        input.value = "";
      });
    });

    // Clicking emoji square
    list.querySelectorAll(".ce-sub-emoji").forEach(el => {
      el.addEventListener("click", ev => {
        const idx = Number(ev.currentTarget.dataset.idx);
        const emo = prompt("Emoji:", this._subcache[idx].emoji || "");
        if (emo == null) return;

        this._subcache[idx].emoji = emo.trim();
        this._renderSubcategories();
      });
    });
  }

  /* ---------------------------------
     SAVE CATEGORY
  ---------------------------------- */
  async _onSave() {
    if (!this.category.name || !this.category.name.trim()) {
      alert("Category name cannot be empty");
      return;
    }

    const payload = {
      name: this.category.name.trim(),
      emoji: this.category.emoji,
      image: this.category.image || "",
      subcategories: this._subcache.map(s => ({
        id: s.id || String(Date.now()) + "-" + Math.random().toString(36).slice(2),
        name: s.name,
        emoji: s.emoji || "",
        image: s.image || ""
      }))
    };

    try {
      if (!this._isNew) {
        await updateCategory(this.category.id, payload);
      } else {
        const id = this.category.id;
        await addCategory({ id, ...payload });
      }

      EventBus.emit("category-updated", { id: this.category.id, ...payload });
      this._close();
    } catch (err) {
      alert(err.message || "Save failed");
    }
  }

  /* ---------------------------------
     CLOSE MODAL
  ---------------------------------- */
  _onCancel() {
    this._close();
  }

  _close() {
    this.classList.remove("open");
    setTimeout(() => this.remove(), 260);
  }

  _escape(s = "") {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }
}

customElements.define("category-editor", CategoryEditor);
