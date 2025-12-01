// js/event-bus.js
// Lightweight event bus with proper cloning and error handling

const listeners = new Map();

export const EventBus = {
  /**
   * Subscribe to an event
   * @param {string} event - Event name
   * @param {function} cb - Callback function
   */
  on(event, cb) {
    if (!listeners.has(event)) {
      listeners.set(event, []);
    }
    listeners.get(event).push(cb);
  },

  /**
   * Subscribe to an event, auto-unsubscribe after first call
   * @param {string} event - Event name
   * @param {function} cb - Callback function
   */
  once(event, cb) {
    const wrapper = (...args) => {
      cb(...args);
      this.off(event, wrapper);
    };
    this.on(event, wrapper);
  },

  /**
   * Unsubscribe from an event
   * @param {string} event - Event name
   * @param {function} cb - Callback function to remove (optional)
   */
  off(event, cb) {
    if (!listeners.has(event)) return;
    
    // If no callback provided, remove specific listener (safer)
    if (!cb) {
      console.warn(`EventBus.off('${event}') called without callback - this removes ALL listeners!`);
      listeners.delete(event);
      return;
    }
    
    // Remove specific callback
    const filtered = listeners.get(event).filter(x => x !== cb);
    if (filtered.length === 0) {
      listeners.delete(event);
    } else {
      listeners.set(event, filtered);
    }
  },

  /**
   * Emit an event to all subscribers
   * @param {string} event - Event name
   * @param {any} detail - Data to pass (will be cloned)
   */
  emit(event, detail = {}) {
    if (!listeners.has(event)) return;

    // Clone payload safely
    const payload = this._clonePayload(detail);
    
    // Call all listeners with error handling
    const eventListeners = listeners.get(event);
    eventListeners.forEach(cb => {
      try {
        cb(payload);
      } catch (err) {
        console.error(`❌ EventBus: Handler failed for "${event}":`, err);
      }
    });
  },

  /**
   * Clone payload safely (handles File handles, Dates, etc.)
   * @private
   */
  _clonePayload(detail) {
    // Null or undefined - return as-is
    if (detail == null) return detail;

    // Primitive types - return as-is
    if (typeof detail !== 'object') return detail;

    // Use structuredClone if available (modern browsers)
    if (typeof structuredClone === 'function') {
      try {
        return structuredClone(detail);
      } catch (err) {
        // structuredClone fails on file handles, fall back to shallow clone
        console.warn('EventBus: structuredClone failed, using shallow clone:', err.message);
        return { ...detail };
      }
    }

    // Fallback: shallow clone (fast and safe)
    if (Array.isArray(detail)) {
      return [...detail];
    }
    
    return { ...detail };
  },

  /**
   * Get all registered events (for debugging)
   */
  getEvents() {
    return Array.from(listeners.keys());
  },

  /**
   * Get listener count for an event (for debugging)
   */
  getListenerCount(event) {
    return listeners.has(event) ? listeners.get(event).length : 0;
  },

  /**
   * Clear all listeners (for testing/cleanup)
   */
  clear() {
    listeners.clear();
    console.log('✅ EventBus cleared');
  },

  /**
   * Debug: Log all events and their listener counts
   */
  debug() {
    console.group('🔍 EventBus Debug');
    console.log('Total events:', listeners.size);
    listeners.forEach((cbs, event) => {
      console.log(`  ${event}: ${cbs.length} listener(s)`);
    });
    console.groupEnd();
  }
};

export default EventBus;

// Expose globally for debugging
window.EventBus = EventBus;