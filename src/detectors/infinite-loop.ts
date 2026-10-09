/**
 * infinite-loop — flag `while(true)` or `for(;;)` constructs whose body has
 * no `break`, `return`, or `throw` to escape.
 *
 * Why: synchronous infinite loops on the main thread freeze the entire page,
 * including any code that might otherwise rescue it. The hot-loop check is
 * crude (single regex over the rest of the file) but in practice generated
 * code is small enough that scoping is rarely needed.
 */
import type { Detector } from "../types.js";
import { snippetAround } from "../extract-scripts.js";

const HEAD_RE = /(while\s*\(\s*(?:true|1)\s*\)|for\s*\(\s*;\s*;\s*\))\s*\{/g;

export const infiniteLoop: Detector = (js) => {
  if (!js) return [];
  const issues = [];
  let m: RegExpExecArray | null;
  HEAD_RE.lastIndex = 0;
  while ((m = HEAD_RE.exec(js)) !== null) {
    const bodyStart = m.index + m[0].length;
    const body = readBalancedBlock(js, bodyStart - 1);
    if (body === null) {
      // Unbalanced braces — be conservative and skip rather than over-flag.
      continue;
    }
    if (!/\b(break|return|throw)\b/.test(body)) {
      issues.push({
        detector: "infinite-loop" as const,
        severity: "high" as const,
        message:
          "while(true) / for(;;) with no break, return, or throw in body — main thread will hang.",
        evidence: snippetAround(js, m.index, m[0].length),
      });
    }
  }
  return issues;
};

/** Read a balanced `{ … }` block starting at the `{` index. Returns null on imbalance. */
function readBalancedBlock(src: string, openBraceIdx: number): string | null {
  if (src[openBraceIdx] !== "{") return null;
  let depth = 0;
  for (let i = openBraceIdx; i < src.length; i++) {
    const ch = src[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return src.slice(openBraceIdx + 1, i);
    }
  }
  return null;
}
