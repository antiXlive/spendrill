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
    const transactions = await DB.db.transactions.toArray();
    const categories = await DB.db.categories.toArray();
    const settingsArray = await DB.db.settings.toArray();

    const settings = {};
    for (const row of settingsArray) {
      settings[row.key] = row.value;
    }

    // ENRICH transactions with category/subcategory names
    const enrichedTransactions = transactions.map(tx => {
      const cat = categories.find(c => c.id === tx.catId);
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

    return _state;
  },

  // Save pin hash in settings + local state
  async setPinHash(hash) {
    await DB.saveSetting("pinHash", hash);
    _state.pinHash = hash;
  }
};

export default StateModule;