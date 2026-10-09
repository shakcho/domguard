/**
 * Stable identifier for each detector. Adding a new detector is a minor
 * version bump; renaming is a breaking change.
 */
export type DetectorId =
  | "scroll-loop"
  | "click-loop"
  | "infinite-loop"
  | "recursive-fn"
  | "mutation-observer-feedback"
  | "event-dispatch-loop"
  | "setinterval-leak";

/** Severity influences whether downstream callers should auto-reject. */
export type Severity = "high" | "medium";

/** One pattern hit from one detector. A detector may emit multiple issues. */
export interface Issue {
  detector: DetectorId;
  severity: Severity;
  message: string;
  /** A short snippet around the match site. Truncated to ~200 chars. */
  evidence?: string;
}

/** Aggregate report returned by `analyze()`. */
export interface Report {
  /** True iff every detector returned zero issues. */
  safe: boolean;
  issues: Issue[];
  /** Wall-clock duration of the scan, milliseconds. */
  durationMs: number;
}

/**
 * A detector is a pure function that, given the JS source, returns zero or
 * more issues. Detectors must not throw — failures are reported as issues
 * (or simply absence of issues).
 */
export type Detector = (js: string) => Issue[];
