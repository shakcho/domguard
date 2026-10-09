/**
 * domguard public API.
 *
 * Static detection of browser-hang patterns in LLM-generated JavaScript,
 * plus an optional runtime guard for one of the patterns (RangeError from
 * unbounded recursion) that cannot be reliably caught statically.
 */
import type { Issue, Report } from "./types.js";
import { detectors, ALL_DETECTORS } from "./detectors/index.js";
import { extractInlineJs } from "./extract-scripts.js";

export type { Detector, DetectorId, Issue, Report, Severity } from "./types.js";
export { detectors, ALL_DETECTORS } from "./detectors/index.js";
export { extractInlineJs } from "./extract-scripts.js";
export { wrapWithRuntimeGuard } from "./runtime-guard.js";
export type { WrapOptions } from "./runtime-guard.js";

/**
 * Run every detector against `source` and return a structured report.
 *
 * `source` may be:
 *   - a full HTML document (inline `<script>` blocks are extracted),
 *   - or a raw JavaScript string (analyzed directly).
 *
 * The function is synchronous and side-effect free. It does not throw —
 * an internal detector failure produces zero issues for that detector,
 * never a crash.
 */
export function analyze(source: string): Report {
  const t0 = performance.now();
  const js = extractInlineJs(source);
  const issues: Issue[] = [];

  for (const id of ALL_DETECTORS) {
    const detector = detectors[id];
    try {
      for (const issue of detector(js)) issues.push(issue);
    } catch {
      // Detector bugs must never block the host pipeline. Swallow.
    }
  }

  return {
    safe: issues.length === 0,
    issues,
    durationMs: performance.now() - t0,
  };
}
