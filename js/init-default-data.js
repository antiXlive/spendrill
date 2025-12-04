// /js/init-default-data.js
import { DEFAULT_CATEGORIES } from "./default-categories.js";
import * as DB from "./db.js";
import { uuidv4 } from "./utils.js";

export const SAMPLE_TRANSACTIONS = [
  { amount: 120, catId: "food_dining", subId: "restaurants_cafes", note: "Dinner with friends", date: "2025-12-28" },
  { amount: 45, catId: "transportation", subId: "cab", note: "Uber to office", date: "2025-12-27" },
  { amount: 780, catId: "shopping", subId: "electronics_gadgets", note: "New earphones", date: "2025-12-25" },
  { amount: 2300, catId: "bills_utilities", subId: "electricity_bill", note: "Electricity bill", date: "2025-12-20" },
  { amount: 90, catId: "food_dining", subId: "tea_coffee_snacks", note: "Starbucks", date: "2025-12-24" },
  { amount: 150, catId: "cash_small_expenses", subId: "water_bottle", note: "Water + snacks", date: "2025-12-23" },
  { amount: 550, catId: "health_medical", subId: "medicines", note: "Cold medicines", date: "2025-12-22" },
  { amount: 880, catId: "entertainment", subId: "movies", note: "Movie night", date: "2025-12-21" },
  { amount: 1100, catId: "work_career", subId: "software_apps", note: "Software tools", date: "2025-12-19" },
  { amount: 340, catId: "transportation", subId: "petrol_diesel", note: "Fuel top-up", date: "2025-12-26" },
  { amount: 50, catId: "cash_small_expenses", subId: "chai_small_snacks", note: "Evening chai", date: "2025-12-25" },
  { amount: 1600, catId: "shopping", subId: "clothing", note: "New shirt", date: "2025-12-18" }
];

export async function initDefaultData() {
  const alreadyLoaded = await DB.getSetting("firstBootDone", false);
  if (alreadyLoaded) {
    console.log("⏭ firstBootDone detected — defaults NOT reloaded.");
    return;
  }

  console.log("🔹 First boot → Loading default categories + sample transactions");

  // Insert categories + subs
  for (const cat of DEFAULT_CATEGORIES) {
    await DB.addCategoryWithSubs(cat);
  }

  // Insert sample transactions (safe insert)
  for (const tx of SAMPLE_TRANSACTIONS) {
    const categoryExists = DEFAULT_CATEGORIES.some(c => c.id === tx.catId);
    const subExists = DEFAULT_CATEGORIES
      .find(c => c.id === tx.catId)
      ?.subcategories.some(s => s.id === tx.subId);

    if (!categoryExists || !subExists) {
      console.warn(`⚠️ Skipped invalid sample transaction →`, tx);
      continue;
    }

    await DB.addTransaction({
      id: uuidv4(),
      amount: tx.amount,
      date: tx.date,
      catId: tx.catId,
      subId: tx.subId,
      createdAt: new Date().toISOString(),
      note: tx.note || "",
    });
  }

  await DB.saveSetting("firstBootDone", true);
  console.log("✅ Default categories + sample transactions loaded ONCE");
}
