// js/event-bus.js
const listeners = new Map();

export const EventBus = {
  on(event, cb) {
    if (!listeners.has(event)) listeners.set(event, []);
    listeners.get(event).push(cb);
  },
  once(event, cb) {
    const wrapper = (...args) => {
      cb(...args);
      this.off(event, wrapper);
    };
    this.on(event, wrapper);
  },
  off(event, cb) {
    if (!listeners.has(event)) return;
    if (!cb) { listeners.delete(event); return; }
    listeners.set(event, listeners.get(event).filter(x=>x!==cb));
  },
  emit(event, detail = {}) {
    if (!listeners.has(event)) return;
    // shallow clone to avoid shared mutable objects
    const payload = JSON.parse(JSON.stringify(detail));
    listeners.get(event).forEach(cb => {
      try { cb(payload); } catch (err) { console.error('Event handler failed', err); }
    });
  }
};

export default EventBus;
window.EventBus = EventBus;
