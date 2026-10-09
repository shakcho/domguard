/**
 * recursive-fn — flag a `function name(…) { … }` declaration whose body calls
 * `name(…)` somewhere, unless an obvious depth guard is present.
 *
 * Why: LLMs sometimes emit a "helper" that recurses without termination —
 * the call stack grows until the engine throws `RangeError`. That error
 * leaks to the page's onerror handler and, depending on the framing, can
 * cascade into other failures. We flag it as medium because deliberate
 * tail recursion is a legitimate pattern.
 *
 * Depth-guard heuristic: a recursive call within an `if` that references
 * a numeric counter or a `depth < N` style comparison is treated as
 * guarded and not flagged.
 */
import type { Detector } from "../types.js";
import { snippetAround } from "../extract-scripts.js";

const FN_DECL_RE = /function\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*\{/g;

export const recursiveFn: Detector = (js) => {
  if (!js) return [];
  const issues = [];
  let m: RegExpExecArray | null;
  FN_DECL_RE.lastIndex = 0;
  while ((m = FN_DECL_RE.exec(js)) !== null) {
    const name = m[1];
    if (!name) continue;
    const bodyOpen = m.index + m[0].length - 1;
    const body = readBalancedBlock(js, bodyOpen);
    if (body === null) continue;

    const selfCall = new RegExp(`\\b${escapeRegex(name)}\\s*\\(`);
    if (!selfCall.test(body)) continue;

    if (hasDepthGuard(body)) continue;

    issues.push({
      detector: "recursive-fn" as const,
      severity: "medium" as const,
      message: `function "${name}" calls itself without an obvious depth guard or base case — risk of RangeError.`,
      evidence: snippetAround(js, m.index, m[0].length),
    });
  }
  return issues;
};

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

function hasDepthGuard(body: string): boolean {
  // A numeric base-case comparison, e.g. `if (n <= 0) return`, `depth < 50`,
  // or a literal early return on a falsy argument.
  if (/\bif\s*\([^)]*[<>]=?\s*\d+/.test(body) && /\breturn\b/.test(body)) return true;
  if (/\bif\s*\(\s*!\s*\w+\s*\)\s*return\b/.test(body)) return true;
  if (/\bif\s*\(\s*\w+\s*===?\s*(?:null|undefined|0)\s*\)\s*return\b/.test(body)) return true;
  return false;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
