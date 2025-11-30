// /js/db.js
// Dexie + DB layer

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
    await db.open();
}

export async function wipeAll() {
    await db.transactions.clear();
    await db.categories.clear();
    await db.settings.clear();
}

// ---------------------------
// SETTINGS
// ---------------------------
export async function saveSetting(key, value) {
    return db.settings.put({ key, value });
}

export async function getSetting(key) {
    return db.settings.get(key);
}

// ---------------------------
// CATEGORIES
// ---------------------------
export async function addCategoryWithSubs(cat) {
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

    await db.categories.put(catRecord);
}

export async function getAllCategories() {
    return db.categories.toArray();
}

// ---------------------------
// TRANSACTIONS
// ---------------------------
export async function addTransaction(tx) {
    // Just store raw data - enrichment happens in StateModule.loadSnapshot()
    return db.transactions.add(tx);
}

export async function putTransaction(tx) {
    return db.transactions.put(tx);
}

export async function deleteTransaction(id) {
    return db.transactions.delete(id);
}

export async function getTransactionById(id) {
    return db.transactions.get(id);
}

export async function getAllTransactions() {
    return db.transactions.toArray();
}