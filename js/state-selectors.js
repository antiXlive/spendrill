import StateModule from "./state.js";
import { EventBus } from "./event-bus.js";
export async function getTransactionsByMonth(y, m) {
    const ym = `${y}-${String(m + 1).padStart(2, "0")}`;
    const snap = await StateModule.loadSnapshot();
    const all = snap.transactions || [];
    return all.filter((t) => t.date && t.date.startsWith(ym)).sort((a, b) => new Date(b.date) - new Date(a.date));
}
export function groupByDate(txList) {
    const map = new Map();
    for (const t of txList) {
        const k = (t.date || "").slice(0, 10);
        if (!map.has(k)) map.set(k, { dateKey: k, items: [], total: 0 });
        const g = map.get(k);
        g.items.push(t);
        g.total += Number(t.amount || 0);
    }
    return [...map.values()]
        .sort((a, b) => new Date(b.dateKey) - new Date(a.dateKey))
        .map((g) => ({ ...g, label: g.dateKey }));
}
export function computeTopCategory(txList) {
    const m = new Map();
    for (const t of txList) {
        const k = t.catName || "Uncategorized";
        m.set(k, (m.get(k) || 0) + Number(t.amount || 0));
    }
    const arr = [...m.entries()].sort((a, b) => b[1] - a[1]);
    if (!arr.length) return null;
    return { name: arr[0][0], value: arr[0][1] };
}
export function computeMiniChart(txList, maxPoints = 12) {
    const byDay = new Map();
    for (const t of txList) {
        const k = (t.date || "").slice(0, 10);
        byDay.set(k, (byDay.get(k) || 0) + Number(t.amount || 0));
    }
    const vals = [...byDay.values()].slice(0, maxPoints).reverse();
    return vals;
}
export function deleteTransaction(id) {
    EventBus.emit("tx-delete", { id });
}
export function computeStats(txList){
  const catTotals=new Map();
  let total=0;
  for(const t of txList){
    const c=t.catName||"Uncategorized";
    const v=Number(t.amount||0);
    catTotals.set(c,(catTotals.get(c)||0)+v);
    total+=v;
  }
  const arr=[...catTotals.entries()].sort((a,b)=>b[1]-a[1]);
  const average=arr.length?total/arr.length:0;
  const topCat=arr.length?arr[0][0]:null;
  const dataset=arr.map(([name,value])=>({name,value,percent:total?((value/total)*100):0}));
  return {total,average,topCategory:topCat,categories:dataset};
}
