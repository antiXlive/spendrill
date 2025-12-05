// js/backup-utils.js
// ----------------------------------------------------------
// Shared backup utility for Spendrill
// Handles: exportBackup(), importBackup(file, replace)
// ----------------------------------------------------------

import { EventBus } from "./event-bus.js";
import * as DB from "./db.js";  // Dexie functions
import StateModule from "./state.js";

/* ==========================================================
   EXPORT BACKUP
   Returns the complete DB snapshot as a JS object
   Used by SettingsScreen and any future backup feature
   ========================================================== */
export async function exportBackup() {
  // Load full DB snapshot (categories + transactions + settings)
  const snapshot = await StateModule.loadSnapshot();

  // Pure JSON object for safe export
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    settings: snapshot.settings || {},
    categories: snapshot.categories || [],
    transactions: snapshot.transactions || []
  };
}

/* ==========================================================
   IMPORT BACKUP
   file: File object
   replace: boolean → replace or merge DB content
   ========================================================== */
export async function importBackup(file, replace = false) {
  if (!file) throw new Error("No file provided");
  if (!file.type.includes("json")) throw new Error("Invalid file format");

  const text = await file.text();
  let data;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Invalid JSON file");
  }

  if (!data || typeof data !== "object") {
    throw new Error("Malformed backup file");
  }

  const categories = Array.isArray(data.categories) ? data.categories : [];
  const transactions = Array.isArray(data.transactions) ? data.transactions : [];
  const settings = data.settings || {};

  if (replace) {
    // Full wipe + restore
    await DB.wipeAll();
  }

  /* ---------------------------
      RESTORE CATEGORIES
     --------------------------- */
  for (const cat of categories) {
    try {
      await DB.addCategory(cat);
    } catch (err) {
      console.warn("Category import skipped:", err);
    }
  }

  /* ---------------------------
      RESTORE TRANSACTIONS
     --------------------------- */
  for (const tx of transactions) {
    try {
      await StateModule.addTransaction(tx);
    } catch (err) {
      console.warn("Transaction import skipped:", err);
    }
  }

  /* ---------------------------
      RESTORE SETTINGS
     --------------------------- */
  for (const key in settings) {
    try {
      await StateModule.saveSetting(key, settings[key]);
    } catch (err) {
      console.warn("Setting import skipped:", err);
    }
  }

  // Notify system
  EventBus.emit("data-imported");

  return true;
}
