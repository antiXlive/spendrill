// js/app.js
// Bootstraps the app, router, theme, state, DB and worker orchestration.

import EventBus from './event-bus.js';
import StateModule from './state.js';
import * as DB from './db.js';
import { sha256Hex, uuidv4 } from './utils.js';
import { THEMES } from './constants.js';

// Import components (they register themselves in connectedCallback)
import '../components/pin-screen.js';
import '../components/header-bar.js';
import '../components/tab-bar.js';
import '../components/home-screen.js';
import '../components/ai-screen.js';
import '../components/stats-screen.js';
import '../components/settings-screen.js';
import '../components/entry-sheet.js';

window.__STATE__ = null;
window.__LATEST_STATS__ = null;
let statsWorker = null;

// DEV toggle: set to false for production
const DEV_DISABLE_PIN = true;

(async function init() {
  await DB.initDB();
  setupEventHandlers();

  // load snapshot
  const snapshot = await StateModule.loadSnapshot();
  window.__STATE__ = snapshot;
  EventBus.emit('state-changed', structuredClone(snapshot));

  // apply theme from state or default
  const theme = snapshot.settings?.theme || 'midnight';
  if (THEMES.includes(theme)) {
    document.documentElement.setAttribute('data-theme', theme);
  } else {
    document.documentElement.setAttribute('data-theme', 'midnight');
  }

  // Auth handling
  if (DEV_DISABLE_PIN) {
    EventBus.emit('auth-state-changed', { showPin: false });
    const pinEl = document.querySelector('pin-screen');
    if (pinEl) pinEl.style.display = 'none';
    navigate('home');
  } else {
    EventBus.emit('auth-state-changed', { showPin: !snapshot.pinHash });
    EventBus.emit('request-pin', { mode: snapshot.pinHash ? 'unlock' : 'setup', biometricEnabled: snapshot.settings.biometricEnabled });
  }

  // Start worker
  statsWorker = new Worker('./js/worker-stats.js', { type: 'module' });
  statsWorker.addEventListener('message', (e) => {
    if (e.data?.type === 'stats') {
      window.__LATEST_STATS__ = e.data.payload;
      EventBus.emit('stats-ready', e.data.payload);
    }
  });

  computeStats();
})();

export function navigate(screen) {
  document.querySelectorAll('[data-screen]').forEach(el => {
    el.style.display = (el.dataset.screen === screen ? 'block' : 'none');
  });
  EventBus.emit('screen-changed', screen);
}

export function showToast({ message = '', type = 'info' } = {}) {
  const root = document.getElementById('toast-root');
  if (!root) return;
  const div = document.createElement('div');
  div.className = 'toast';
  div.textContent = message;
  root.appendChild(div);
  requestAnimationFrame(()=>div.classList.add('show'));
  setTimeout(()=>div.classList.remove('show'), 180);
  setTimeout(()=> { try{ root.removeChild(div);}catch(_){} }, 420);
}

function setupEventHandlers() {
  EventBus.on('toast', (d) => showToast(d));

  EventBus.on('navigate', ({ screen }) => navigate(screen));

  EventBus.on('request-refresh', async () => {
    window.__STATE__ = await StateModule.loadSnapshot();
    EventBus.emit('state-changed', structuredClone(window.__STATE__));
    computeStats();
    EventBus.emit('toast', { message: 'Refreshed', type: 'success' });
  });

  // Theme change
  EventBus.on('theme-change', async ({ theme }) => {
    if (!THEMES.includes(theme)) {
      EventBus.emit('toast', { message: 'Unknown theme', type: 'error' });
      return;
    }
    document.documentElement.setAttribute('data-theme', theme);
    await DB.saveSetting('theme', theme);
    window.__STATE__ = await StateModule.loadSnapshot();
    EventBus.emit('state-changed', structuredClone(window.__STATE__));
    EventBus.emit('toast', { message: 'Theme updated', type: 'success' });
  });

  // PIN logic (disabled in dev)
  if (!DEV_DISABLE_PIN) {
    EventBus.on('pin-submit', async ({ pin, biometric }) => {
      if (!pin || pin.length !== 4) { EventBus.emit('toast', { message: 'PIN must be 4 digits', type: 'error' }); return; }
      const hash = await sha256Hex(pin);
      const cur = StateModule.getState();
      if (!cur.pinHash) {
        await StateModule.setPinHash(hash);
        await DB.saveSetting('biometricEnabled', !!biometric);
        EventBus.emit('toast', { message: 'PIN saved', type: 'success' });
        window.__STATE__ = await StateModule.loadSnapshot();
        EventBus.emit('state-changed', structuredClone(window.__STATE__));
        EventBus.emit('auth-state-changed', { showPin: false });
        navigate('home');
      } else {
        if (hash === cur.pinHash) {
          EventBus.emit('toast', { message: 'Unlocked', type: 'success' });
          EventBus.emit('auth-state-changed', { showPin: false });
          navigate('home');
        } else {
          EventBus.emit('toast', { message: 'Wrong PIN', type: 'error' });
        }
      }
    });
  } else {
    EventBus.on('pin-submit', () => {});
  }

  // Transactions
  EventBus.on('tx-add', async ({ tx }) => {
    const id = uuidv4();
    await DB.addTransaction({ ...tx, id, createdAt: new Date().toISOString() });
    window.__STATE__ = await StateModule.loadSnapshot();
    EventBus.emit('state-changed', structuredClone(window.__STATE__));
    computeStats();
    EventBus.emit('toast', { message: 'Transaction added', type: 'success' });
  });

  EventBus.on('tx-update', async ({ tx }) => {
    if (!tx.id) return;
    await DB.putTransaction(tx);
    window.__STATE__ = await StateModule.loadSnapshot();
    EventBus.emit('state-changed', structuredClone(window.__STATE__));
    computeStats();
    EventBus.emit('toast', { message: 'Transaction updated', type: 'success' });
  });

  EventBus.on('tx-delete', async ({ id }) => {
    await DB.deleteTransaction(id);
    window.__STATE__ = await StateModule.loadSnapshot();
    EventBus.emit('state-changed', structuredClone(window.__STATE__));
    computeStats();
    EventBus.emit('toast', { message: 'Transaction deleted', type: 'success' });
  });

  EventBus.on('request-tx-by-id', async ({ id }) => {
    const tx = await DB.getTransactionById(id);
    EventBus.emit('tx-by-id', { tx });
  });

  // Categories
  EventBus.on('category-add', async ({ name }) => {
    await DB.addCategory(name);
    window.__STATE__ = await StateModule.loadSnapshot();
    EventBus.emit('state-changed', structuredClone(window.__STATE__));
    EventBus.emit('toast', { message: 'Category added', type: 'success' });
  });

  EventBus.on('category-delete', async ({ name }) => {
    await DB.deleteCategoryByName(name);
    window.__STATE__ = await StateModule.loadSnapshot();
    EventBus.emit('state-changed', structuredClone(window.__STATE__));
    EventBus.emit('toast', { message: 'Category deleted', type: 'success' });
  });

  // Stats compute
  EventBus.on('compute-stats', ({ transactions }) => {
    if (!statsWorker) return;
    statsWorker.postMessage({ type: 'compute', payload: { transactions } });
  });

  // export/import
  EventBus.on('export-json', async () => {
    const snapshot = await StateModule.loadSnapshot();
    const blob = new Blob([JSON.stringify(snapshot,null,2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spendrill-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    EventBus.emit('toast', { message: 'Export started', type: 'success' });
  });

  EventBus.on('import-json', async () => {
    try {
      const [fileHandle] = await window.showOpenFilePicker({ types: [{ description: 'JSON', accept: {'application/json': ['.json']} }], multiple: false });
      const f = await fileHandle.getFile();
      const text = await f.text();
      const parsed = JSON.parse(text);
      // naive import
      if (Array.isArray(parsed.transactions)) {
        await DB.db.transactions.clear();
        for (const t of parsed.transactions) await DB.addTransaction(t);
      }
      if (Array.isArray(parsed.categories)) {
        await DB.db.categories.clear();
        for (const c of parsed.categories) await DB.addCategory(c);
      }
      window.__STATE__ = await StateModule.loadSnapshot();
      EventBus.emit('state-changed', structuredClone(window.__STATE__));
      EventBus.emit('toast', { message: 'Import completed', type: 'success' });
    } catch (err) {
      console.error(err);
      EventBus.emit('toast', { message: 'Import failed', type: 'error' });
    }
  });

  // choose backup folder
  EventBus.on('choose-backup-folder', async () => {
    try {
      const handle = await window.showDirectoryPicker();
      await DB.saveSetting('backupDir', handle);
      await DB.saveSetting('backupDirName', handle.name || 'backup');
      window.__STATE__ = await StateModule.loadSnapshot();
      EventBus.emit('state-changed', structuredClone(window.__STATE__));
      EventBus.emit('toast', { message: 'Backup folder selected', type: 'success' });
      await autoBackup();
    } catch (err) {
      console.warn(err);
      EventBus.emit('toast', { message: 'Folder selection cancelled', type: 'error' });
    }
  });

  EventBus.on('request-state-snapshot', async () => {
    const s = await StateModule.loadSnapshot();
    EventBus.emit('state-snapshot', { state: s });
  });

  EventBus.on('open-settings', () => navigate('settings'));
}

async function computeStats() {
  const s = await StateModule.loadSnapshot();
  EventBus.emit('compute-stats', { transactions: s.transactions || [] });
}

async function autoBackup() {
  try {
    const setting = await DB.getSetting('backupDir');
    if (!setting?.value) return;
    const dir = setting.value;
    const snapshot = await StateModule.loadSnapshot();
    const fileHandle = await dir.getFileHandle(`spendrill-backup-${new Date().toISOString().slice(0,10)}.json`, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(snapshot,null,2));
    await writable.close();
    EventBus.emit('toast', { message: 'Auto-backup saved', type: 'success' });
  } catch (err) {
    console.warn(err);
    EventBus.emit('toast', { message: 'Auto-backup failed', type: 'error' });
  }
}
