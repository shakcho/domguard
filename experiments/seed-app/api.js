// api.js — mock backend. Returns promises so callers must handle async.
// Latency is simulated; data is deterministic-ish for reproducibility.

function delay(ms) { return new Promise((r) => setTimeout(r, ms)); }

let _seq = 0;

export async function fetchItems(cursor = 0, pageSize = 20) {
  await delay(120);
  const items = Array.from({ length: pageSize }, (_, i) => ({
    id: cursor + i,
    label: `Item #${cursor + i}`,
  }));
  return { items, nextCursor: cursor + pageSize };
}

export async function fetchNotifications() {
  await delay(80);
  _seq += 1;
  return Array.from({ length: _seq % 5 }, (_, i) => ({
    id: `${_seq}-${i}`,
    text: `Notification ${_seq}-${i}`,
    read: false,
  }));
}

export async function fetchMetrics() {
  await delay(60);
  return {
    rps: 100 + (_seq % 50),
    errorRate: ((_seq % 7) / 100).toFixed(3),
    latencyMs: 40 + (_seq % 30),
    activeUsers: 1200 + (_seq % 100),
  };
}

export async function saveSettings(settings) {
  await delay(100);
  return { ok: true, settings };
}
