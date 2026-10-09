/**
 * scroll-loop — flag a scroll event listener whose body calls a programmatic
 * scroll API (`scrollTo`, `scrollBy`, `scrollIntoView`).
 *
 * Why: a programmatic scroll fires further `scroll` events, which re-enters
 * the handler, which scrolls again. In Chrome this freezes the tab; in
 * Firefox/Safari it pegs the main thread until the user kills the page.
 *
 * False-positive risk: the detector does not verify the scrollTo target is
 * different from the current position. In practice generated code that
 * scrolls only sometimes is rare — a re-prompt is cheap.
 */
import type { Detector } from "../types.js";
import { snippetAround } from "../extract-scripts.js";

const LISTENER_RE = /addEventListener\s*\(\s*['"]scroll['"][\s\S]{0,4000}?\}\s*\)/g;
const SCROLL_API_RE = /\b(?:scrollTo|scrollIntoView|scrollBy)\s*\(/;

export const scrollLoop: Detector = (js) => {
  if (!js) return [];
  const issues = [];
  let m: RegExpExecArray | null;
  LISTENER_RE.lastIndex = 0;
  while ((m = LISTENER_RE.exec(js)) !== null) {
    if (SCROLL_API_RE.test(m[0])) {
      issues.push({
        detector: "scroll-loop" as const,
        severity: "high" as const,
        message:
          "scroll event listener calls scrollTo / scrollIntoView / scrollBy — programmatic scroll re-fires the same event and re-enters the handler, hanging the tab.",
        evidence: snippetAround(js, m.index, m[0].length),
      });
    }
  }
  return issues;
};
