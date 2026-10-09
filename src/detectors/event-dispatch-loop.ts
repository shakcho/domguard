/**
 * event-dispatch-loop — flag an `addEventListener('X', cb)` whose `cb`
 * calls `dispatchEvent(new Event('X'))` for the same event type.
 *
 * Why: the listener fires, the handler dispatches, the dispatch invokes the
 * listener, and so on. Synchronous event dispatch in JS means this freezes
 * the main thread immediately.
 */
import type { Detector } from "../types.js";
import { snippetAround } from "../extract-scripts.js";

const LISTENER_RE = /addEventListener\s*\(\s*['"]([\w-]+)['"]([\s\S]{0,4000}?)\}\s*\)/g;
const DISPATCH_RE = /dispatchEvent\s*\(\s*new\s+\w*Event\s*\(\s*['"]([\w-]+)['"]/g;

export const eventDispatchLoop: Detector = (js) => {
  if (!js) return [];
  const issues = [];
  let m: RegExpExecArray | null;
  LISTENER_RE.lastIndex = 0;
  while ((m = LISTENER_RE.exec(js)) !== null) {
    const eventType = m[1];
    const body = m[2];
    if (!eventType || !body) continue;

    let inner: RegExpExecArray | null;
    DISPATCH_RE.lastIndex = 0;
    while ((inner = DISPATCH_RE.exec(body)) !== null) {
      if (inner[1] === eventType) {
        issues.push({
          detector: "event-dispatch-loop" as const,
          severity: "high" as const,
          message: `listener for "${eventType}" dispatches the same event type — infinite event recursion.`,
          evidence: snippetAround(js, m.index, m[0].length),
        });
        break; // one issue per listener is enough
      }
    }
  }
  return issues;
};
