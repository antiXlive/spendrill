import { EventBus } from "../js/event-bus.js";
import { esc,fmtCurrency } from "../js/utils.js";
import { computeStats } from "../js/state-selectors.js";
import { renderDonutChart } from "../js/charts.js";

class StatsScreen extends HTMLElement{
  constructor(){
    super();
    this.stats=null;
    this.isLoading=true;
    this._donutId=`donut-${Math.random().toString(36).slice(2)}`;
    this._onStatsReady=(txList)=>{
      this.stats=computeStats(txList);
      this.isLoading=false;
      this.update();
    };
    this._onAuthState=({showPin})=>{
      this.style.display=showPin?"none":"block";
    };
  }

  connectedCallback(){
    this.render();
    EventBus.on("stats-ready",this._onStatsReady);
    EventBus.on("auth-state-changed",this._onAuthState);
    this.update();
  }

  disconnectedCallback(){
    EventBus.off("stats-ready",this._onStatsReady);
    EventBus.off("auth-state-changed",this._onAuthState);
  }

  render(){
    this.innerHTML=`
      <div class="stats-container">
        <div class="stats-header">
          <h1 class="stats-title">Statistics</h1>
          <p class="stats-subtitle">Your spending overview</p>
        </div>
        <div class="stats-content" id="statsBlock">
          <div class="stats-loading">
            <div class="loading-spinner"></div>
            <p>Loading your statistics...</p>
          </div>
        </div>
      </div>
    `;
  }

  update(){
    const block=this.querySelector("#statsBlock");
    if(!block) return;

    if(this.isLoading||!this.stats){
      block.innerHTML=`
        <div class="stats-loading">
          <div class="loading-spinner"></div>
          <p>Loading your statistics...</p>
        </div>`;
      return;
    }

    const {total,average,topCategory,categories}=this.stats;
    if(!categories.length){
      block.innerHTML=this._empty();
      return;
    }

    block.innerHTML=`
      ${this._summary(total,average,topCategory,categories.length)}
      ${this._donut(categories,total)}
      ${this._catList(categories,total)}
    `;

    requestAnimationFrame(()=>{
      const svg=this.querySelector(`#${this._donutId}`);
      renderDonutChart(svg,categories);
    });
  }

  _summary(total,avg,top,count){
    return`
      <div class="summary-card">
        <div class="summary-header">
          <div class="summary-icon">
            <svg viewBox="0 0 24 24" width="28" height="28"><path d="M21 12c.55 0 1-.45.95-.998A10 10 0 0 0 13 2.05c-.55-.05-1 .4-1 .95v8a1 1 0 0 0 1 1z"/><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/></svg>
          </div>
          <div class="summary-main">
            <div class="summary-label">Total Spending</div>
            <div class="summary-amount">${fmtCurrency(total)}</div>
          </div>
        </div>
        <div class="summary-stats">
          <div class="summary-stat"><div class="stat-label">Categories</div><div class="stat-value">${count}</div></div>
          <div class="summary-divider"></div>
          <div class="summary-stat"><div class="stat-label">Avg Spend</div><div class="stat-value">${fmtCurrency(avg)}</div></div>
          <div class="summary-divider"></div>
          <div class="summary-stat"><div class="stat-label">Top Category</div><div class="stat-value">${esc(top||"N/A")}</div></div>
        </div>
      </div>
    `;
  }

  _donut(categories,total){
    const legend=categories.map(c=>`
      <div class="legend-item">
        <div class="legend-color"></div>
        <div class="legend-label">${esc(c.name)}</div>
        <div class="legend-value">${c.percent.toFixed(1)}%</div>
      </div>
    `).join("");

    return`
      <div class="chart-section">
        <div class="section-title">Spending by Category</div>
        <div class="donut-container">
          <div class="donut-wrapper">
            <svg class="donut-chart" viewBox="0 0 200 200" id="${this._donutId}"></svg>
            <div class="donut-center">
              <div class="donut-total">${fmtCurrency(total)}</div>
              <div class="donut-label">Total</div>
            </div>
          </div>
          <div class="chart-legend">${legend}</div>
        </div>
      </div>
    `;
  }

  _catList(categories,total){
    return`
      <div class="categories-section">
        <div class="section-title">All Categories</div>
        <div class="categories-list">
          ${categories.map(c=>`
            <div class="category-item">
              <div class="category-header">
                <span class="category-name">${esc(c.name)}</span>
                <span class="category-amount">${fmtCurrency(c.value)}</span>
                <span class="category-percent">${c.percent.toFixed(1)}%</span>
              </div>
              <div class="category-bar">
                <div class="category-bar-fill" style="width:${c.percent}%"></div>
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }

  _empty(){
    return`
      <div class="stats-empty">
        <svg viewBox="0 0 24 24" width="48" height="48">
          <circle cx="12" cy="12" r="10" fill="rgba(255,255,255,0.04)"/>
          <path d="M12 6v6l4 2" stroke="currentColor" stroke-width="1.5" fill="none"/>
        </svg>
        <h3>No Data Yet</h3>
        <p>Start adding expenses to see your statistics</p>
      </div>
    `;
  }
}

customElements.define("stats-screen",StatsScreen);
