// js/db.js
import { DB_NAME, DB_VERSION } from './constants.js';

const db = new Dexie(DB_NAME);
db.version(DB_VERSION).stores({
  transactions: 'id, date, category, amount',
  categories: '++id, name',
  settings: 'key'
});

export async function initDB() {
  await db.open();
  return db;
}

export async function getAllTransactions() { return db.transactions.toArray(); }
export async function getTransactionById(id) { return db.transactions.get(id); }
export async function addTransaction(tx) { return db.transactions.add(tx); }
export async function putTransaction(tx) { return db.transactions.put(tx); }
export async function deleteTransaction(id) { return db.transactions.delete(id); }

export async function getCategories() { return db.categories.toArray(); }
export async function addCategory(name) { return db.categories.add({ name }); }
export async function deleteCategoryByName(name) {
  const item = await db.categories.where('name').equals(name).first();
  if (item) return db.categories.delete(item.id);
  return null;
}

export async function saveSetting(key, value) { return db.settings.put({ key, value }); }
export async function getSetting(key) { return db.settings.get(key); }
export async function getSettingValue(key) {
  const r = await getSetting(key);
  return r ? r.value : undefined;
}

export default db;
