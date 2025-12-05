// /js/db.js
// Full production-ready DB for Spendrill
// Uses uuid() instead of uuidv4()
// No functional changes except cleaner ID generation

import Dexie from "https://cdn.jsdelivr.net/npm/dexie@3.2.5/dist/dexie.mjs";
import { slugify, uuid } from "./utils.js";
import { DEFAULT_CATEGORIES } from "./default-categories.js";

// =========================
// DB SETUP
// =========================
export const db = new Dexie("spendrill");

db.version(2).stores({
  transactions: "id, date, catId, [date+catId]",
  categories: "id, name",
  settings: "key"
}).upgrade(tx => {
  // Migration: ensure subcategories have emoji/image fields
  return tx.categories.toCollection().modify(cat => {
    if (cat.subcategories) {
      cat.subcategories = cat.subcategories.map(sub => ({
        id: sub.id,
        name: sub.name,
        emoji: sub.emoji || "",
        image: sub.image || ""
      }));
    }
  });
});

// =========================
// POPULATE DEFAULT CATEGORIES
// =========================
db.on("populate", async () => {
  console.log("📦 Populating default Spendrill categories...");
  for (const cat of DEFAULT_CATEGORIES) {
    await db.categories.put({
      id: cat.id,
      name: cat.name,
      emoji: cat.emoji || "",
      image: cat.image || "",
      subcategories: (cat.subcategories || []).map(s => ({
        id: s.id,
        name: s.name,
        emoji: s.emoji || "",
        image: s.image || ""
      }))
    });
  }
  console.log("✅ Default categories populated ONCE.");
});

// =========================
// STATUS & INIT
// =========================
export const DBStatus = {
  UNINITIALIZED: "uninitialized",
  INITIALIZING: "initializing",
  READY: "ready",
  ERROR: "error"
};

let dbStatus = DBStatus.UNINITIALIZED;

export async function initDB() {
  if (dbStatus === DBStatus.READY) return true;
  if (dbStatus === DBStatus.INITIALIZING) return false;

  try {
    dbStatus = DBStatus.INITIALIZING;
    await db.open();

    const catCount = await db.categories.count();
    if (catCount === 0) {
      console.warn("⚠️ No categories after db.open(); resetting DB.");
      await db.delete();
      location.reload();
      return false;
    }

    dbStatus = DBStatus.READY;
    console.log("✅ Database ready");
    return true;
  } catch (error) {
    dbStatus = DBStatus.ERROR;
    console.error("❌ DB init failed:", error);
    throw error;
  }
}

export function getDBStatus() {
  return dbStatus;
}

export async function closeDB() {
  try {
    await db.close();
  } finally {
    dbStatus = DBStatus.UNINITIALIZED;
  }
}

export async function wipeAll() {
  await db.transaction('rw', [db.transactions, db.categories, db.settings], async () => {
    await db.transactions.clear();
    await db.categories.clear();
    await db.settings.clear();
  });
  console.log("✅ Database wiped");
}

// =========================
// SETTINGS
// =========================
export async function saveSetting(key, value) {
  return await db.settings.put({ key, value });
}

export async function getSetting(key, defaultValue = null) {
  try {
    const result = await db.settings.get(key);
    return result ? result.value : defaultValue;
  } catch {
    return defaultValue;
  }
}

export async function getAllSettings() {
  return await db.settings.toArray();
}

export async function deleteSetting(key) {
  return await db.settings.delete(key);
}

// =========================
// CATEGORIES (duplicate-proofed)
// =========================
export async function addCategory(cat) {
  const id = cat.id || slugify(cat.name);
  const exists = await db.categories.get(id);
  if (exists) return exists;

  const record = {
    id,
    name: cat.name,
    emoji: cat.emoji || "",
    image: cat.image || "",
    subcategories: (cat.subcategories || []).map(sub => ({
      id: sub.id || slugify(sub.name),
      name: sub.name,
      emoji: sub.emoji || "",
      image: sub.image || ""
    }))
  };

  await db.categories.put(record);
  return record;
}

export async function addCategoryWithSubs(cat) {
  return await addCategory(cat);
}

export async function addCategoriesBulk(categories) {
  const toInsert = [];

  for (const cat of categories) {
    const id = cat.id || slugify(cat.name);
    const exists = await db.categories.get(id);
    if (!exists) {
      toInsert.push({
        id,
        name: cat.name,
        emoji: cat.emoji || "",
        image: cat.image || "",
        subcategories: (cat.subcategories || []).map(sub => ({
          id: sub.id || slugify(sub.name),
          name: sub.name,
          emoji: sub.emoji || "",
          image: sub.image || ""
        }))
      });
    }
  }

  if (toInsert.length) await db.categories.bulkPut(toInsert);
  return toInsert;
}

export async function getAllCategories() {
  const cats = await db.categories.toArray();
  return cats.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getCategoryById(id) {
  return await db.categories.get(id);
}

export async function updateCategory(id, updates) {
  const existing = await db.categories.get(id);
  if (!existing) throw new Error(`Category "${id}" not found`);

  const updated = { ...existing, ...updates, id: existing.id };
  await db.categories.put(updated);
  return updated;
}

export async function deleteCategory(id, force = false) {
  const category = await db.categories.get(id);
  if (!category) throw new Error(`Category "${id}" not found`);

  const count = await db.transactions.where('catId').equals(id).count();
  if (count > 0 && !force)
    throw new Error(`Cannot delete "${category.name}". ${count} transactions exist.`);

  await db.transaction('rw', [db.categories, db.transactions], async () => {
    if (force) await db.transactions.where('catId').equals(id).delete();
    await db.categories.delete(id);
  });
}

// =========================
// TRANSACTIONS
// =========================
export async function addTransaction(tx) {
  if (!tx.catId) throw new Error("Category required");
  if (!tx.date) throw new Error("Date required");
  if (tx.amount == null) throw new Error("Amount required");
  if (isNaN(Number(tx.amount))) throw new Error("Valid amount required");

  const record = {
    id: tx.id || uuid(),
    date: tx.date,
    amount: parseFloat(tx.amount),
    note: tx.note || "",
    catId: tx.catId,
    subId: tx.subId || null
  };

  await db.transactions.put(record);
  return record;
}

export async function updateTransaction(id, updates) {
  const existing = await db.transactions.get(id);
  if (!existing) throw new Error("Transaction not found");

  const updated = { ...existing, ...updates, id: existing.id };

  if (updates.amount !== undefined) {
    updated.amount = parseFloat(updated.amount);
    if (isNaN(updated.amount)) throw new Error("Valid amount required");
  }

  await db.transactions.put(updated);
  return updated;
}

export async function deleteTransaction(id) {
  await db.transactions.delete(id);
}

export async function getTransactionById(id) {
  return await db.transactions.get(id);
}

export async function getAllTransactions() {
  return await db.transactions.toArray();
}

// =========================
// QUERIES
// =========================
export async function getTransactionsByDateRange(start, end) {
  return await db.transactions
    .where("date")
    .between(start, end, true, true)
    .toArray();
}

export async function getTransactionsForMonth(year, month) {
  let m = Number(month);
  if (m === 0) m = 1;
  const prefix = `${year}-${String(m).padStart(2, "0")}`;
  return await db.transactions.where("date").startsWith(prefix).toArray();
}

export async function getCurrentMonthTransactions() {
  const now = new Date();
  return await getTransactionsForMonth(now.getFullYear(), now.getMonth() + 1);
}

export async function searchTransactions(query) {
  if (!query) return [];
  const q = String(query).toLowerCase();
  const all = await db.transactions.toArray();

  return all.filter(
    (tx) =>
      String(tx.note || "").toLowerCase().includes(q) ||
      String(tx.amount).includes(query) ||
      String(tx.date).includes(query)
  );
}

export async function getTransactionsByCategory(catId) {
  return await db.transactions.where("catId").equals(catId).toArray();
}

// =========================
// BULK / IMPORT / EXPORT
// =========================
export async function addTransactionsBulk(arr) {
  const valid = arr.map((tx) => ({
    id: tx.id || uuid(),
    date: tx.date,
    amount: parseFloat(tx.amount),
    note: tx.note || "",
    catId: tx.catId,
    subId: tx.subId || null
  }));

  await db.transactions.bulkPut(valid);
  return valid;
}

async function addCategoriesBulkInternal(cats) {
  const out = [];

  for (const cat of cats) {
    const id = cat.id || slugify(cat.name);
    const exists = await db.categories.get(id);
    if (!exists) {
      out.push({
        id,
        name: cat.name,
        emoji: cat.emoji || "",
        image: cat.image || "",
        subcategories: (cat.subcategories || []).map((s) => ({
          id: s.id || slugify(s.name),
          name: s.name,
          emoji: s.emoji || "",
          image: s.image || ""
        }))
      });
    }
  }

  if (out.length) await db.categories.bulkPut(out);
  return out;
}

export async function exportData() {
  const [transactions, categories, settings] = await Promise.all([
    db.transactions.toArray(),
    db.categories.toArray(),
    db.settings.toArray()
  ]);

  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    data: { transactions, categories, settings }
  };
}

export async function importData(data, clearExisting = false) {
  if (!data?.data) throw new Error("Invalid import data");

  await db.transaction("rw", [db.transactions, db.categories, db.settings], async () => {
    if (clearExisting) {
      await db.transactions.clear();
      await db.categories.clear();
      await db.settings.clear();
    }

    if (data.data.categories) {
      await addCategoriesBulkInternal(data.data.categories);
    }

    if (data.data.transactions) {
      await addTransactionsBulk(data.data.transactions);
    }

    if (data.data.settings) {
      await db.settings.bulkPut(data.data.settings);
    }
  });

  console.log("✅ Import complete");
}

// =========================
// STATS HELPERS
// =========================
export async function getYearTransactions(year) {
  return await db.transactions.where("date").startsWith(String(year)).toArray();
}

export async function getCategoryTotals(transactions) {
  const map = {};
  for (const tx of transactions) {
    map[tx.catId] = (map[tx.catId] || 0) + tx.amount;
  }
  return map;
}

export async function getMonthlyTotals(transactions) {
  const map = {};
  transactions.forEach((tx) => {
    const month = tx.date.substring(5, 7);
    map[month] = (map[month] || 0) + tx.amount;
  });
  return map;
}

// =========================
// LEGACY ALIAS
// =========================
export async function putTransaction(tx) {
  return await db.transactions.put(tx);
}
