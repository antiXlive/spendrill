// /js/db.js
// SIMPLIFIED production database - Only what you actually need
// Fixes: schema version, validation, removes unnecessary analytics

import Dexie from "https://cdn.jsdelivr.net/npm/dexie@3.2.5/dist/dexie.mjs";
import { slugify, uuidv4 } from "./utils.js";

// ============================================================================
// DATABASE SETUP
// ============================================================================

export const db = new Dexie("spendrill");

// V2 - Added subcategory emoji/image support
db.version(2).stores({
    transactions: "id, date, catId, [date+catId]",
    categories: "id, name",
    settings: "key"
}).upgrade(tx => {
    // Migration: Add emoji/image fields to existing subcategories
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

// Fallback for new users (no upgrade needed)
db.version(1).stores({
    transactions: "id, date, catId, [date+catId]",
    categories: "id, name",
    settings: "key"
});

export const DBStatus = {
    UNINITIALIZED: "uninitialized",
    INITIALIZING: "initializing",
    READY: "ready",
    ERROR: "error"
};

let dbStatus = DBStatus.UNINITIALIZED;

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

export async function initDB() {
    if (dbStatus === DBStatus.READY) return true;
    if (dbStatus === DBStatus.INITIALIZING) return false;

    try {
        dbStatus = DBStatus.INITIALIZING;
        await db.open();
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
    await db.close();
    dbStatus = DBStatus.UNINITIALIZED;
}

export async function wipeAll() {
    await db.transaction('rw', [db.transactions, db.categories, db.settings], async () => {
        await db.transactions.clear();
        await db.categories.clear();
        await db.settings.clear();
    });
    console.log("✅ Database wiped");
}

// ============================================================================
// SETTINGS (Simple key-value store)
// ============================================================================

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

// ============================================================================
// CATEGORIES
// ============================================================================

export async function addCategory(cat) {
    const catRecord = {
        id: cat.id || slugify(cat.name),
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

export async function updateCategory(id, updates) {
    const existing = await db.categories.get(id);
    if (!existing) throw new Error(`Category "${id}" not found`);
    
    const updated = { ...existing, ...updates, id: existing.id };
    await db.categories.put(updated);
    return updated;
}

export async function getAllCategories() {
    const categories = await db.categories.toArray();
    return categories.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getCategoryById(id) {
    return await db.categories.get(id);
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

// ============================================================================
// TRANSACTIONS
// ============================================================================

export async function addTransaction(tx) {
    // Minimal validation - let UI handle complex validation
    if (!tx.catId) throw new Error("Category required");
    if (!tx.date) throw new Error("Date required");
    if (!tx.amount || tx.amount <= 0) throw new Error("Valid amount required");
    
    const transaction = {
        id: tx.id || uuidv4(),
        date: tx.date,
        amount: parseFloat(tx.amount), // Handle string amounts from UI
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
    
    // Re-validate amount if changed
    if (updates.amount !== undefined) {
        updated.amount = parseFloat(updated.amount);
        if (updated.amount <= 0) throw new Error("Valid amount required");
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

// ============================================================================
// QUERIES (Only what you actually use)
// ============================================================================

export async function getTransactionsByDateRange(startDate, endDate) {
    return await db.transactions
        .where('date')
        .between(startDate, endDate, true, true)
        .toArray();
}

export async function getTransactionsForMonth(year, month) {
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
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
    
    const lowercaseQuery = query.toLowerCase();
    const all = await db.transactions.toArray();
    
    return all.filter(tx =>
        tx.note?.toLowerCase().includes(lowercaseQuery) ||
        String(tx.amount).includes(query) ||
        tx.date.includes(query)
    );
}

// ============================================================================
// BULK OPERATIONS (For import only)
// ============================================================================

export async function addTransactionsBulk(transactions) {
    // Minimal validation for bulk - faster
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

export async function addCategoriesBulk(categories) {
    const valid = categories.map(cat => ({
        id: cat.id || slugify(cat.name),
        name: cat.name,
        emoji: cat.emoji || "",
        image: cat.image || "",
        subcategories: (cat.subcategories || []).map(sub => ({
            id: sub.id || slugify(sub.name),
            name: sub.name,
            emoji: sub.emoji || "",
            image: sub.image || ""
        }))
    }));
    
    await db.categories.bulkPut(valid);
    return valid;
}

// ============================================================================
// STATS (Minimal - for your stats worker)
// ============================================================================

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
        const month = tx.date.substring(5, 7);
        totals[month] = (totals[month] || 0) + tx.amount;
    });
    return totals;
}

// ============================================================================
// IMPORT/EXPORT
// ============================================================================

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
            await addCategoriesBulk(importedData.data.categories);
        }
        
        if (importedData.data.transactions) {
            await addTransactionsBulk(importedData.data.transactions);
        }
        
        if (importedData.data.settings) {
            await db.settings.bulkPut(importedData.data.settings);
        }
    });
    
    console.log("✅ Import complete");
}

// ============================================================================
// LEGACY COMPATIBILITY (Keep for existing code)
// ============================================================================

export async function addCategoryWithSubs(cat) {
    return await addCategory(cat);
}

export async function putTransaction(tx) {
    return await db.transactions.put(tx);
}

export async function getTransactionsByCategory(catId) {
    return await db.transactions.where('catId').equals(catId).toArray();
}

export async function deleteSetting(key) {
    return await db.settings.delete(key);
}