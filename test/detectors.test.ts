import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { analyze, ALL_DETECTORS, detectors, wrapWithRuntimeGuard, extractInlineJs } from "../src/index.js";
import type { DetectorId } from "../src/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const fixture = (rel: string) => readFileSync(resolve(here, "fixtures", rel), "utf-8");

interface Case {
  detector: DetectorId;
  unsafeFile: string;
  safeFile: string;
}

const CASES: Case[] = [
  { detector: "scroll-loop",                unsafeFile: "unsafe/scroll-loop.js",                safeFile: "safe/scroll-listener-passive.js" },
  { detector: "click-loop",                 unsafeFile: "unsafe/click-loop.js",                 safeFile: "safe/click-single-delegate.js" },
  { detector: "infinite-loop",              unsafeFile: "unsafe/infinite-loop.js",              safeFile: "safe/while-with-break.js" },
  { detector: "recursive-fn",               unsafeFile: "unsafe/recursive-fn.js",               safeFile: "safe/recursive-with-base-case.js" },
  { detector: "mutation-observer-feedback", unsafeFile: "unsafe/mutation-observer-feedback.js", safeFile: "safe/mutation-observer-readonly.js" },
  { detector: "event-dispatch-loop",        unsafeFile: "unsafe/event-dispatch-loop.js",        safeFile: "safe/event-dispatch-different-type.js" },
  { detector: "setinterval-leak",           unsafeFile: "unsafe/setinterval-leak.js",           safeFile: "safe/setinterval-with-cleanup.js" },
];

describe("each detector flags its unsafe fixture and not its safe fixture", () => {
  for (const c of CASES) {
    it(`${c.detector}: positive`, () => {
      const js = fixture(c.unsafeFile);
      const hits = detectors[c.detector](js);
      expect(hits.length, `expected at least one ${c.detector} hit`).toBeGreaterThanOrEqual(1);
      expect(hits[0]!.detector).toBe(c.detector);
    });
    it(`${c.detector}: negative`, () => {
      const js = fixture(c.safeFile);
      const hits = detectors[c.detector](js);
      expect(hits, `expected no ${c.detector} hits in the safe fixture`).toEqual([]);
    });
  }
});

describe("analyze() — end to end on raw JS", () => {
  it("returns safe=true for every safe fixture (per-detector)", () => {
    for (const c of CASES) {
      const report = analyze(fixture(c.safeFile));
      const sameDetector = report.issues.filter((i) => i.detector === c.detector);
      expect(sameDetector, `safe fixture for ${c.detector} produced a ${c.detector} hit`).toEqual([]);
    }
  });
  it("returns safe=false for every unsafe fixture, with a hit from the matching detector", () => {
    for (const c of CASES) {
      const report = analyze(fixture(c.unsafeFile));
      expect(report.safe, `unsafe fixture for ${c.detector} was reported safe`).toBe(false);
      const ids = report.issues.map((i) => i.detector);
      expect(ids).toContain(c.detector);
    }
  });
});

describe("analyze() — HTML input", () => {
  it("extracts inline <script> blocks and flags multiple unsafe patterns at once", () => {
    const report = analyze(fixture("unsafe/full-page-multiple-issues.html"));
    expect(report.safe).toBe(false);
    const ids = new Set(report.issues.map((i) => i.detector));
    expect(ids.has("scroll-loop")).toBe(true);
    expect(ids.has("setinterval-leak")).toBe(true);
    expect(ids.has("recursive-fn")).toBe(true);
  });
  it("passes clean HTML through without flagging", () => {
    const report = analyze(fixture("safe/full-page-clean.html"));
    expect(report.safe, JSON.stringify(report.issues)).toBe(true);
  });
});

describe("registry invariants", () => {
  it("ALL_DETECTORS lists exactly the registered keys", () => {
    expect(new Set(ALL_DETECTORS)).toEqual(new Set(Object.keys(detectors)));
    expect(ALL_DETECTORS.length).toBe(7);
  });
  it("every detector returns issues whose detector id matches the registry key", () => {
    for (const [id, detector] of Object.entries(detectors)) {
      // Run on a payload that may or may not trigger; checking shape only.
      const issues = detector("/* empty */");
      for (const issue of issues) {
        expect(issue.detector).toBe(id);
      }
    }
  });
  it("a detector exception does not crash analyze()", () => {
    // Bug-by-design: a 100KB payload of one character should not throw.
    // Regression test for any future detector that builds a quadratic
    // regex by accident.
    const giant = "(".repeat(100_000);
    expect(() => analyze(giant)).not.toThrow();
  });
});

describe("extractInlineJs", () => {
  it("returns input verbatim for plain JS strings", () => {
    const src = "function foo() { return 1; }";
    expect(extractInlineJs(src)).toBe(src);
  });
  it("extracts inline event-handler attributes", () => {
    const html = '<button onclick="window.scrollTo(0,0)">x</button>';
    const out = extractInlineJs(html);
    expect(out).toContain("scrollTo");
  });
  it("ignores external src= scripts", () => {
    const html = '<script src="https://cdn.example.com/lib.js"></script><p>x</p>';
    expect(extractInlineJs(html).trim()).toBe("");
  });
});

describe("wrapWithRuntimeGuard", () => {
  it("wraps in try/catch and references RangeError", () => {
    const wrapped = wrapWithRuntimeGuard("recurse();");
    expect(wrapped).toContain("try {");
    expect(wrapped).toContain("RangeError");
    expect(wrapped).toContain("recurse();");
  });
  it("respects the logVia=null suppression", () => {
    const wrapped = wrapWithRuntimeGuard("x();", { logVia: null });
    expect(wrapped).not.toContain("console.");
  });
  it("uses the supplied tag in the log message", () => {
    const wrapped = wrapWithRuntimeGuard("x();", { tag: "PageGen" });
    expect(wrapped).toContain("PageGen");
  });
});
