self.onmessage = (e) => {
  const { type, payload } = e.data;
  if (type !== "compute") return;

  const txs = payload.transactions || [];
  if (!txs.length) {
    self.postMessage({
      type: "stats",
      payload: {
        monthlyTotal: 0,
        categoryTotals: {},
        average: 0,
        topCategory: null,
        trend: []
      }
    });
    return;
  }

  const parseDate = (iso) => new Date(iso);
  const monthKeyOf = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

  const now = new Date();
  const currentMonthKey = monthKeyOf(now);

  let sum = 0;
  let count = 0;

  const categoryTotals = {};
  const monthTotals = {};

  for (const t of txs) {
    const amount = Number(t.amount) || 0;

    const d = parseDate(t.date);
    const mKey = monthKeyOf(d);

    sum += amount;
    count++;

    // FIX: Always use snake_case catId (matches UI)
    const cat = t.catId || "uncategorized";
    categoryTotals[cat] = (categoryTotals[cat] || 0) + amount;

    monthTotals[mKey] = (monthTotals[mKey] || 0) + amount;
  }

  const monthlyTotal = monthTotals[currentMonthKey] || 0;
  const average = count ? Math.round(sum / count) : 0;

  let topCategory = null;
  let topAmount = 0;
  for (const cat in categoryTotals) {
    if (categoryTotals[cat] > topAmount) {
      topAmount = categoryTotals[cat];
      topCategory = cat;
    }
  }

  const sortedMonths = Object.keys(monthTotals).sort();
  const trend = sortedMonths.slice(-3).map((m) => ({
    month: m,
    total: monthTotals[m]
  }));

  self.postMessage({
    type: "stats",
    payload: {
      monthlyTotal,
      categoryTotals,
      average,
      topCategory,
      trend
    }
  });
};
