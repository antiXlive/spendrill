// components/ai-screen.js
import { EventBus } from "../js/event-bus.js";

class AIScreen extends HTMLElement {
  constructor() {
    super();
    this.images = [
      "../img/ai.jpg",
      "../img/ai1.png",
      "../img/ai2.jpg",
      "../img/ai3.png",
      "../img/ai4.jpg",
      "../img/ai5.jpg",
      "../img/ai6.jpg",
      "../img/ai7.jpg",
      "../img/ai8.jpg",
      "../img/ai9.jpg",
      "../img/ai10.jpg",
      "../img/ai11.jpg",
      "../img/ai12.jpg",
      "../img/ai13.jpg",
      "../img/ai14.jpg",
      "../img/ai15.jpg",

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
