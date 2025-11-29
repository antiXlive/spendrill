// components/entry-sheet.js
import { EventBus } from "../js/event-bus.js";

class EntrySheet extends HTMLElement {
  constructor() {
    super();
    this.mode = "add";
    this.data = null;
  }

  connectedCallback() {
    this.render();
    this.bindEvents();

    // Open for ADD
    EventBus.on("open-entry-sheet", () => {
      this.mode = "add";
      this.data = null;
      this.resetFields();
      this.open();
    });

    // Open for EDIT
    EventBus.on("edit-entry", ({ id }) => {
      EventBus.emit("request-tx-by-id", { id });
    });

    EventBus.on("tx-by-id", ({ tx }) => {
      if (!tx) return;
      this.mode = "edit";
      this.data = structuredClone(tx);
      this.fillFields(tx);
      this.open();
    });

    EventBus.on("auth-state-changed", ({ showPin }) => {
      if (showPin) this.close(true);
    });
  }

  render() {
    this.innerHTML = `
      <link rel="stylesheet" href="../css/entry-sheet.css">

      <div class="overlay" id="overlay"></div>

      <div class="sheet" id="sheet">
        <div class="header">
          <div class="sheet-title" id="sheetTitle">Add Entry</div>
          <button class="close-btn" id="closeBtn">✕</button>
        </div>

        <div class="form">
          <label>Amount</label>
          <input type="number" id="amount" placeholder="0.00" />

          <label>Date</label>
          <input type="date" id="date" />

          <label>Category</label>
          <select id="category"></select>

          <label>Note (optional)</label>
          <input type="text" id="note" placeholder="Short note" />

          <button id="saveBtn" class="primary">Save</button>
          <button id="deleteBtn" class="danger hidden">Delete</button>
        </div>
      </div>
    `;
  }

  bindEvents() {
    this.querySelector("#closeBtn").addEventListener("click", () => this.close());
    this.querySelector("#overlay").addEventListener("click", () => this.close());

    this.querySelector("#saveBtn").addEventListener("click", () => {
      const tx = this.collectInput();
      if (!tx) return;

      if (this.mode === "add") {
        EventBus.emit("tx-add", { tx });
      } else {
        EventBus.emit("tx-update", { tx: { ...tx, id: this.data.id } });
      }

      this.close();
    });

    this.querySelector("#deleteBtn").addEventListener("click", () => {
      if (!this.data?.id) return;
      EventBus.emit("tx-delete", { id: this.data.id });
      this.close();
    });

    // Category list update
    EventBus.on("state-changed", (state) => {
      const select = this.querySelector("#category");
      select.innerHTML = state.categories
        .map((c) => `<option value="${c}">${c}</option>`)
        .join("");

      if (this.mode === "edit" && this.data) {
        select.value = this.data.category;
      }
    });
  }

  collectInput() {
    const amount = parseFloat(this.querySelector("#amount").value);
    const date = this.querySelector("#date").value;
    const category = this.querySelector("#category").value;
    const note = this.querySelector("#note").value;

    if (!amount || amount <= 0) {
      EventBus.emit("toast", { message: "Enter valid amount", type: "error" });
      return null;
    }

    if (!date) {
      EventBus.emit("toast", { message: "Select a date", type: "error" });
      return null;
    }

    return {
      amount,
      date,
      category,
      note
    };
  }

  resetFields() {
    this.querySelector("#sheetTitle").textContent = "Add Entry";
    this.querySelector("#deleteBtn").classList.add("hidden");
    this.querySelector("#amount").value = "";
    this.querySelector("#date").valueAsDate = new Date();
    this.querySelector("#note").value = "";
  }

  fillFields(tx) {
    this.querySelector("#sheetTitle").textContent = "Edit Entry";
    this.querySelector("#deleteBtn").classList.remove("hidden");

    this.querySelector("#amount").value = tx.amount;
    this.querySelector("#date").value = tx.date.slice(0, 10);
    this.querySelector("#note").value = tx.note || "";
  }

  open() {
    this.querySelector("#overlay").classList.add("show");
    this.querySelector("#sheet").classList.add("open");
  }

  close(force = false) {
    this.querySelector("#overlay").classList.remove("show");
    this.querySelector("#sheet").classList.remove("open");

    // Delay removal of content for animation timing
    setTimeout(() => {
      if (!force) EventBus.emit("entry-close");
    }, 200);
  }
}

customElements.define("entry-sheet", EntrySheet);
