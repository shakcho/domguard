/**
 * mutation-observer-feedback — flag a `new MutationObserver(cb)` whose
 * callback mutates the DOM via `innerHTML=`, `textContent=`, `appendChild`,
 * `insertBefore`, `removeChild`, `classList.add/remove/toggle`, or
 * `setAttribute`.
 *
 * Why: a MutationObserver fires its callback on subtree changes. If the
 * callback itself changes the subtree, it re-fires forever. Browsers
 * normally rate-limit observer callbacks, but the work in the callback
 * still saturates the main thread.
 *
 * False-positive risk: if the callback mutates a *different* subtree than
 * the one being observed, this is safe. The detector cannot tell — it
 * flags any mutation inside the callback. Treat as medium-confidence.
 */
import type { Detector } from "../types.js";
import { snippetAround } from "../extract-scripts.js";

const NEW_OBS_RE = /new\s+MutationObserver\s*\(/g;
const MUTATING_API_RE =
  /\b(?:innerHTML|outerHTML|textContent)\s*=|\b(?:appendChild|insertBefore|removeChild|replaceChild|setAttribute|removeAttribute)\s*\(|\bclassList\s*\.\s*(?:add|remove|toggle)\s*\(/;

export const mutationObserverFeedback: Detector = (js) => {
  if (!js) return [];
  const issues = [];
  let m: RegExpExecArray | null;
  NEW_OBS_RE.lastIndex = 0;
  while ((m = NEW_OBS_RE.exec(js)) !== null) {
    // Inspect a window after the `new MutationObserver(` — captures the
    // callback whether it is inline or referenced by name.
    const window = js.slice(m.index, Math.min(js.length, m.index + 2000));
    if (MUTATING_API_RE.test(window)) {
      issues.push({
        detector: "mutation-observer-feedback" as const,
        severity: "high" as const,
        message:
          "MutationObserver callback contains DOM-mutating APIs — risk of infinite mutation loop if the same subtree is observed.",
        evidence: snippetAround(js, m.index, m[0].length),
      });
    }
  }
  return issues;
};
