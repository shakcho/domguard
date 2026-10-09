// store.js — tiny observable app state.
// Components subscribe with store.subscribe(fn) and read store.state.
// Any mutation should go through store.set(patch), which notifies subscribers.

const listeners = new Set();

export const store = {
  state: {
    user: { name: "Ada Lovelace", email: "ada@example.com" },
    settings: { theme: "light", density: "comfortable", liveUpdates: true },
    items: [],        // feature components may populate this
    notifications: [],
  },

  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  // Shallow-merge a patch into state and notify everyone.
  set(patch) {
    store.state = { ...store.state, ...patch };
    for (const fn of listeners) fn(store.state);
  },

  // Convenience for nested settings updates.
  setSetting(key, value) {
    store.set({ settings: { ...store.state.settings, [key]: value } });
  },
};
