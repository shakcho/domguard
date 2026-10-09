/**
 * Step 2 — run domguard's `analyze()` over every collected page and write
 * one JSONL line per (model, prompt) with the resulting issue list.
 *
 * Output: results/scores.jsonl
 *
 *   { model, promptId, bytes, durationMs, safe, issues: [...] }
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { analyze } from "../src/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const RAW_DIR = resolve(here, "results", "raw");
const SCORES_PATH = resolve(here, "results", "scores.jsonl");

interface ScoreRow {
  model: string;
  promptId: string;
  bytes: number;
  durationMs: number;
  safe: boolean;
  issues: { detector: string; severity: string; message: string }[];
}

function listModels(): string[] {
  return readdirSync(RAW_DIR).filter((entry) => {
    const p = resolve(RAW_DIR, entry);
    return statSync(p).isDirectory();
  });
}

function listPages(modelDir: string): string[] {
  return readdirSync(modelDir).filter((f) => f.endsWith(".html"));
}

function main() {
  const rows: ScoreRow[] = [];
  for (const model of listModels()) {
    const modelDir = resolve(RAW_DIR, model);
    for (const file of listPages(modelDir)) {
      const promptId = file.replace(/\.html$/, "");
      const html = readFileSync(resolve(modelDir, file), "utf-8");
      const report = analyze(html);
      rows.push({
        model,
        promptId,
        bytes: html.length,
        durationMs: report.durationMs,
        safe: report.safe,
        issues: report.issues.map((i) => ({
          detector: i.detector,
          severity: i.severity,
          message: i.message,
        })),
      });
    }
  }
  writeFileSync(SCORES_PATH, rows.map((r) => JSON.stringify(r)).join("\n") + "\n", "utf-8");
  console.log(`Scored ${rows.length} pages. Wrote ${SCORES_PATH}.`);
}

main();
