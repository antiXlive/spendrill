import { EventBus } from "./event-bus.js";
export function createRipple(e, el) {
    if (!el) return;
    const r = el.getBoundingClientRect(),
        s = document.createElement("span");
    s.className = "ripple";
    s.style.left = e.clientX - r.left + "px";
    s.style.top = e.clientY - r.top + "px";
    el.appendChild(s);
    setTimeout(() => s.remove(), 600);
}
export function attachLongPress(el, cb, dur = 700) {
    if (!el) return;
    let t = null;
    const start = (ev) => {
        el.classList.add("pressing");
        t = setTimeout(() => {
            try {
                cb(ev);
            } catch {}
            el.classList.remove("pressing");
        }, dur);
    };
    const cancel = () => {
        if (t) clearTimeout(t);
        t = null;
        el.classList.remove("pressing");
    };
    el.addEventListener("touchstart", start, { passive: true });
    el.addEventListener("mousedown", start);
    el.addEventListener("touchmove", cancel, { passive: true });
    el.addEventListener("mousemove", cancel);
    el.addEventListener("touchend", cancel, { passive: true });
    el.addEventListener("mouseup", cancel);
    return () => cancel();
}
export function enableSwipe(el, onLeft, onRight) {
    if (!el) return;
    let touch = { startX: 0, x: 0, y: 0 };
    const onStart = (e) => {
        const t = (e.touches && e.touches[0]) || e;
        touch.startX = t.clientX;
        touch.x = t.clientX;
        touch.y = t.clientY;
    };
    const onMove = (e) => {
        const t = (e.touches && e.touches[0]) || e;
        touch.x = t.clientX;
        touch.y = t.clientY;
    };
    const onEnd = () => {
        const dx = touch.x - touch.startX;
        if (dx < -60) onLeft?.();
        else if (dx > 60) onRight?.();
    };
    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: true });
    el.addEventListener("touchend", onEnd, { passive: true });
    el.addEventListener("mousedown", onStart);
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseup", onEnd);
}
