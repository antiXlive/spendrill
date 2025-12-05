export function renderDonutChart(svgEl, dataset) {
    if (!svgEl) return;
    svgEl.innerHTML = "";
    const colors = ["#2563eb", "#06b6d4", "#2dd4bf", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];
    const radius = 90,
        circ = 2 * Math.PI * radius;
    let angle = -90;
    const ns = "http://www.w3.org/2000/svg";
    const base = document.createElementNS(ns, "circle");
    base.setAttribute("cx", 100);
    base.setAttribute("cy", 100);
    base.setAttribute("r", radius);
    base.setAttribute("fill", "none");
    base.setAttribute("stroke", "rgba(255,255,255,0.05)");
    base.setAttribute("stroke-width", 30);
    svgEl.appendChild(base);
    const total = dataset.reduce((s, d) => s + (d.value || 0), 0);
    if (!total) return;
    dataset.slice(0, 8).forEach((d, i) => {
        const pct = (d.value || 0) / total;
        const arc = pct * circ;
        const a = pct * 360;
        const slice = document.createElementNS(ns, "circle");
        slice.setAttribute("cx", 100);
        slice.setAttribute("cy", 100);
        slice.setAttribute("r", radius);
        slice.setAttribute("fill", "none");
        slice.setAttribute("stroke", colors[i % colors.length]);
        slice.setAttribute("stroke-width", 30);
        slice.setAttribute("stroke-dasharray", `${arc} ${circ}`);
        slice.setAttribute("transform", `rotate(${angle} 100 100)`);
        svgEl.appendChild(slice);
        angle += a;
    });
}
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

