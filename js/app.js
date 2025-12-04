// js/app.js
// Full app bootstrap (FIXED WORKER + FIXED computeStats)
// ===============================================

import EventBus from "./event-bus.js";
import StateModule from "./state.js";
import * as DB from "./db.js";
import { THEMES } from "./constants.js";
import { initDefaultData } from "./init-default-data.js";

// Components
import "../components/pin-screen.js";
import "../components/header-bar.js";
import "../components/tab-bar.js";
import "../components/home-screen.js";
import "../components/ai-screen.js";
import "../components/stats-screen.js";
import "../components/settings-screen.js";
import "../components/entry-sheet.js";

window.__STATE__ = null;
window.__LATEST_STATS__ = null;
let statsWorker = null;

const DEV_DISABLE_PIN = true;

// Toast
export function showToast({ message = "", type = "info", duration = 2000 } = {}) {
    const root = document.getElementById("toast-root");
    if (!root) return;

    const el = document.createElement("div");
    el.className = `toast toast--${type}`;
    el.textContent = message;
    root.appendChild(el);

    requestAnimationFrame(() => el.classList.add("show"));
    setTimeout(() => {
        el.classList.remove("show");
        setTimeout(() => root.removeChild(el), 240);
    }, duration);
}

// Navigation
export function navigate(screen) {
    if (!screen) return;

    document.querySelectorAll("[data-screen]").forEach((el) => {
        el.hidden = el.dataset.screen !== screen;
    });

    EventBus.emit("navigated", { to: screen });
}

EventBus.on("navigate", ({ to }) => navigate(to));

window.addEventListener("DOMContentLoaded", () => navigate("home"));

// =============================================================
// INIT
// =============================================================
(async function init() {
    try {
        await DB.initDB();
        console.log("✅ DB ready");

        try {
            await initDefaultData();
        } catch (err) {
            console.warn("initDefaultData:", err);
        }

        setupEventHandlers();

        const snapshot = await StateModule.loadSnapshot();
        window.__STATE__ = snapshot;
        EventBus.emit("state-changed", snapshot);

        const themeName = snapshot.settings?.theme || "midnight";
        document.documentElement.setAttribute(
            "data-theme",
            THEMES.includes(themeName) ? themeName : "midnight"
        );

        // ===============================================
        // FIXED STATS WORKER
        // ===============================================
        try {
            const workerURL = new URL("worker-stats.js", import.meta.url);
            console.log("Stats worker:", workerURL.href);

            statsWorker = new Worker(workerURL, { type: "module" });

            // FIXED STATS WORKER LISTENER
            statsWorker.onmessage = (e) => {
                if (e.data?.type === "stats") {
                    window.__LATEST_STATS__ = e.data.payload;
                    EventBus.emit("stats-ready", e.data.payload); // << KEY FIX
                }
            };

            statsWorker.onerror = (err) => console.error("❌ Worker error:", err);


            statsWorker.onerror = (err) => console.error("❌ Worker error:", err);
        } catch (err) {
            console.error("❌ Worker load failed:", err);
        }

        // run stats once
        await computeStats();

        // PIN bypass
        if (DEV_DISABLE_PIN) {
            EventBus.emit("auth-state-changed", { showPin: false });
            const pin = document.querySelector("pin-screen");
            if (pin) pin.style.display = "none";
            navigate("home");
        } else {
            EventBus.emit("auth-state-changed", { showPin: !snapshot.pinHash });
        }

        console.log("🚀 App ready");
    } catch (err) {
        console.error("❌ Init error:", err);
        EventBus.emit("toast", { message: "Initialization failed", type: "error" });
    }
})();

// =============================================================
// FIXED computeStats()
// =============================================================
async function computeStats() {
    try {
        const state = window.__STATE__ || (await StateModule.loadSnapshot());

        if (!statsWorker) {
            console.warn("⚠ Stats worker not ready");
            return;
        }

        statsWorker.postMessage({
            type: "compute",
            payload: {
                transactions: state.transactions || []
            }
        });

    } catch (e) {
        console.error("computeStats failed:", e);
    }
}

// =============================================================
// Event Handlers
// =============================================================
function setupEventHandlers() {
    EventBus.on("toast", showToast);

    // Theme
    EventBus.on("theme-change", async ({ theme }) => {
        try {
            if (!THEMES.includes(theme)) {
                return EventBus.emit("toast", { message: "Unknown theme", type: "error" });
            }
            document.documentElement.setAttribute("data-theme", theme);
            await StateModule.saveSetting("theme", theme);
            EventBus.emit("toast", { message: "Theme updated", type: "success" });
        } catch (e) {
            EventBus.emit("toast", { message: "Theme change failed", type: "error" });
        }
    });

    // Refresh
    EventBus.on("request-refresh", async () => {
        await refreshState();
        await computeStats();
        EventBus.emit("toast", { message: "Refreshed", type: "success" });
    });

    // Transactions
    EventBus.on("tx-add", async ({ tx }) => {
        try {
            await StateModule.addTransaction(tx);
            await computeStats();
            EventBus.emit("toast", { message: "Transaction added", type: "success" });
        } catch (e) {
            EventBus.emit("toast", { message: e.message, type: "error" });
        }
    });

    EventBus.on("tx-update", async ({ tx }) => {
        try {
            await StateModule.updateTransaction(tx.id, tx);
            await computeStats();
            EventBus.emit("toast", { message: "Updated", type: "success" });
        } catch (e) {
            EventBus.emit("toast", { message: e.message, type: "error" });
        }
    });

    EventBus.on("tx-delete", async ({ id }) => {
        try {
            await StateModule.deleteTransaction(id);
            await computeStats();
            EventBus.emit("toast", { message: "Deleted", type: "success" });
        } catch (e) {
            EventBus.emit("toast", { message: e.message, type: "error" });
        }
    });

    // Categories
    EventBus.on("category-add", async ({ cat }) => {
        try {
            await DB.addCategory(cat);
            await refreshCategoriesOnly();
            EventBus.emit("toast", { message: "Category added", type: "success" });
        } catch (e) {
            EventBus.emit("toast", { message: e.message, type: "error" });
        }
    });

    EventBus.on("category-update", async ({ id, updates }) => {
        try {
            await DB.updateCategory(id, updates);
            await refreshCategoriesOnly();
            EventBus.emit("toast", { message: "Updated", type: "success" });
        } catch (e) {
            EventBus.emit("toast", { message: e.message, type: "error" });
        }
    });

    EventBus.on("category-delete", async ({ id }) => {
        try {
            await DB.deleteCategory(id, true);
            await refreshCategoriesOnly();
            EventBus.emit("toast", { message: "Deleted", type: "success" });
        } catch (e) {
            EventBus.emit("toast", { message: e.message, type: "error" });
        }
    });

    // Import/Export
    EventBus.on("data-imported", async () => {
        await refreshState();
        await computeStats();
    });

    // Backup
    EventBus.on("request-backup-now", async () => {
        await autoBackup();
    });
}

// =============================================================
async function refreshState() {
    window.__STATE__ = await StateModule.loadSnapshot();
    EventBus.emit("state-changed", window.__STATE__);
}

async function refreshTransactionsOnly() {
    window.__STATE__ = await StateModule.refreshTransactions();
    EventBus.emit("state-changed", window.__STATE__);
}

async function refreshCategoriesOnly() {
    window.__STATE__ = await StateModule.refreshCategories();
    EventBus.emit("state-changed", window.__STATE__);
}

// Expose global
window.SpendRill = {
    navigate,
    showToast,
    computeStats,
    refreshState,
    EventBus
};
