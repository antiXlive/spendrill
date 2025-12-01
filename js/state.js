// js/state.js
// Central state manager for Spendrill

import * as DB from "./db.js";

let _state = {
  transactions: [],
  categories: [],
  settings: {},
  pinHash: null
};

const StateModule = {
  getState() {
    return _state;
  },

  // Load everything from DB into a single state object
  async loadSnapshot() {
    try {
      // Use DB helpers instead of direct DB access
      const transactions = await DB.getAllTransactions();
      const categories = await DB.getAllCategories();
      const settingsArray = await DB.db.settings.toArray();

      // Convert settings array to object
      const settings = {};
      for (const row of settingsArray) {
        settings[row.key] = row.value;
      }

      // Create category lookup map for O(1) performance
      const catMap = new Map(categories.map(c => [c.id, c]));

      // ENRICH transactions with category/subcategory names
      const enrichedTransactions = transactions.map(tx => {
        const cat = catMap.get(tx.catId);
        const sub = cat?.subcategories?.find(s => s.id === tx.subId);

        return {
          ...tx,
          catName: cat?.name || "Uncategorized",
          subName: sub?.name || "",
          emoji: cat?.emoji || "🧾"
        };
      });

      _state = {
        transactions: enrichedTransactions,
        categories,
        settings,
        pinHash: settings.pinHash || null
      };

      console.log(`✅ State loaded: ${enrichedTransactions.length} transactions, ${categories.length} categories`);
      
      return _state;
    } catch (error) {
      console.error("❌ Failed to load state snapshot:", error);
      
      // Return a safe empty state instead of crashing
      _state = {
        transactions: [],
        categories: [],
        settings: {},
        pinHash: null
      };
      
      return _state;
    }
  },

  // Save pin hash in settings + local state
  async setPinHash(hash) {
    try {
      await DB.saveSetting("pinHash", hash);
      _state.pinHash = hash;
      console.log("✅ PIN hash updated");
    } catch (error) {
      console.error("❌ Failed to save PIN hash:", error);
      throw error;
    }
  },

  // Helper: Get all settings as object
  async getAllSettings() {
    try {
      const settingsArray = await DB.db.settings.toArray();
      const settings = {};
      for (const row of settingsArray) {
        settings[row.key] = row.value;
      }
      return settings;
    } catch (error) {
      console.error("❌ Failed to get settings:", error);
      return {};
    }
  },

  // Helper: Clear local state (useful for logout)
  clearState() {
    _state = {
      transactions: [],
      categories: [],
      settings: {},
      pinHash: null
    };
    console.log("✅ State cleared");
  },

  // Helper: Refresh only transactions (faster than full reload)
  async refreshTransactions() {
    try {
      const transactions = await DB.getAllTransactions();
      const catMap = new Map(_state.categories.map(c => [c.id, c]));

      const enrichedTransactions = transactions.map(tx => {
        const cat = catMap.get(tx.catId);
        const sub = cat?.subcategories?.find(s => s.id === tx.subId);

        return {
          ...tx,
          catName: cat?.name || "Uncategorized",
          subName: sub?.name || "",
          emoji: cat?.emoji || "🧾"
        };
      });

      _state.transactions = enrichedTransactions;
      return _state;
    } catch (error) {
      console.error("❌ Failed to refresh transactions:", error);
      return _state;
    }
  },

  // Helper: Refresh only categories (faster than full reload)
  async refreshCategories() {
    try {
      const categories = await DB.getAllCategories();
      _state.categories = categories;
      
      // Re-enrich transactions with new category data
      await this.refreshTransactions();
      
      return _state;
    } catch (error) {
      console.error("❌ Failed to refresh categories:", error);
      return _state;
    }
  }
};

export default StateModule;