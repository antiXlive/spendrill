export const esc = (s) =>
    String(s == null ? "" : s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
export const fmtCurrency = (n, opts = { locale: "en-IN", currency: "INR", maxFrac: 0 }) => {
    try {
        return new Intl.NumberFormat(opts.locale, {
            style: "currency",
            currency: opts.currency,
            maximumFractionDigits: opts.maxFrac,
        }).format(Number(n) || 0);
    } catch {
        const v = Math.round(Number(n) || 0);
        return "₹" + v;
    }
};
export const dateLabelFromKey = (key) => {
    const d = new Date(key);
    const t = new Date();
    const y = new Date();
    y.setDate(t.getDate() - 1);
    t.setHours(0, 0, 0, 0);
    y.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);
    if (d.getTime() === t.getTime()) return "Today";
    if (d.getTime() === y.getTime()) return "Yesterday";
    return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }).replace(",", "");
};
export const uuid = () => {
    try {
        return crypto.randomUUID();
    } catch {
        return Date.now().toString(36) + Math.random().toString(36).slice(2);
    }
};
export const resolveIcon = (t) => {
    if (!t) return "🧾";
    if (t.subId) {
        if (t.subImage?.trim()) return `<img src="${esc(t.subImage)}" class="tx-img">`;
        if (t.subEmoji) return esc(t.subEmoji);
    }
    if (t.catImage?.trim()) return `<img src="${esc(t.catImage)}" class="tx-img">`;
    if (t.catEmoji) return esc(t.catEmoji);
    return "🧾";
};
export function slugify(str = "") {
    return String(str)
        .normalize("NFKD")
        .replace(/[^\p{L}\p{N}\p{Emoji}\s-]/gu, "") // keep letters, numbers, emoji
        .trim()
        .toLowerCase()
        .replace(/[\s\W-]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

