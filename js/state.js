// js/state.js
import * as DB from './db.js';
import { THEMES } from './constants.js';

const state = {
  transactions: [],
  categories: [],
  settings: {
    biometricEnabled: false,
    backupDirName: null,
    theme: 'midnight'
  },
  pinHash: null
};

export async function loadSnapshot() {
  await DB.initDB();
  state.transactions = await DB.getAllTransactions();
  const cats = await DB.getCategories();
  state.categories = (cats && cats.length) ? cats.map(c=>c.name) : ['Food','Transport','Groceries','Bills','Entertainment','Other'];
  const pin = await DB.getSettingValue('pin_hash');
  state.pinHash = pin || null;
  const theme = await DB.getSettingValue('theme');
  if (theme && THEMES.includes(theme)) state.settings.theme = theme;
  const bio = await DB.getSettingValue('biometricEnabled');
  state.settings.biometricEnabled = !!bio;
  const backup = await DB.getSettingValue('backupDirName');
  state.settings.backupDirName = backup || null;
  return structuredClone(state);
}

export async function saveTheme(theme) {
  if (!THEMES.includes(theme)) throw new Error('Unknown theme');
  state.settings.theme = theme;
  await DB.saveSetting('theme', theme);
}

export function getTheme() {
  return state.settings.theme;
}

export function getState() { return structuredClone(state); }

export async function setPinHash(hash) {
  state.pinHash = hash;
  await DB.saveSetting('pin_hash', hash);
}

export function verifyPinHash(hash) { return !!state.pinHash && state.pinHash === hash; }

export default {
  loadSnapshot, saveTheme, getTheme, getState, setPinHash, verifyPinHash
};
