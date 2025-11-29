// js/worker-stats.js
self.addEventListener('message', (e) => {
  const { type, payload } = e.data;
  if (type === 'compute') {
    const txs = payload.transactions || [];
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${now.getMonth()+1}`;

    let monthlyTotal = 0;
    const categoryTotals = {};
    let sum = 0;
    let count = 0;

    for (const t of txs) {
      const date = new Date(t.date);
      sum += t.amount || 0;
      count++;
      const key = `${date.getFullYear()}-${date.getMonth()+1}`;
      if (key === monthKey) monthlyTotal += t.amount || 0;
      const cat = t.category || 'Uncategorized';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + (t.amount || 0);
    }

    const average = count ? Math.round(sum / count) : 0;
    let topCategory = null;
    let topAmount = 0;
    for (const k of Object.keys(categoryTotals)) {
      if (categoryTotals[k] > topAmount) { topAmount = categoryTotals[k]; topCategory = k; }
    }

    const months = {};
    for (const t of txs) {
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${d.getMonth()+1}`;
      months[key] = (months[key] || 0) + (t.amount || 0);
    }
    const sortedMonths = Object.keys(months).sort();
    const trend = sortedMonths.slice(-3).map(k => ({ month: k, total: months[k] }));

    const res = { monthlyTotal, categoryTotals, average, topCategory, trend };
    self.postMessage({ type: 'stats', payload: res });
  }
});
