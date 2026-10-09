/**
 * setinterval-leak — flag `setInterval(…)` calls when the same file does
 * not reference `clearInterval` at all.
 *
 * Why: an interval that is never cleared keeps the callback (and its
 * closure) alive forever. On long-lived pages this is a real memory leak
 * and, if the callback is non-trivial, drains CPU continuously. Not as
 * dramatic as a hang, but the most common "why is this tab consuming
 * 1 GB" cause we see in generated code.
 *
 * Severity is medium — the check is necessarily file-scoped and over-
 * flags interval-with-cleanup-in-another-module patterns. For most
 * single-file generated outputs this is fine.
 */
import type { Detector } from "../types.js";
import { snippetAround } from "../extract-scripts.js";

const SET_RE = /\bsetInterval\s*\(/g;
const CLEAR_RE = /\bclearInterval\s*\(/;

export const setIntervalLeak: Detector = (js) => {
  if (!js) return [];
  if (CLEAR_RE.test(js)) return [];
  const issues = [];
  let m: RegExpExecArray | null;
  SET_RE.lastIndex = 0;
  while ((m = SET_RE.exec(js)) !== null) {
    issues.push({
      detector: "setinterval-leak" as const,
      severity: "medium" as const,
      message:
        "setInterval is used but the file does not reference clearInterval anywhere — interval will run for the lifetime of the page.",
      evidence: snippetAround(js, m.index, m[0].length),
    });
    // Report one — multiple setInterval in a file is almost always the same
    // missing-cleanup story.
    break;
  }
  return issues;
};
