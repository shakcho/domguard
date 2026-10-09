/**
 * Step 1 (tier 3): collect feature edits made against an EXISTING multi-file app.
 *
 * This is the "multi-file" tier of the complexity gradient. Each model is shown
 * the seed app (experiments/seed-app/*) and asked to implement one feature
 * as a single ES module `feature.js` that wires into the existing store/theme/api.
 *
 * The generated feature is then concatenated with the seed modules into a single
 * standalone HTML document so domguard's analyze() scans the WHOLE browser-JS
 * surface — the place where cross-file hang bugs (an observer in one file, a
 * setter in another) actually live. Output mirrors the single-file collector:
 *
 *   results/raw/<model>/<task-id>.html
 *   results/raw/index-seeded.jsonl
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { buildEnabledModels, enabledModelsHelp } from "./providers.js";

const here = dirname(fileURLToPath(import.meta.url));
const RESULTS_DIR = resolve(here, "results", "raw");
const INDEX_PATH = resolve(RESULTS_DIR, "index-seeded.jsonl");
const SEED_DIR = resolve(here, "seed-app");
const SEED_FILES = ["theme.js", "store.js", "components.js", "api.js", "index.html"];

const SYSTEM_PROMPT = `You are an expert frontend engineer working inside an EXISTING vanilla-JS application. You will be shown the project's files, then asked to implement one new feature. Implement it as a single ES module named feature.js that imports from the existing modules (./store.js, ./theme.js, ./api.js as needed) and follows the existing patterns (the observable store, the theme system, the mock api). Output ONLY the JavaScript source of feature.js — no markdown fences, no commentary, no surrounding HTML.`;

interface Task { id: string; brief: string; target?: string[] }
interface Generation { model: string; promptId: string; bytes: number; ms: number; ok: boolean; error?: string }

function loadTasks(): Task[] {
  const file = process.env.SEEDED_TASKS_FILE ?? "seeded-tasks.jsonl";
  return readFileSync(resolve(here, file), "utf-8")
    .split("\n")
    .filter((l) => l.trim().length > 0)
    .map((l) => JSON.parse(l) as Task);
}

function loadSeed(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of SEED_FILES) out[f] = readFileSync(resolve(SEED_DIR, f), "utf-8");
  return out;
}

function seedContext(seed: Record<string, string>): string {
  return SEED_FILES.map((f) => `=== ${f} ===\n${seed[f]}`).join("\n\n");
}

function stripFences(out: string): string {
  const fence = out.match(/```(?:[a-zA-Z]+)?\s*([\s\S]*?)```/);
  return fence?.[1]?.trim() ?? out.trim();
}

// Flatten an ES module into plain script body: drop import lines and the
// `export ` keyword so the concatenated bundle is analyzable as one script.
function flatten(src: string): string {
  return src
    .replace(/^\s*import[^\n]*\n/gm, "")
    .replace(/^\s*export\s+(default\s+)?/gm, "")
    .replace(/^\s*export\s*\{[^}]*\}[^\n]*\n/gm, "");
}

// Build a single standalone HTML doc: the seed page body + a combined script of
// every seed module plus the generated feature. This is what gets analyzed.
function assemble(seed: Record<string, string>, feature: string): string {
  const body = seed["index.html"]
    .replace(/<script[\s\S]*?<\/script>/gi, "") // drop the seed's module bootstrap
    .replace(/<\/body>/i, "");
  const bundle = ["theme.js", "store.js", "components.js", "api.js"]
    .map((f) => `/* ${f} */\n${flatten(seed[f])}`)
    .join("\n\n");
  return `${body}
  <script>
${bundle}

/* feature.js (generated) */
${flatten(feature)}

/* bootstrap */
try {
  applyTheme(store.state.settings.theme);
  mountHeader(document.getElementById("header"));
  mountSettings(document.getElementById("settings"));
  mountList(document.getElementById("list"));
  if (typeof mountFeature === "function") {
    mountFeature(document.getElementById("feature-aside"), document.getElementById("feature-main"));
  }
} catch (e) { /* analysis target is the source, not runtime */ }
  </script>
</body></html>`;
}

function sanitize(s: string): string {
  return s.replace(/[^A-Za-z0-9._-]/g, "_");
}

async function main() {
  const tasks = loadTasks();
  const seed = loadSeed();
  const context = seedContext(seed);
  const enabled = buildEnabledModels();
  if (enabled.length === 0) {
    console.error(enabledModelsHelp());
    process.exit(2);
  }

  console.log(`Seeded collect: ${tasks.length} tasks x ${enabled.length} models = ${tasks.length * enabled.length} generations`);
  console.log(`Models: ${enabled.map((m) => m.key).join(", ")}`);
  mkdirSync(RESULTS_DIR, { recursive: true });

  const index: Generation[] = [];

  for (const model of enabled) {
    const modelDir = resolve(RESULTS_DIR, sanitize(model.key));
    mkdirSync(modelDir, { recursive: true });

    for (const t of tasks) {
      const outPath = resolve(modelDir, `${t.id}.html`);
      if (existsSync(outPath)) {
        console.log(`  [skip] ${model.key} / ${t.id} (already exists)`);
        continue;
      }
      const prompt = `Here is the existing project:\n\n${context}\n\n----\n\nFEATURE TO IMPLEMENT:\n${t.brief}`;
      const t0 = Date.now();
      try {
        const raw = await model.generate(SYSTEM_PROMPT, prompt);
        const feature = stripFences(raw);
        const html = assemble(seed, feature);
        writeFileSync(outPath, html, "utf-8");
        const gen: Generation = { model: model.key, promptId: t.id, bytes: html.length, ms: Date.now() - t0, ok: true };
        index.push(gen);
        console.log(`  [ok]   ${model.key} / ${t.id}  ${html.length}B  ${gen.ms}ms`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        index.push({ model: model.key, promptId: t.id, bytes: 0, ms: Date.now() - t0, ok: false, error: message });
        console.error(`  [err]  ${model.key} / ${t.id}  ${message.slice(0, 160)}`);
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
