// /js/init-default-data.js
import { DEFAULT_CATEGORIES } from "./default-categories.js";
import * as DB from "./db.js";
import { uuidv4 } from "./utils.js";

// Updated to November 2025 - current month
export const SAMPLE_TRANSACTIONS = [
  { amount: 120, catId: "food-dining", subId: "restaurants-cafes", note: "Dinner with friends", date: "2025-11-28" },
  { amount: 45, catId: "transportation", subId: "cab-olauberapido", note: "Uber to office", date: "2025-11-27" },
  { amount: 780, catId: "shopping", subId: "electronics-gadgets", note: "New earphones", date: "2025-11-25" },
  { amount: 2300, catId: "bills-utilities", subId: "electricity-bill", note: "Electricity bill", date: "2025-11-20" },
  { amount: 90, catId: "food-dining", subId: "tea-coffee-snacks", note: "Starbucks", date: "2025-11-24" },
  { amount: 150, catId: "cash-small-expenses", subId: "water-bottle", note: "Water + snacks", date: "2025-11-23" },
  { amount: 550, catId: "health-medical", subId: "medicines", note: "Cold medicines", date: "2025-11-22" },
  { amount: 880, catId: "entertainment", subId: "movies", note: "Movie night", date: "2025-11-21" },
  { amount: 1100, catId: "work-career", subId: "software-apps", note: "Software tools", date: "2025-11-19" },
  { amount: 340, catId: "transportation", subId: "petrol-diesel", note: "Fuel top-up", date: "2025-11-26" },
  { amount: 50, catId: "cash-small-expenses", subId: "chai-small-snacks", note: "Evening chai", date: "2025-11-25" },
  { amount: 1600, catId: "shopping", subId: "clothing", note: "New shirt", date: "2025-11-18" }
];

export async function initDefaultData() {
  const flag = await DB.getSetting("firstBootDone");
  if (flag?.value) return;

  console.log("🔹 First boot → Loading default categories + sample transactions");

  // categories
  for (const cat of DEFAULT_CATEGORIES) {
    await DB.addCategoryWithSubs(cat);
  }

  // sample transactions
  for (const tx of SAMPLE_TRANSACTIONS) {
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

  console.log("✅ Default categories + sample transactions loaded");
}