
export function renderMiniBarChart(svgEl, values) {
  if (!svgEl) return;
  if (!values.length) {
    svgEl.innerHTML = "";
    return;
  }

  const w = 160;
  const h = 60;
  const pad = 6;
  const max = Math.max(...values, 1);
  const step = w / values.length;

  let html = `
    <defs>
      <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style="stop-color:#ff6b81; opacity:1;" />
        <stop offset="100%" style="stop-color:#ff4757; opacity:0.8;" />
      </linearGradient>
    </defs>
  `;

  values.forEach((v, i) => {
    const barW = Math.max(4, Math.floor(step * 0.7));
    const x = Math.floor(i * step) + Math.floor((step - barW) / 2);
    const barH = Math.round((v / max) * (h - pad * 2));
    const y = h - pad - barH;

    html += `
      <rect
        x="${x}" y="${y}"
        width="${barW}" height="${barH}"
        rx="4"
        fill="url(#chartGradient)"
      />
    `;
  });

  svgEl.innerHTML = html;
}

// charts.js — FINAL VERSION WITH INDEX + DARK PALETTE + STABLE SELECTION

export function renderDonutChart(svgEl, rawData = [], options = {}) {
  const opt = {
    innerRadiusPct: options.innerRadiusPct ?? 0.56,
    padAngle: (options.padAngle ?? 1) * (Math.PI / 180),
    colors: options.colors || null,
    onSliceClick: typeof options.onSliceClick === "function" ? options.onSliceClick : null
  };

  const ns = "http://www.w3.org/2000/svg";

  function clear() {
    while (svgEl.firstChild) svgEl.removeChild(svgEl.firstChild);
  }

  const data = rawData.map(d => ({ ...d }));
  const total = data.reduce((n, d) => n + (Number(d.value) || 0), 0);

  if (!data.every(d => typeof d.percent === "number")) {
    data.forEach(d => d.percent = total ? (d.value / total) * 100 : 0);
  }

  const palette = [
    "#7f8ac7",
    "#9086a6",
    "#77a4a2",
    "#c1a87a",
    "#7990d0",
    "#a0aac8",
    "#b48fb1",
    "#7fb3a6",
    "#c79fa1",
    "#bfb982"
  ];

  const colors = opt.colors || palette;

  clear();

  const cx = 100, cy = 100;
  const outerR = 88;
  const innerR = outerR * opt.innerRadiusPct;
  const totalRad = Math.PI * 2;

  const group = document.createElementNS(ns, "g");
  svgEl.appendChild(group);

  let startA = -Math.PI / 2;
  const slices = [];

  function arcPath(r1, r2, a0, a1) {
    const large = (a1 - a0) > Math.PI ? 1 : 0;

    const x1 = cx + r1 * Math.cos(a0),
      y1 = cy + r1 * Math.sin(a0);

    const x2 = cx + r1 * Math.cos(a1),
      y2 = cy + r1 * Math.sin(a1);

    const x3 = cx + r2 * Math.cos(a1),
      y3 = cy + r2 * Math.sin(a1);

    const x4 = cx + r2 * Math.cos(a0),
      y4 = cy + r2 * Math.sin(a0);

    return `
      M ${x1} ${y1}
      A ${r1} ${r1} 0 ${large} 1 ${x2} ${y2}
      L ${x3} ${y3}
      A ${r2} ${r2} 0 ${large} 0 ${x4} ${y4}
      Z
    `;
  }

  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    const frac = item.percent / 100;

    const endA = startA + frac * totalRad;
    const midA = (startA + endA) / 2;

    const d = arcPath(
      outerR,
      innerR,
      startA + opt.padAngle,
      endA - opt.padAngle
    );

    const slice = document.createElementNS(ns, "path");
    slice.setAttribute("d", d);
    slice.setAttribute("fill", colors[i % colors.length]);
    slice.classList.add("donut-slice");

    const sliceG = document.createElementNS(ns, "g");
    sliceG.appendChild(slice);

    sliceG.__meta = { item, index: i, midA };

    sliceG.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      select(i);
      if (opt.onSliceClick) opt.onSliceClick(item, i);
    });

    group.appendChild(sliceG);
    slices.push(sliceG);

    startA = endA;
  }

  function select(i) {
    slices.forEach(s => {
      s.classList.remove("selected");
      s.style.transform = "translate(0,0)";
    });

    const s = slices[i];
    if (!s) return;

    s.classList.add("selected");

    const dx = Math.cos(s.__meta.midA) * 12;
    const dy = Math.sin(s.__meta.midA) * 12;
    s.style.transform = `translate(${dx}px, ${dy}px)`;
  }

  svgEl.__donut = {
    selectByIndex: select
  };
}
