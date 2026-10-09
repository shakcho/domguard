/**
 * Runtime guard — wrap LLM-generated JS so a `RangeError` from runaway
 * recursion is caught and logged instead of propagating to `window.onerror`
 * and tearing down adjacent scripts.
 *
 * Importantly this guard does NOT save you from an infinite scroll loop or
 * an unbreakable `while(true)` — those never throw. It only rescues the
 * recursive-function failure mode, which is the most common silent crash
 * we observe in production. Static detection is still required for the
 * other six patterns.
 */

export interface WrapOptions {
  /**
   * Console method to use when a RangeError is caught. Default: "error".
   * Set to "warn" or null (suppress) for less noisy environments.
   */
  logVia?: "error" | "warn" | "info" | null;
  /** Tag prepended to the log line so multiple guards can be distinguished. */
  tag?: string;
}

/**
 * Wrap a JS source string in a try/catch that intercepts `RangeError`.
 * Other errors are re-thrown so legitimate bugs still surface.
 *
 * The wrapper is intentionally pure-string concatenation so it composes
 * with any later `<script>` injection mechanism.
 */
export function wrapWithRuntimeGuard(js: string, opts: WrapOptions = {}): string {
  const tag = opts.tag ?? "domguard";
  const logMethod = opts.logVia === undefined ? "error" : opts.logVia;
  const logCall = logMethod
    ? `console.${logMethod}(${JSON.stringify(`[${tag}] caught RangeError (likely infinite recursion):`)}, e.message);`
    : "/* logging suppressed */";

  return `try {\n${js}\n} catch (e) {\n  if (e instanceof RangeError) {\n    ${logCall}\n  } else {\n    throw e;\n  }\n}`;
}
