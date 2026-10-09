# Contributing to domguard

Thanks for the interest. The scope of this library is intentionally small:
**detectors for patterns in LLM-generated JS that cause browsers to hang.**
PRs that broaden the scope will probably be declined; PRs that sharpen the
existing patterns or add a new one with a clear browser-hang failure mode
are very welcome.

## Adding a detector

A new detector should clear all of these bars:

1. **Real-world failure.** Point to at least one example of an LLM (any model)
   producing this pattern in generated code. A reproducible snippet in the PR
   description is enough.
2. **Browser impact.** The pattern must cause the page to hang, freeze, or
   consume unbounded resources at run-time, not merely be ugly or slow.
3. **Detectable.** A regex or short AST query should be enough. If you need a
   full data-flow analysis, the pattern is probably out of scope.
4. **Tested.** Add a positive fixture (the pattern triggers) and a negative
   fixture (a similar-looking but safe construct does not trigger) under
   `test/fixtures/`.

## Layout

```
src/
  detectors/   one file per pattern, exporting a pure function
  index.ts     public API surface
  runtime-guard.ts
  types.ts
test/
  fixtures/    safe/  + unsafe/  examples (one .js file per fixture)
experiments/   reproducible study scripts
paper/
  paper.md     human-readable draft
```

## Style

- TypeScript, strict mode. No `any` without an `// eslint-disable` and a reason.
- Public functions need JSDoc with a one-line summary.
- No runtime dependencies in `src/`. The library should ship with zero deps.
- Lines under ~100 chars.

## Local development

```bash
npm install
npm run build
npm test
```

## Releasing

Maintainers only. Tagged releases follow semver. Patch detector tweaks are
patch bumps; new detectors are minor bumps; API shape changes are major.
