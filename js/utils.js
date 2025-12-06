import { db } from "../js/db.js";

export function slugify(str = "") {
    return String(str)
        .normalize("NFKD")
        .replace(/[^\p{L}\p{N}\p{Emoji}\s-]/gu, "") // keep letters, numbers, emoji
        .trim()
        .toLowerCase()
        .replace(/[\s\W-]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

export const uuid = () => {
    try {
        return crypto.randomUUID();
    } catch {
        return Date.now().toString(36) + Math.random().toString(36).slice(2);
    }
};

// /js/utils.js - Updated resolveIcon with image validation

// ============================================================================
// ICON RESOLUTION WITH IMAGE VALIDATION
// ============================================================================

// Cache for validated images to avoid re-checking
const imageCache = new Map();

export async function resolveIcon(t) {
  if (!t) return { type: "emoji", value: "📦" };

  // Load category
  const cat = await db.categories.get(t.catId);
  if (!cat) return txFallback(t);

  // Find subcategory if exists
  let sub = null;
  if (t.subId && Array.isArray(cat.subcategories)) {
    sub = cat.subcategories.find(s => s.id === t.subId);
  }

  // Priority 1: Subcategory image (validate first)
  if (sub?.image && await isValidImage(sub.image)) {
    return { type: "image", value: sub.image };
  }

  // Priority 2: Subcategory emoji
  if (sub?.emoji) return { type: "emoji", value: sub.emoji };

  // Priority 3: Category image (validate first)
  if (cat.image && await isValidImage(cat.image)) {
    return { type: "image", value: cat.image };
  }

  // Priority 4: Category emoji
  if (cat.emoji) return { type: "emoji", value: cat.emoji };

  // Final fallback
  return txFallback(t);
}

async function txFallback(t) {
  // Check transaction-level image
  if (t.image && await isValidImage(t.image)) {
    return { type: "image", value: t.image };
  }

  // Check icon field (could be image or emoji)
  if (t.icon) {
    if (looksLikeImage(t.icon) && await isValidImage(t.icon)) {
      return { type: "image", value: t.icon };
    }
    return { type: "emoji", value: t.icon };
  }

  // Transaction emoji
  if (t.emoji) return { type: "emoji", value: t.emoji };

  // Ultimate fallback
  return { type: "emoji", value: "📦" };
}

function looksLikeImage(v) {
  if (!v) return false;
  return (
    v.startsWith("data:image") ||
    v.includes("/") ||
    /\.(png|jpg|jpeg|svg|webp)$/i.test(v)
  );
}

// Validate image can be loaded
async function isValidImage(url) {
  if (!url) return false;

  // Check cache first
  if (imageCache.has(url)) {
    return imageCache.get(url);
  }

  try {
    const img = new Image();
    const promise = new Promise((resolve) => {
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      // Timeout after 2 seconds
      setTimeout(() => resolve(false), 2000);
    });
    
    img.src = url;
    const isValid = await promise;
    
    // Cache the result
    imageCache.set(url, isValid);
    return isValid;
  } catch (err) {
    imageCache.set(url, false);
    return false;
  }
}

// Optional: Clear cache periodically or on demand
export function clearImageCache() {
  imageCache.clear();
}

// ============================================================================
// OTHER UTILITY FUNCTIONS (keep your existing ones)
// ============================================================================

// HTML escaping
export function esc(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Currency formatting
export function fmtCurrency(amt) {
  const num = Number(amt) || 0;
  return "₹" + num.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}

// Date label from YYYY-MM-DD key
export function dateLabelFromKey(key) {
  if (!key) return "";
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (dt.toDateString() === today.toDateString()) return "Today";
  if (dt.toDateString() === yesterday.toDateString()) return "Yesterday";
  
  return dt.toLocaleDateString(undefined, { 
    weekday: "short", 
    month: "short", 
    day: "numeric" 
  });
}