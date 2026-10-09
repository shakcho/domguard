# Changelog

## [Unreleased]

### Added
- Initial release.
- Seven detectors for browser-hang patterns in LLM-generated JS:
  `scroll-loop`, `click-loop`, `infinite-loop`, `recursive-fn`,
  `mutation-observer-feedback`, `event-dispatch-loop`, `setinterval-leak`.
- `analyze()` public API: accepts HTML or raw JS, returns structured report.
- `wrapWithRuntimeGuard()`: try/catch wrapper that recovers from `RangeError`.
- Reproducible corpus-collection harness under `experiments/`.
