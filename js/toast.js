// js/toast.js
// Global Toast Utility for Spendrill
// ---------------------------------
// Usage: showToast("Message", "success");

export function showToast(message = "", type = "info", duration = 1800) {
  if (!message) return;

  // Ensure toast root exists
  let root = document.getElementById("toast-root");
  if (!root) {
    root = document.createElement("div");
    root.id = "toast-root";
    root.className = "toast-root";
    document.body.appendChild(root);
  }

  const el = document.createElement("div");
  el.className = `toast toast--${type}`;
  el.textContent = message;
  root.appendChild(el);

  // Entrance animation
  requestAnimationFrame(() => el.classList.add("show"));

  // Auto-remove
  setTimeout(() => {
    el.classList.remove("show");
    setTimeout(() => el.remove(), 240);
  }, duration);
}
