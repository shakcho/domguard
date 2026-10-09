# domguard

[![npm](https://img.shields.io/badge/npm-domguard-blue.svg)](https://www.npmjs.com/package/domguard)
[![license](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)

> Static + runtime safety checks for LLM-generated browser JavaScript.

LLMs increasingly generate complete web frontends from prompts or screenshots.
A subset of the JavaScript they produce executes without errors yet **hangs the
user's browser** — infinite scroll handlers that call `scrollTo`, recursive
functions without a base case, `MutationObserver` callbacks that mutate the
observed subtree, intervals that are never cleared.

`domguard` is a small library of detectors that flag these patterns before the
code reaches a user, plus a runtime guard that turns the most severe failures
into a recoverable error instead of a frozen tab.

It is the artifact accompanying the paper
**"Detecting Browser-Hang Patterns in LLM-Generated Web JavaScript"**
(see [`paper/`](./paper)).

## Why this exists

The standard QA loop for LLM codegen catches **syntax errors**, **type errors**,
and **lint violations**. None of these tools catches a `while(true)` with no
`break` or a scroll listener that re-triggers itself. The result is a class of
generated pages that pass automated review and break only in a real browser,
typically in front of a user.

The seven patterns covered here were collected from production LLM codegen
output across multiple model families. They are the patterns that, in practice,
account for the overwhelming majority of "the generated page froze my browser"
reports.

## Install

```bash
npm install domguard
```

## Usage

### Static check — flag risky patterns before deployment

```ts
import { analyze } from "domguard";

const html = await generateLandingPageWithLLM(prompt);
const report = analyze(html);

if (!report.safe) {
  for (const issue of report.issues) {
    console.warn(`[${issue.detector}] ${issue.message}`);
  }
  // Reject the generation, ask the model to retry, or have a human review.
}
```

`analyze` accepts either a full HTML document (it will extract `<script>`
blocks) or a raw JS string. It returns:

```ts
interface Report {
  safe: boolean;
  issues: Issue[];     // one entry per matched pattern
  durationMs: number;
}

interface Issue {
  detector: DetectorId;            // e.g. "scroll-loop"
  severity: "high" | "medium";
  message: string;                 // human-readable description
  evidence?: string;               // the snippet that matched
}
```

### Runtime guard — fail soft, not silent

Wrap any LLM-generated JS before injecting it into the page:

```ts
import { wrapWithRuntimeGuard } from "domguard/runtime";

const safeJs = wrapWithRuntimeGuard(generatedJs);
document.querySelector("#injected-script")!.textContent = safeJs;
```

The wrapper catches `RangeError` (stack overflow from runaway recursion) and
logs to the console instead of crashing the page. The rest of the page
continues to render.

### Per-detector usage

```ts
import { detectors } from "domguard";

const scrollLoopHits = detectors.scrollLoop(js);
//   [{ severity: "high", message: "...", evidence: "..." }, ...]
```

## The seven patterns

| id                       | what it catches                                                                                  | severity |
|--------------------------|--------------------------------------------------------------------------------------------------|----------|
| `scroll-loop`            | A scroll event listener that calls `scrollTo` / `scrollIntoView` / `scrollBy`.                   | high     |
| `click-loop`             | Multiple programmatic `.click()` calls inside a click handler.                                   | high     |
| `infinite-loop`          | `while(true)` or `for(;;)` without `break` or `return` in scope.                                 | high     |
| `recursive-fn`           | A named function whose body calls itself, with no obvious base case.                             | medium   |
| `mutation-observer-feedback` | `MutationObserver` whose callback mutates DOM via `innerHTML`, `appendChild`, etc.            | high     |
| `event-dispatch-loop`    | An `addEventListener('X', …)` whose handler `dispatchEvent`s the same event type.                | high     |
| `setinterval-leak`       | `setInterval` used without a paired `clearInterval` reference.                                   | medium   |

Each detector lives in its own file under [`src/detectors/`](./src/detectors)
with its own justification and false-positive notes.

## Design choices

- **Regex + light parsing, not full AST.** The library is ~150 LOC, runs in
  under 5 ms on typical generated pages, and is easy to ship in front of a
  hot-path LLM endpoint. Full AST analysis catches a few more edge cases
  but is overkill for the patterns we target.
- **Conservative defaults.** False positives are cheap (you re-prompt the
  model). False negatives are expensive (the user's browser hangs). The
  detectors err toward over-flagging.
- **Composable.** Each detector is a pure function; you can pick the subset
  you care about or extend the set with project-specific rules.

## Experiement
[`experiments/`](./experiments) for the corpus-collection and
scoring harness.

## License

MIT © [Sakti Kumar Chourasia](https://github.com/saktikumar)

