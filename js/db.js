// /js/db.js
// Full production-ready DB for Spendrill
// - Single Dexie version (v2)
// - db.on('populate') seeding (runs only once on DB creation)
// - Migrations preserved
// - All public functions preserved
// - Duplicate-proof category inserts

import Dexie from "https://cdn.jsdelivr.net/npm/dexie@3.2.5/dist/dexie.mjs";
import { slugify, uuidv4 } from "./utils.js";
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
// POPULATE DEFAULT CATEGORIES (ONLY ON INITIAL DB CREATE)
// =========================
db.on("populate", async () => {
  console.log("📦 Populating default Spendrill categories...");
  for (const cat of DEFAULT_CATEGORIES) {
    // Use put() so if something odd exists we overwrite safely for first-time DB creation.
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

    // Safety check: if categories table is empty after open, something went wrong.
    // Usually populate runs only during creation; if count==0 here we'll force a restart
    // so populate can run properly next time (rare).
    const catCount = await db.categories.count();
    if (catCount === 0) {
      console.warn("⚠️ No categories present after db.open(); resetting DB to trigger populate.");
      await db.delete();
      // reload to create DB and trigger populate; this causes current script to stop
      // but it's the safest recovery path in dev environments. In production you may want a migration.
      location.reload();
      return false; // never reached after reload but keeps function signature sane
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

// Wipe everything (used by dev tools)
export async function wipeAll() {
  await db.transaction('rw', [db.transactions, db.categories, db.settings], async () => {
    await db.transactions.clear();
    await db.categories.clear();
    await db.settings.clear();
  });
  console.log("✅ Database wiped");
}

// =========================
// SETTINGS (key-value store)
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
  if (exists) return exists; // prevent duplicates and preserve ability to re-call safely

  const catRecord = {
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

  await db.categories.put(catRecord);
  return catRecord;
}

export async function addCategoryWithSubs(cat) {
  // legacy alias preserved
  return await addCategory(cat);
}

export async function addCategoriesBulk(categories) {
  // Bulk-put but avoid inserting existing categories (prevents duplicates)
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
  const categories = await db.categories.toArray();
  return categories.sort((a, b) => a.name.localeCompare(b.name));
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

  if (count > 0 && !force) {
    throw new Error(`Cannot delete "${category.name}". ${count} transactions exist.`);
  }

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
  if (tx.amount === undefined || tx.amount === null) throw new Error("Amount required");
  if (isNaN(Number(tx.amount))) throw new Error("Valid amount required");

  const transaction = {
    id: tx.id || uuidv4(),
    date: tx.date,
    amount: parseFloat(tx.amount),
    note: tx.note || "",
    catId: tx.catId,
    subId: tx.subId || null
  };

  await db.transactions.put(transaction);
  return transaction;
}

export async function updateTransaction(id, updates) {
  const existing = await db.transactions.get(id);
  if (!existing) throw new Error(`Transaction not found`);

  const updated = { ...existing, ...updates, id: existing.id };

  if (updates.amount !== undefined) {
    updated.amount = parseFloat(updated.amount);
    if (isNaN(updated.amount) || updated.amount <= 0) throw new Error("Valid amount required");
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
export async function getTransactionsByDateRange(startDate, endDate) {
  return await db.transactions
    .where('date')
    .between(startDate, endDate, true, true)
    .toArray();
}

export async function getTransactionsForMonth(year, month) {
  // month param can be 1-based or 0-based depending on callers; normalize if obviously wrong
  let m = Number(month);
  if (m === 0) m = 1; // defensive: prefer 1-based
  const monthStr = `${year}-${String(m).padStart(2, '0')}`;
  return await db.transactions
    .where('date')
    .startsWith(monthStr)
    .toArray();
}

export async function getCurrentMonthTransactions() {
  const now = new Date();
  return await getTransactionsForMonth(now.getFullYear(), now.getMonth() + 1);
}

export async function searchTransactions(query) {
  if (!query) return [];

  const lowercaseQuery = String(query).toLowerCase();
  const all = await db.transactions.toArray();

  return all.filter(tx =>
    String(tx.note || "").toLowerCase().includes(lowercaseQuery) ||
    String(tx.amount).includes(query) ||
    String(tx.date || "").includes(query)
  );
}

export async function getTransactionsByCategory(catId) {
  return await db.transactions.where('catId').equals(catId).toArray();
}

// =========================
// BULK / IMPORT / EXPORT
// =========================
export async function addTransactionsBulk(transactions) {
  const valid = transactions.map(tx => ({
    id: tx.id || uuidv4(),
    date: tx.date,
    amount: parseFloat(tx.amount),
    note: tx.note || "",
    catId: tx.catId,
    subId: tx.subId || null
  }));

  await db.transactions.bulkPut(valid);
  return valid;
}



async function addCategoriesBulkInternal(categories) {
  const filtered = [];
  for (const cat of categories) {
    const id = cat.id || slugify(cat.name);
    const existing = await db.categories.get(id);
    if (!existing) {
      filtered.push({
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
  if (filtered.length) await db.categories.bulkPut(filtered);
  return filtered;
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

export async function importData(importedData, clearExisting = false) {
  if (!importedData?.data) throw new Error("Invalid import data");

  await db.transaction('rw', [db.transactions, db.categories, db.settings], async () => {
    if (clearExisting) {
      await db.transactions.clear();
      await db.categories.clear();
      await db.settings.clear();
    }

    if (importedData.data.categories) {
      // import but prevent duplicates by id
      await addCategoriesBulkInternal(importedData.data.categories);
    }

    if (importedData.data.transactions) {
      await addTransactionsBulk(importedData.data.transactions);
    }

    if (importedData.data.settings) {
      // settings stored as {key, value} items expected
      await db.settings.bulkPut(importedData.data.settings);
    }
  });

  console.log("✅ Import complete");
}

// =========================
// STATS / HELPERS
// =========================
export async function getYearTransactions(year) {
  return await db.transactions
    .where('date')
    .startsWith(String(year))
    .toArray();
}

export async function getCategoryTotals(transactions) {
  const totals = {};
  transactions.forEach(tx => {
    totals[tx.catId] = (totals[tx.catId] || 0) + tx.amount;
  });
  return totals;
}

export async function getMonthlyTotals(transactions) {
  const totals = {};
  transactions.forEach(tx => {
    const month = tx.date ? tx.date.substring(5, 7) : "00";
    totals[month] = (totals[month] || 0) + tx.amount;
  });
  return totals;
}

// =========================
// LEGACY / ALIASES (preserve API)
// =========================
export async function putTransaction(tx) {
  return await db.transactions.put(tx);
}

// =========================
// END OF FILE
// =========================
