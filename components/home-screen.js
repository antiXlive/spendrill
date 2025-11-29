// components/home-screen.js
import { EventBus } from "../js/event-bus.js";

class HomeScreen extends HTMLElement {

  constructor() {
    super();
    this.transactions = [];
  }

  connectedCallback() {
    this.render();
    this.bindEvents();

    EventBus.on("state-changed", (state) => {
      this.transactions = state.transactions || [];
      this.update();
    });

    // Hide on PIN screen
    EventBus.on("auth-state-changed", ({ showPin }) => {
      this.style.display = showPin ? "none" : "block";
    });
  }

  render() {
    this.innerHTML = `
      <link rel="stylesheet" href="../css/home-screen.css">

      <div class="home-container">
        <div class="empty">
          <p>No transactions yet.</p>
          <button id="addFirst">Add your first entry</button>
        </div>

        <div class="tx-list" id="txList"></div>
      </div>
    `;
  }

  bindEvents() {
    this.querySelector("#addFirst").addEventListener("click", () => {
      EventBus.emit("open-entry-sheet", {});
    });
  }

  update() {
    const list = this.querySelector("#txList");
    if (!this.transactions.length) {
      this.querySelector(".empty").style.display = "flex";
      list.innerHTML = "";
      return;
    }

    this.querySelector(".empty").style.display = "none";

    list.innerHTML = this.transactions
      .map(
        (tx) => `
        <div class="tx-card" data-id="${tx.id}">
          <div class="left">
            <div class="cat">${tx.category}</div>
            <div class="note">${tx.note || ""}</div>
          </div>
          <div class="right">
            <div class="amt">-${tx.amount}</div>
            <div class="date">${new Date(tx.date).toLocaleDateString()}</div>
          </div>
        </div>
      `
      )
      .join("");

    // Bind click to open edit sheet
    list.querySelectorAll(".tx-card").forEach((el) => {
      el.addEventListener("click", () =>
        EventBus.emit("edit-entry", { id: el.dataset.id })
      );
    });
  }
}

customElements.define("home-screen", HomeScreen);
