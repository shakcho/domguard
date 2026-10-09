/**
 * click-loop — flag a click event listener body that contains more than one
 * programmatic `.click()` call.
 *
 * Why: LLMs occasionally write a delegated click handler that, in branches,
 * calls `.click()` on another element which itself has a handler that loops
 * back. A single `.click()` is fine; two-or-more inside a click handler is
 * a strong smell. The check is intentionally crude: if the handler body
 * mentions `.click()` more than once, flag it.
 *
 * False-positive risk: comments containing `.click()` will trigger. Worth
 * accepting given the asymmetric cost of false negatives.
 */
import type { Detector } from "../types.js";
import { snippetAround } from "../extract-scripts.js";

const LISTENER_RE = /addEventListener\s*\(\s*['"]click['"][\s\S]{0,4000}?\}\s*\)/g;
const CLICK_CALL_RE = /\.click\s*\(\s*\)/g;

export const clickLoop: Detector = (js) => {
  if (!js) return [];
  const issues = [];
  let m: RegExpExecArray | null;
  LISTENER_RE.lastIndex = 0;
  while ((m = LISTENER_RE.exec(js)) !== null) {
    const hits = m[0].match(CLICK_CALL_RE);
    if (hits && hits.length >= 2) {
      issues.push({
        detector: "click-loop" as const,
        severity: "high" as const,
        message: `click listener contains ${hits.length} programmatic .click() calls — potential click feedback loop.`,
        evidence: snippetAround(js, m.index, m[0].length),
      });
    }
  }
  return issues;
};
