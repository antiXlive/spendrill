// js/state.js
// Updated for NEW DB structure + NEW DEFAULT_CATEGORIES + EMOJI FIX

import * as DB from "./db.js";

// ------------------------
// Private state
// ------------------------
let _state = {
  transactions: [],
  categories: [],
  settings: {},
  pinHash: null
};

// ------------------------
// Transaction enricher (WITH EMOJI SUPPORT)
// ------------------------
function enrichTransaction(tx, catMap) {
  const cat = catMap.get(tx.catId);
  const sub = cat?.subcategories?.find(s => s.id === tx.subId);

  // ⭐ EMOJI FIX — universal emoji used by UI
  const emoji = sub?.emoji || cat?.emoji || "🧾";

  return {
    ...tx,

    // UI emoji
    emoji,

    // Category
    catName: cat?.name || "Uncategorized",
    catEmoji: cat?.emoji || "🧾",
    catImage: cat?.image || "",

    // Subcategory
    subName: sub?.name || "",
    subEmoji: sub?.emoji || "",
    subImage: sub?.image || ""
  };
}

// ------------------------
// STATE MODULE
// ------------------------
const StateModule = {
  getState() {
    return _state;
  },

  // ------------------------
  // LOAD FULL SNAPSHOT
  // ------------------------
  async loadSnapshot() {
    try {
      if (DB.getDBStatus() !== DB.DBStatus.READY) {
        await DB.initDB();
      }

      const [transactions, categories, settings] = await Promise.all([
        DB.getAllTransactions(),
        DB.getAllCategories(),
        DB.getAllSettings()
      ]);

      const settingsObj = {};
      for (const row of settings) settingsObj[row.key] = row.value;

      const catMap = new Map(categories.map(c => [c.id, c]));

      const enriched = transactions
        .map(tx => enrichTransaction(tx, catMap))
        .sort((a, b) => b.date.localeCompare(a.date));

      _state = {
        transactions: enriched,
        categories,
        settings: settingsObj,
        pinHash: settingsObj.pinHash || null
      };

      console.log(`✅ Loaded ${enriched.length} transactions`);
      return _state;
    } catch (err) {
      console.error("❌ Failed to load snapshot:", err);
      return _state;
    }
  },

  // ------------------------
  // LOAD ONLY CURRENT MONTH
  // ------------------------
  async loadCurrentMonth() {
    try {
      if (DB.getDBStatus() !== DB.DBStatus.READY) {
        await DB.initDB();
      }

      const [transactions, categories] = await Promise.all([
        DB.getCurrentMonthTransactions(),
        DB.getAllCategories()
      ]);

      const catMap = new Map(categories.map(c => [c.id, c]));

      _state.transactions = transactions
        .map(tx => enrichTransaction(tx, catMap))
        .sort((a, b) => b.date.localeCompare(a.date));

      _state.categories = categories;

      console.log(`📅 Current month loaded: ${_state.transactions.length}`);
      return _state;
    } catch (err) {
      console.error("❌ Failed to load current month:", err);
      return _state;
    }
  },

  // ------------------------
  // Refresh Transactions
  // ------------------------
  async refreshTransactions() {
    try {
      const transactions = await DB.getAllTransactions();
      const catMap = new Map(_state.categories.map(c => [c.id, c]));

      _state.transactions = transactions
        .map(t => enrichTransaction(t, catMap))
        .sort((a, b) => b.date.localeCompare(a.date));

      return _state;
    } catch (err) {
      console.error("❌ refreshTransactions failed:", err);
      return _state;
    }
  },

  // ------------------------
  // Refresh Categories → re-enrich TX
  // ------------------------
  async refreshCategories() {
    try {
      const categories = await DB.getAllCategories();
      _state.categories = categories;
      await this.refreshTransactions();
      return _state;
    } catch (err) {
      console.error("❌ refreshCategories failed:", err);
      return _state;
    }
  },

  // ------------------------
  // CRUD TRANSACTIONS
  // ------------------------
  async addTransaction(data) {
    const tx = await DB.addTransaction(data);
    await this.refreshTransactions();
    return tx;
  },

  async updateTransaction(id, updates) {
    const tx = await DB.updateTransaction(id, updates);
    await this.refreshTransactions();
    return tx;
  },

  async deleteTransaction(id) {
    await DB.deleteTransaction(id);
    await this.refreshTransactions();
  },

  // ------------------------
  // SEARCH
  // ------------------------
  async searchTransactions(query) {
    const results = await DB.searchTransactions(query);
    const catMap = new Map(_state.categories.map(c => [c.id, c]));
    return results.map(t => enrichTransaction(t, catMap));
  },

  // ------------------------
  // SETTINGS
  // ------------------------
  async getSetting(key, defaultValue = null) {
    return await DB.getSetting(key, defaultValue);
  },

  async saveSetting(key, value) {
    await DB.saveSetting(key, value);
    if (_state.settings) _state.settings[key] = value;
  },

  async setPinHash(hash) {
    await DB.saveSetting("pinHash", hash);
    _state.pinHash = hash;
    if (_state.settings) _state.settings.pinHash = hash;
  },

  // ------------------------
  // IMPORT / EXPORT
  // ------------------------
  async exportData() {
    return await DB.exportData();
  },

  async importData(data, clearExisting = false) {
    await DB.importData(data, clearExisting);
    await this.loadSnapshot();
  },

  // ------------------------
  // WIPE
  // ------------------------
  async wipeAll() {
    await DB.wipeAll();
    _state = {
      transactions: [],
      categories: [],
      settings: {},
      pinHash: null
    };
  },

  clearState() {
    _state = {
      transactions: [],
      categories: [],
      settings: {},
      pinHash: null
    };
  }
};

export default StateModule;
