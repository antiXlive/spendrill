// /js/db.js
// Dexie + DB layer with error handling and query helpers

import Dexie from "https://cdn.jsdelivr.net/npm/dexie@3.2.5/dist/dexie.mjs";
import { slugify, uuidv4 } from "./utils.js";

export const db = new Dexie("spendrill");

// DB schema
db.version(1).stores({
    transactions: "id, date, createdAt, catId, subId",
    categories: "id",
    settings: "key"
});

export async function initDB() {
    try {
        await db.open();
        console.log("✅ Database initialized");
    } catch (error) {
        console.error("❌ Failed to initialize database:", error);
        throw error;
    }
}

export async function wipeAll() {
    try {
        await db.transactions.clear();
        await db.categories.clear();
        await db.settings.clear();
        console.log("✅ Database wiped");
    } catch (error) {
        console.error("❌ Failed to wipe database:", error);
        throw error;
    }
}

// ---------------------------
// SETTINGS
// ---------------------------
export async function saveSetting(key, value) {
    try {
        return await db.settings.put({ key, value });
    } catch (error) {
        console.error(`❌ Failed to save setting "${key}":`, error);
        throw error;
    }
}

export async function getSetting(key) {
    try {
        return await db.settings.get(key);
    } catch (error) {
        console.error(`❌ Failed to get setting "${key}":`, error);
        return null; // Return null instead of throwing
    }
}

// ---------------------------
// CATEGORIES
// ---------------------------
export async function addCategoryWithSubs(cat) {
    try {
        const catId = slugify(cat.name);

        const catRecord = {
            id: catId,
            name: cat.name,
            emoji: cat.emoji || "",
            subcategories: (cat.subcategories || []).map(sub => ({
                id: slugify(sub.name),
                name: sub.name
            }))
        };

        return await db.categories.put(catRecord);
    } catch (error) {
        console.error(`❌ Failed to add category "${cat.name}":`, error);
        throw error;
    }
}

export async function getAllCategories() {
    try {
        return await db.categories.toArray();
    } catch (error) {
        console.error("❌ Failed to get categories:", error);
        return []; // Return empty array instead of throwing
    }
}

export async function deleteCategory(id) {
    try {
        return await db.categories.delete(id);
    } catch (error) {
        console.error(`❌ Failed to delete category "${id}":`, error);
        throw error;
    }
}

// ---------------------------
// TRANSACTIONS
// ---------------------------
export async function addTransaction(tx) {
    try {
        // Use put() instead of add() to allow upserts
        return await db.transactions.put(tx);
    } catch (error) {
        console.error("❌ Failed to add transaction:", error);
        throw error;
    }
}

export async function putTransaction(tx) {
    try {
        return await db.transactions.put(tx);
    } catch (error) {
        console.error("❌ Failed to update transaction:", error);
        throw error;
    }
}

export async function deleteTransaction(id) {
    try {
        return await db.transactions.delete(id);
    } catch (error) {
        console.error(`❌ Failed to delete transaction "${id}":`, error);
        throw error;
    }
}

export async function getTransactionById(id) {
    try {
        return await db.transactions.get(id);
    } catch (error) {
        console.error(`❌ Failed to get transaction "${id}":`, error);
        return null;
    }
}

export async function getAllTransactions() {
    try {
        return await db.transactions.toArray();
    } catch (error) {
        console.error("❌ Failed to get transactions:", error);
        return [];
    }
}

// ---------------------------
// BULK OPERATIONS
// ---------------------------
export async function addTransactionsBulk(transactions) {
    try {
        return await db.transactions.bulkPut(transactions);
    } catch (error) {
        console.error("❌ Failed to add transactions in bulk:", error);
        throw error;
    }
}

export async function addCategoriesBulk(categories) {
    try {
        return await db.categories.bulkPut(categories);
    } catch (error) {
        console.error("❌ Failed to add categories in bulk:", error);
        throw error;
    }
}

// ---------------------------
// QUERY HELPERS
// ---------------------------
export async function getTransactionsByDateRange(startDate, endDate) {
    try {
        return await db.transactions
            .where('date')
            .between(startDate, endDate, true, true)
            .toArray();
    } catch (error) {
        console.error("❌ Failed to get transactions by date range:", error);
        return [];
    }
}

export async function getTransactionsByCategory(catId) {
    try {
        return await db.transactions
            .where('catId')
            .equals(catId)
            .toArray();
    } catch (error) {
        console.error("❌ Failed to get transactions by category:", error);
        return [];
    }
}

export async function getTransactionsForMonth(year, month) {
    try {
        const monthStr = `${year}-${String(month).padStart(2, '0')}`;
        return await db.transactions
            .where('date')
            .startsWith(monthStr)
            .toArray();
    } catch (error) {
        console.error("❌ Failed to get transactions for month:", error);
        return [];
    }
}

export async function getRecentTransactions(limit = 10) {
    try {
        return await db.transactions
            .orderBy('createdAt')
            .reverse()
            .limit(limit)
            .toArray();
    } catch (error) {
        console.error("❌ Failed to get recent transactions:", error);
        return [];
    }
}