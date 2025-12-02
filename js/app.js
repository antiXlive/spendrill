// js/app.js
// Full app bootstrap: router, theme, state, DB, worker, initial-data loader, event orchestration.

import EventBus from "./event-bus.js";
import StateModule from "./state.js";
import * as DB from "./db.js";
import { sha256Hex, uuidv4 } from "./utils.js";
import { THEMES } from "./constants.js";
import { initDefaultData } from "./init-default-data.js";

// Register components
import "../components/pin-screen.js";
import "../components/header-bar.js";
import "../components/tab-bar.js";
import "../components/home-screen.js";
import "../components/ai-screen.js";
import "../components/stats-screen.js";
import "../components/settings-screen.js";
import "../components/entry-sheet.js";

// Globals
window.__STATE__ = null;
window.__LATEST_STATS__ = null;
let statsWorker = null;

const DEV_DISABLE_PIN = true;

// ---------------------------------
// Toast Helper
// ---------------------------------

export function showToast({ message = "", type = "info", duration = 3000 } = {}) {
    const root = document.getElementById("toast-root");
    if (!root) return;

    const el = document.createElement("div");
    el.className = `toast toast--${type}`;
    el.textContent = message;
    root.appendChild(el);

    requestAnimationFrame(() => el.classList.add("show"));

    // Wait for 'duration' before hiding
    setTimeout(() => {
        el.classList.remove("show");
        setTimeout(() => root.removeChild(el), 240); // Allow CSS transition to finish
    }, duration);
}


// ---------------------------------
// Navigation (no URL changes)
// ---------------------------------
export function navigate(screen) {
    if (!screen) return;

    document.querySelectorAll("[data-screen]").forEach((el) => {
        if (el.dataset.screen === screen) el.removeAttribute("hidden");
        else el.setAttribute("hidden", "");
    });

    EventBus.emit("navigated", { to: screen });
}

// Tab bar → navigate
EventBus.on("navigate", ({ to }) => navigate(to));

window.addEventListener("DOMContentLoaded", () => navigate("home"));

// ---------------------------------
// INIT SEQUENCE
// ---------------------------------
(async function init() {
    try {
        await DB.initDB();

        // Load defaults + sample transactions ONCE
        try {
            await initDefaultData();
        } catch (e) {
            console.warn("initDefaultData failed:", e);
        }

        setupEventHandlers();

        const snapshot = await StateModule.loadSnapshot();
        window.__STATE__ = snapshot;
        // ✅ No need to clone - EventBus does it
        EventBus.emit("state-changed", snapshot);

        // Apply theme
        const themeName = snapshot.settings?.theme || "midnight";
        document.documentElement.setAttribute(
            "data-theme",
            THEMES.includes(themeName) ? themeName : "midnight"
        );

        // Worker for stats
        try {
            statsWorker = new Worker("./js/worker-stats.js", { type: "module" });
            statsWorker.onmessage = (e) => {
                if (e.data?.type === "stats") {
                    window.__LATEST_STATS__ = e.data.payload;
                    EventBus.emit("stats-ready", e.data.payload);
                }
            };
        } catch (e) {
            console.warn("Stats worker not available:", e);
        }

        await computeStats();

        // PIN Bypass during development
        if (DEV_DISABLE_PIN) {
            EventBus.emit("auth-state-changed", { showPin: false });
            const pinEl = document.querySelector("pin-screen");
            if (pinEl) pinEl.style.display = "none";
            navigate("home");
        } else {
            EventBus.emit("auth-state-changed", { showPin: !snapshot.pinHash });
            EventBus.emit("request-pin", {
                mode: snapshot.pinHash ? "unlock" : "setup",
                biometricEnabled: snapshot.settings?.biometricEnabled || false,
            });
        }
    } catch (err) {
        console.error("❌ App init error:", err);
        EventBus.emit("toast", { message: "Initialization failed", type: "error" });
    }
})();

// ---------------------------------
// Compute Stats
// ---------------------------------
async function computeStats() {
    try {
        // Use cached state instead of reloading
        if (window.__STATE__) {
            EventBus.emit("compute-stats", { transactions: window.__STATE__.transactions || [] });
        } else {
            const s = await StateModule.loadSnapshot();
            EventBus.emit("compute-stats", { transactions: s.transactions || [] });
        }
    } catch (e) {
        console.warn("computeStats error:", e);
    }
}

// ---------------------------------
// Auto Backup
// ---------------------------------
async function autoBackup() {
    try {
        const setting = await DB.getSetting("backupDir");
        if (!setting?.value) return;

        const dir = setting.value;
        const snapshot = await StateModule.loadSnapshot();
        const fileHandle = await dir.getFileHandle(
            `spendrill-backup-${new Date().toISOString().slice(0, 10)}.json`,
            { create: true }
        );

        const writable = await fileHandle.createWritable();
        await writable.write(JSON.stringify(snapshot, null, 2));
        await writable.close();

        EventBus.emit("toast", { message: "Auto-backup saved", type: "success" });
    } catch (e) {
        console.warn("autoBackup failed:", e);
        EventBus.emit("toast", { message: "Auto-backup failed", type: "error" });
    }
}

// ---------------------------------
// Helper: Refresh state and notify
// ---------------------------------
async function refreshState() {
    window.__STATE__ = await StateModule.loadSnapshot();
    EventBus.emit("state-changed", window.__STATE__);
}

// ✅ NEW: Fast refresh for transactions only
async function refreshTransactionsOnly() {
    window.__STATE__ = await StateModule.refreshTransactions();
    EventBus.emit("state-changed", window.__STATE__);
}

// ---------------------------------
// EVENT HANDLERS
// ---------------------------------
function setupEventHandlers() {
    EventBus.on("toast", showToast);

    // Theme Change
    EventBus.on("theme-change", async ({ theme }) => {
        try {
            if (!THEMES.includes(theme)) {
                EventBus.emit("toast", { message: "Unknown theme", type: "error" });
                return;
            }
            document.documentElement.setAttribute("data-theme", theme);
            await DB.saveSetting("theme", theme);

            await refreshState();
            EventBus.emit("toast", { message: "Theme updated", type: "success" });
        } catch (e) {
            console.error("❌ Theme change failed:", e);
            EventBus.emit("toast", { message: "Theme change failed", type: "error" });
        }
    });

    // Refresh
    EventBus.on("request-refresh", async () => {
        try {
            await refreshState();
            await computeStats();
            EventBus.emit("toast", { message: "Refreshed", type: "success" });
        } catch (e) {
            console.error("❌ Refresh failed:", e);
            EventBus.emit("toast", { message: "Refresh failed", type: "error" });
        }
    });

    // --------------------
    // TRANSACTIONS
    // --------------------
    EventBus.on("tx-add", async ({ tx }) => {
        try {
            const payload = { ...tx, id: uuidv4(), createdAt: new Date().toISOString() };
            await DB.addTransaction(payload);

            // ✅ Fast refresh - only transactions
            await refreshTransactionsOnly();
            await computeStats();

            EventBus.emit("toast", { message: "Transaction added", type: "success" });
        } catch (e) {
            console.error("❌ Add transaction failed:", e);
            EventBus.emit("toast", { message: "Add failed", type: "error" });
        }
    });

    EventBus.on("tx-update", async ({ tx }) => {
        try {
            if (!tx?.id) return;
            await DB.putTransaction(tx);

            // ✅ Fast refresh - only transactions
            await refreshTransactionsOnly();
            await computeStats();

            EventBus.emit("toast", { message: "Transaction updated", type: "success" });
        } catch (e) {
            console.error("❌ Update transaction failed:", e);
            EventBus.emit("toast", { message: "Update failed", type: "error" });
        }
    });

    EventBus.on("tx-delete", async ({ id }) => {
        try {
            await DB.deleteTransaction(id);

            // ✅ Fast refresh - only transactions
            await refreshTransactionsOnly();
            await computeStats();

            EventBus.emit("toast", { message: "Transaction deleted", type: "success" });
        } catch (e) {
            console.error("❌ Delete transaction failed:", e);
            EventBus.emit("toast", { message: "Delete failed", type: "error" });
        }
    });

    // --------------------
    // CATEGORIES
    // --------------------
    EventBus.on("category-add", async ({ cat }) => {
        try {
            await DB.addCategoryWithSubs(cat);

            // ✅ Full refresh - categories changed
            await refreshState();
            EventBus.emit("toast", { message: "Category added", type: "success" });
        } catch (e) {
            console.error("❌ Add category failed:", e);
            EventBus.emit("toast", { message: "Category add failed", type: "error" });
        }
    });

    EventBus.on("category-delete", async ({ id }) => {
        try {
            // ✅ Use DB helper instead of direct access
            await DB.deleteCategory(id);

            // ✅ Full refresh - categories changed
            await refreshState();
            EventBus.emit("toast", { message: "Category deleted", type: "success" });
        } catch (e) {
            console.error("❌ Delete category failed:", e);
            EventBus.emit("toast", { message: "Category delete failed", type: "error" });
        }
    });

    // --------------------
    // IMPORT / EXPORT
    // --------------------
    EventBus.on("export-json", async () => {
        try {
            const snapshot = await StateModule.loadSnapshot();
            const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
                type: "application/json",
            });

            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `spendrill-backup-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);

            EventBus.emit("toast", { message: "Export started", type: "success" });
        } catch (e) {
            console.error("❌ Export failed:", e);
            EventBus.emit("toast", { message: "Export failed", type: "error" });
        }
    });

    EventBus.on("import-json", async () => {
        try {
            const [fileHandle] = await window.showOpenFilePicker({
                types: [{ description: "JSON", accept: { "application/json": [".json"] } }],
            });

            const file = await fileHandle.getFile();
            const parsed = JSON.parse(await file.text());

            // Clear existing data
            await DB.db.transactions.clear();
            await DB.db.categories.clear();

            // ✅ Use bulk operations for better performance
            if (parsed.transactions?.length) {
                await DB.addTransactionsBulk(parsed.transactions);
            }
            if (parsed.categories?.length) {
                await DB.addCategoriesBulk(parsed.categories);
            }

            // Full refresh after import
            await refreshState();
            await computeStats();

            EventBus.emit("toast", { message: "Import completed", type: "success" });
        } catch (e) {
            console.error("❌ Import failed:", e);
            EventBus.emit("toast", { message: "Import failed", type: "error" });
        }
    });

    // --------------------
    // BACKUP DIR PICKER
    // --------------------
    EventBus.on("choose-backup-folder", async () => {
        try {
            const handle = await window.showDirectoryPicker();
            await DB.saveSetting("backupDir", handle);
            await DB.saveSetting("backupDirName", handle.name);

            await refreshState();

            EventBus.emit("toast", { message: "Backup folder selected", type: "success" });
            await autoBackup();
        } catch (e) {
            console.error("❌ Backup folder selection failed:", e);
            EventBus.emit("toast", { message: "Folder selection cancelled", type: "error" });
        }
    });

    // Snapshot request
    EventBus.on("request-state-snapshot", async () => {
        const s = await StateModule.loadSnapshot();
        EventBus.emit("state-snapshot", { state: s });
    });

    // UI → Settings
    EventBus.on("open-settings", () => navigate("settings"));
}