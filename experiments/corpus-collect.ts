/**
 * Step 1 of the empirical study: collect LLM-generated landing pages
 * (the "static" and "interactive" single-file tiers of the complexity gradient).
 *
 * Reads a prompts file (default prompts.jsonl; override with PROMPTS_FILE),
 * asks every enabled model for one HTML page per prompt, and writes:
 *
 *   results/raw/<model>/<prompt-id>.html
 *   results/raw/index.jsonl    one line per generation
 *
 * Models are built from providers.ts (five provider classes, each env-gated).
 * Setting only OLLAMA_LOCAL_MODELS runs the study with zero API spend; setting
 * OLLAMA_CLOUD_* runs it on Ollama Cloud across the listed model strings.
 *
 * Tiers:
 *   PROMPTS_FILE=prompts.jsonl              -> static landing pages (baseline)
 *   PROMPTS_FILE=prompts-interactive.jsonl  -> interactive, hang-prone features
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { buildEnabledModels, enabledModelsHelp } from "./providers.js";

const here = dirname(fileURLToPath(import.meta.url));
const RESULTS_DIR = resolve(here, "results", "raw");
const INDEX_PATH = resolve(RESULTS_DIR, "index.jsonl");

const SYSTEM_PROMPT = `You are an expert frontend engineer. Output a complete, standalone HTML document for the requested landing page. Include all CSS and JavaScript inline. Use Tailwind via CDN (<script src="https://cdn.tailwindcss.com"></script>) for styling. The page must be responsive and functional. Output ONLY the HTML, no markdown fences, no commentary.`;

interface Prompt { id: string; brief: string }
interface Generation { model: string; promptId: string; bytes: number; ms: number; ok: boolean; error?: string }

function loadPrompts(): Prompt[] {
  // Default to the static landing-page corpus; override with PROMPTS_FILE to
  // run another tier (e.g. PROMPTS_FILE=prompts-interactive.jsonl).
  const file = process.env.PROMPTS_FILE ?? "prompts.jsonl";
  const path = resolve(here, file);
  return readFileSync(path, "utf-8")
    .split("\n")
    .filter((l) => l.trim().length > 0)
    .map((l) => JSON.parse(l) as Prompt);
}

function stripFences(out: string): string {
  // Models occasionally add ```html ... ``` despite instructions.
  const fence = out.match(/```(?:html)?\s*([\s\S]*?)```/);
  return fence?.[1]?.trim() ?? out.trim();
}

function sanitize(s: string): string {
  return s.replace(/[^A-Za-z0-9._-]/g, "_");
}

async function main() {
  const prompts = loadPrompts();
  const enabled = buildEnabledModels();
  if (enabled.length === 0) {
    console.error(enabledModelsHelp());
    process.exit(2);
  }

  console.log(`Collecting ${prompts.length} prompts x ${enabled.length} models = ${prompts.length * enabled.length} generations`);
  console.log(`Models: ${enabled.map((m) => m.key).join(", ")}`);
  mkdirSync(RESULTS_DIR, { recursive: true });

  const index: Generation[] = [];

  for (const model of enabled) {
    const modelDir = resolve(RESULTS_DIR, sanitize(model.key));
    mkdirSync(modelDir, { recursive: true });

    for (const p of prompts) {
      const outPath = resolve(modelDir, `${p.id}.html`);
      if (existsSync(outPath)) {
        console.log(`  [skip] ${model.key} / ${p.id} (already exists)`);
        continue;
      }
      const t0 = Date.now();
      try {
        const raw = await model.generate(SYSTEM_PROMPT, p.brief);
        const html = stripFences(raw);
        writeFileSync(outPath, html, "utf-8");
        const gen: Generation = { model: model.key, promptId: p.id, bytes: html.length, ms: Date.now() - t0, ok: true };
        index.push(gen);
        console.log(`  [ok]   ${model.key} / ${p.id}  ${html.length}B  ${gen.ms}ms`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        index.push({ model: model.key, promptId: p.id, bytes: 0, ms: Date.now() - t0, ok: false, error: message });
        console.error(`  [err]  ${model.key} / ${p.id}  ${message.slice(0, 160)}`);
      }
    }
  }

  writeFileSync(INDEX_PATH, index.map((g) => JSON.stringify(g)).join("\n") + "\n", "utf-8");
  console.log(`\nWrote ${index.length} index entries to ${INDEX_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
