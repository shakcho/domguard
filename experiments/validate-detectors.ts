/**
 * Sanity check for the corpus design: for every detector, a canonical "naive
 * implementation" snippet — the kind of code the interactive/multi-file prompts
 * are meant to elicit — and an assertion that domguard.analyze() flags it.
 *
 * This proves the prompt -> detector mapping is detectable (not just plausible).
 * Exits non-zero if any expected detector fails to fire.
 *
 *   npm run experiments:validate
 */
import { analyze } from "../src/index.js";
import { ALL_DETECTORS } from "../src/index.js";

interface Case { detector: string; label: string; code: string }

const wrap = (js: string) => `<!doctype html><html><body><script>${js}</script></body></html>`;

const CASES: Case[] = [
  {
    detector: "scroll-loop",
    label: "infinite-scroll handler that scrolls",
    code: `window.addEventListener('scroll', () => {
      loadMore();
      window.scrollTo(0, document.body.scrollHeight);
    });`,
  },
  {
    detector: "click-loop",
    // The detector fires on >= 2 programmatic .click() calls inside a click
    // listener (a single .click() is legitimate), so the canonical bad case
    // is a handler that re-clicks two elements that loop back on each other.
    label: "click handler with two .click() calls",
    code: `const a = document.querySelector('#a');
    const b = document.querySelector('#b');
    a.addEventListener('click', () => { b.click(); a.click(); });`,
  },
  {
    detector: "infinite-loop",
    label: "while(true) with no break",
    code: `function render() { while (true) { paint(); } }`,
  },
  {
    detector: "recursive-fn",
    label: "self-recursion with no base case",
    code: `function renderTree(node) { return renderTree(node.child); }`,
  },
  {
    detector: "mutation-observer-feedback",
    label: "observer callback mutates observed DOM",
    code: `const obs = new MutationObserver(() => {
      document.body.appendChild(document.createElement('div'));
    });
    obs.observe(document.body, { childList: true, subtree: true });`,
  },
  {
    detector: "event-dispatch-loop",
    label: "change handler dispatches change",
    code: `const el = document.querySelector('#f');
    el.addEventListener('change', () => {
      el.dispatchEvent(new Event('change'));
    });`,
  },
  {
    detector: "setinterval-leak",
    label: "setInterval poll with no clearInterval",
    code: `function startPolling() {
      setInterval(() => { fetch('/api/metrics'); }, 1000);
    }
    startPolling();`,
  },
];

function main() {
  console.log("Validating detector triggers (one canonical bad snippet each):\n");
  let failures = 0;
  const covered = new Set<string>();

  for (const c of CASES) {
    const report = analyze(wrap(c.code));
    const fired = report.issues.map((i) => i.detector);
    const hit = fired.includes(c.detector as never);
    covered.add(c.detector);
    const mark = hit ? "PASS" : "FAIL";
    if (!hit) failures += 1;
    console.log(`  [${mark}] ${c.detector.padEnd(28)} ${c.label}`);
    if (!hit) {
      console.log(`         expected '${c.detector}', got: [${fired.join(", ") || "none"}]`);
    }
  }

  const uncovered = ALL_DETECTORS.filter((d) => !covered.has(d));
  if (uncovered.length > 0) {
    console.log(`\n  note: detectors with no validation case: ${uncovered.join(", ")}`);
  }

  console.log(`\n${CASES.length - failures}/${CASES.length} detectors fired as expected.`);
  if (failures > 0) {
    console.error("Some detectors did not fire — the canonical snippet or the prompt mapping needs review.");
    process.exit(1);
  }
}

main();
