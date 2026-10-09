# Reproducing the empirical study

Three scripts. Run them in order.

## 0. Prerequisites

```bash
# from the repo root
npm install
npm run build
```

All providers are routed through the Vercel AI SDK. Enable whichever
combination you want by setting the corresponding env vars.

### Ollama Cloud (recommended for cross-model studies)

```bash
export OLLAMA_CLOUD_API_KEY=…
export OLLAMA_CLOUD_MODELS="qwen2.5-coder:14b,llama3.3:70b,deepseek-coder-v2:16b"
# export OLLAMA_CLOUD_BASE_URL="https://ollama.com/v1"   # optional; this is the default
```

One API key, many models in one run. Each model in `OLLAMA_CLOUD_MODELS`
becomes its own row in the results (recorded as
`ollama-cloud/<model-name>`).

### Local Ollama

```bash
export OLLAMA_LOCAL_MODELS="qwen2.5-coder:14b,llama3.3"
# export OLLAMA_LOCAL_BASE_URL="http://localhost:11434/v1"  # optional default
```

Free; slow on consumer hardware. Recorded as `ollama-local/<model-name>`.

### Hosted providers (OpenAI / Anthropic / Google)

```bash
export OPENAI_API_KEY=…                    # gpt-4o-2024-08-06
export ANTHROPIC_API_KEY=…                 # claude-sonnet-4-6
export GOOGLE_GENERATIVE_AI_API_KEY=…      # gemini-2.5-flash
```

Any combination of the five providers above can be enabled together;
unsetting a variable simply removes that provider from the run.

## 1. Collect

```bash
npm run experiments:collect
```

Reads `prompts.jsonl` (100 prompts by default) and asks each enabled
model to generate one HTML page per prompt. Writes:

```
experiments/results/raw/<model>/<prompt-id>.html
experiments/results/raw/index.jsonl
```

Cost: ~$30–80 in API spend on the default 100-prompt × 3-model corpus.

## 2. Score

```bash
npm run experiments:score
```

Reads every `.html` from step 1 and runs `domguard`'s `analyze()`. Writes:

```
experiments/results/scores.jsonl
```

One line per (model, prompt, page) with the full issue list.

## 3. Analyze

```bash
npm run experiments:analyze
```

Reads `scores.jsonl`, computes per-detector hit rates and severity-weighted
aggregates, writes:

```
paper/figures/hit-rates.json
paper/figures/reduction-table.tex
```

The LaTeX paper picks up these artifacts from `paper.tex`.

## Notes

- The corpus (`prompts.jsonl`) is committed to keep the experiment
  identical across machines. The raw model outputs are *not* committed
  (large; reproducible).
- Each script is deterministic given the input. Models themselves vary
  run-to-run; for tightest comparisons, pin model snapshots
  (e.g., `gpt-4o-2024-08-06`).
- Browser-hang verification (Playwright headless load) is optional and
  off by default — it requires a sandboxed environment. Enable with
  `--verify-hangs` on `experiments:score`.
