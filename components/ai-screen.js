// components/ai-screen.js
import { EventBus } from "../js/event-bus.js";

class AIScreen extends HTMLElement {
  constructor() {
    super();
    this.images = [
      "/spendrill/img/ai.jpg",
      "/spendrill/img/ai1.png",
      "/spendrill/img/ai2.jpg",
      "/spendrill/img/ai3.png",
      "/spendrill/img/ai4.jpg",
      "/spendrill/img/ai5.jpg",
      "/spendrill/img/ai6.jpg",
      "/spendrill/img/ai7.jpg",
      "/spendrill/img/ai8.jpg",
      "/spendrill/img/ai9.jpg",
      "/spendrill/img/ai10.jpg",
      "/spendrill/img/ai11.jpg",
      "/spendrill/img/ai12.jpg",
      "/spendrill/img/ai13.jpg",
      "/spendrill/img/ai14.jpg",
      "/spendrill/img/ai15.jpg",

    ];
  }

  connectedCallback() {
    this.render();
  }

  render() {
    this.innerHTML = `
      <div class="ai-scroll-test">
        ${this.images
          .map(
            (src) => `
          <div class="ai-test-section" style="background-image: url('${src}')">
            <div class="ai-test-overlay">
              <h1>Glass Blur Test</h1>
              <p>Scrolling to test blur transparency...</p>
            </div>
          </div>
        `
          )
          .join("")}
      </div>
    `;
  }
}

customElements.define("ai-screen", AIScreen);
