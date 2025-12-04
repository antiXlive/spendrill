// components/category-editor.js
// Full-screen category editor modal
// - Opens as a slide-up page
// - Edit category name, emoji, image
// - Manage subcategories (add/edit/delete)
// - Emits: category-updated, category-deleted

import { EventBus } from "../js/event-bus.js";
import {
  updateCategory,
  deleteCategory,
  addCategory,
  getAllCategories
} from "../js/db.js";

class CategoryEditor extends HTMLElement {
  constructor() {
    super();
    this.category = null; // full category object
    this._subcache = [];  // local editing copy
  }

  connectedCallback() {
    this.innerHTML = `
      <div class="cat-editor-backdrop"></div>

      <div class="cat-editor-sheet" data-screen="category-editor">
        <div class="cat-editor-header">
          <button class="back-btn">←</button>
          <div class="header-title">Edit Category</div>
          <div style="width:40px;"></div>
        </div>

        <div class="cat-editor-body">

          <!-- CATEGORY MAIN -->
          <section class="ce-section">
            <div class="ce-label">Emoji</div>
            <button id="ce-emoji-btn" class="ce-emoji">😀</button>

            <div class="ce-label mt16">Category Name</div>
            <input id="ce-name-input" class="ce-input" placeholder="Category name" />
          </section>

          <section class="ce-section">
            <div class="ce-section-title">Subcategories</div>
            <div id="ce-sub-list" class="ce-sub-list"></div>

            <button id="ce-add-sub" class="ce-add-sub-btn">+ Add Subcategory</button>
          </section>

          <section class="ce-section">
            <button id="ce-delete-cat" class="ce-delete-cat-btn">
              Delete Category
            </button>
          </section>

        </div>
      </div>
    `;

    this._bind();
  }

  /* -----------------------------------------------------------
     PUBLIC: Load the category to edit
  ----------------------------------------------------------- */
  load(cat) {
    this.category = JSON.parse(JSON.stringify(cat));// clone
    this._subcache = [...(cat.subcategories || [])];

    this.querySelector("#ce-emoji-btn").textContent = cat.emoji || "🏷️";
    this.querySelector("#ce-name-input").value = cat.name || "";

    this._renderSubcategories();

    requestAnimationFrame(() => {
      this.classList.add("open");
    });
  }

  /* -----------------------------------------------------------
     Event Bindings
  ----------------------------------------------------------- */
  _bind() {
    const $ = (sel) => this.querySelector(sel);

    // Close
    $(".back-btn").addEventListener("click", () => this.close());
    $(".cat-editor-backdrop").addEventListener("click", () => this.close());

    // Emoji change
    $("#ce-emoji-btn").addEventListener("click", async () => {
      const emoji = prompt("Choose emoji:", this.category.emoji || "🏷️");
      if (!emoji) return;
      this.category.emoji = emoji.trim();
      $("#ce-emoji-btn").textContent = this.category.emoji;
    });

    // Category name
    $("#ce-name-input").addEventListener("input", (e) => {
      this.category.name = e.target.value.trim();
    });

    // Add subcategory
    $("#ce-add-sub").addEventListener("click", () => this._addSubcategory());

    // Delete category
    $("#ce-delete-cat").addEventListener("click", () => {
      if (!confirm(`Delete category "${this.category.name}"?\nThis action cannot be undone.`)) return;
      deleteCategory(this.category.id, true).then(() => {
        EventBus.emit("category-deleted", this.category.id);
        this.close();
      });
    });
  }

  /* -----------------------------------------------------------
     Rendering Subcategories
  ----------------------------------------------------------- */
  _renderSubcategories() {
    const list = this.querySelector("#ce-sub-list");
    list.innerHTML = "";

    if (!this._subcache.length) {
      list.innerHTML = `<div class="ce-sub-empty">No subcategories yet</div>`;
      return;
    }

    this._subcache.forEach((s, i) => {
      const row = document.createElement("div");
      row.className = "ce-sub-row";
      row.innerHTML = `
        <input class="ce-input ce-sub-input" value="${s.name}" data-idx="${i}" />

        <button class="ce-sub-del" data-idx="${i}">✕</button>
      `;
      list.appendChild(row);
    });

    // Wiring sub inputs
    list.querySelectorAll(".ce-sub-input").forEach((inp) => {
      inp.addEventListener("input", (e) => {
        const idx = Number(e.target.dataset.idx);
        this._subcache[idx].name = e.target.value.trim();
      });
    });

    // Delete buttons
    list.querySelectorAll(".ce-sub-del").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const idx = Number(e.target.dataset.idx);
        this._subcache.splice(idx, 1);
        this._renderSubcategories();
      });
    });
  }

  /* -----------------------------------------------------------
     CRUD
  ----------------------------------------------------------- */
  _addSubcategory() {
    const name = prompt("Subcategory name:");
    if (!name || !name.trim()) return;

    this._subcache.push({ name: name.trim() });
    this._renderSubcategories();
  }

  async save() {
    // Validate
    if (!this.category.name) {
      alert("Category name cannot be empty");
      return;
    }

    const upd = {
      name: this.category.name,
      emoji: this.category.emoji || "🏷️",
      subcategories: this._subcache
    };

    await updateCategory(this.category.id, upd);

    EventBus.emit("category-updated", upd);
  }

  /* -----------------------------------------------------------
     Closing animation
  ----------------------------------------------------------- */
  async close() {
    await this.save();

    this.classList.remove("open");
    setTimeout(() => this.remove(), 280);
  }
}

customElements.define("category-editor", CategoryEditor);
