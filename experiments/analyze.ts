/**
 * Step 3 — turn the JSONL scores into figure-ready summaries.
 *
 * Produces:
 *   paper/figures/hit-rates.json         per-(model,detector) hit rate
 *   paper/figures/reduction-table.tex    LaTeX table for the paper (per model)
 *   paper/figures/complexity-gradient.tex  per-(tier) and per-(tier,model) table
 *   stdout summary
 *
 * Tier is derived from the prompt-id prefix:
 *   p### -> static       (landing pages; the baseline/floor)
 *   i### -> interactive  (single-file interactive features)
 *   m### -> multifile    (edits against the seeded multi-file app)
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ALL_DETECTORS } from "../src/index.js";
import type { DetectorId } from "../src/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const SCORES_PATH = resolve(here, "results", "scores.jsonl");
const FIGURES_DIR = resolve(here, "..", "paper", "figures");
const HIT_RATES_PATH = resolve(FIGURES_DIR, "hit-rates.json");
const REDUCTION_TEX_PATH = resolve(FIGURES_DIR, "reduction-table.tex");
const GRADIENT_TEX_PATH = resolve(FIGURES_DIR, "complexity-gradient.tex");
const GRADIENT_CHART_PATH = resolve(FIGURES_DIR, "complexity-gradient-chart.tex");
const HIT_RATES_CHART_PATH = resolve(FIGURES_DIR, "hit-rates-chart.tex");

// Detector -> pattern id used in the paper taxonomy (Section 4). The order of
// ALL_DETECTORS is the canonical P1..P7 order.
const DETECTOR_PID: Record<DetectorId, string> = {
  "scroll-loop": "P1",
  "click-loop": "P2",
  "infinite-loop": "P3",
  "recursive-fn": "P4",
  "mutation-observer-feedback": "P5",
  "event-dispatch-loop": "P6",
  "setinterval-leak": "P7",
};

type Tier = "static" | "interactive" | "multifile";
const TIER_ORDER: Tier[] = ["static", "interactive", "multifile"];
const TIER_LABEL: Record<Tier, string> = {
  static: "Static (landing pages)",
  interactive: "Interactive (single-file)",
  multifile: "Multi-file (seeded edits)",
};

interface ScoreRow {
  model: string;
  promptId: string;
  bytes: number;
  durationMs: number;
  safe: boolean;
  issues: { detector: DetectorId; severity: "high" | "medium"; message: string }[];
}

function tierOf(promptId: string): Tier {
  if (promptId.startsWith("i")) return "interactive";
  if (promptId.startsWith("m")) return "multifile";
  return "static";
}

function loadScores(): ScoreRow[] {
  return readFileSync(SCORES_PATH, "utf-8")
    .split("\n")
    .filter((l) => l.trim().length > 0)
    .map((l) => JSON.parse(l) as ScoreRow);
}

function uniq<T>(xs: T[]): T[] { return Array.from(new Set(xs)); }
function pct(n: number, d: number): number { return d === 0 ? 0 : n / d; }

function main() {
  const rows = loadScores();
  if (rows.length === 0) {
    console.error("No scores found. Run experiments:collect and experiments:score first.");
    process.exit(2);
  }
  mkdirSync(FIGURES_DIR, { recursive: true });

  const models = uniq(rows.map((r) => r.model)).sort();
  const tiersPresent = TIER_ORDER.filter((t) => rows.some((r) => tierOf(r.promptId) === t));

  // ---- Per-(model, detector) hit rates (unchanged output) ----
  const hitRates: Record<string, Record<DetectorId, number>> = {};
  for (const model of models) {
    const modelRows = rows.filter((r) => r.model === model);
    const perDetector = {} as Record<DetectorId, number>;
    for (const d of ALL_DETECTORS) {
      const hits = modelRows.filter((r) => r.issues.some((i) => i.detector === d)).length;
      perDetector[d] = pct(hits, modelRows.length);
    }
    hitRates[model] = perDetector;
  }

  // ---- Per-model aggregate (reduction table, unchanged) ----
  const reductionRows = models.map((model) => {
    const mr = rows.filter((r) => r.model === model);
    return {
      model,
      n: mr.length,
      anyIssue: pct(mr.filter((r) => r.issues.length > 0).length, mr.length),
      highIssue: pct(mr.filter((r) => r.issues.some((i) => i.severity === "high")).length, mr.length),
      meanScanMs: mr.reduce((a, r) => a + r.durationMs, 0) / Math.max(1, mr.length),
    };
  });

  // ---- Complexity gradient: per-tier, and per-(tier, model) ----
  const tierAgg = tiersPresent.map((tier) => {
    const tr = rows.filter((r) => tierOf(r.promptId) === tier);
    return {
      tier,
      n: tr.length,
      anyIssue: pct(tr.filter((r) => r.issues.length > 0).length, tr.length),
      highIssue: pct(tr.filter((r) => r.issues.some((i) => i.severity === "high")).length, tr.length),
      meanIssues: tr.reduce((a, r) => a + r.issues.length, 0) / Math.max(1, tr.length),
    };
  });

  // ---- Pooled per-detector prevalence with 95% Wilson score interval ----
  const detectorStats = ALL_DETECTORS.map((d) => {
    const hits = rows.filter((r) => r.issues.some((i) => i.detector === d)).length;
    const p = pct(hits, rows.length);
    const [lo, hi] = wilson(hits, rows.length);
    return { detector: d, pid: DETECTOR_PID[d], hits, p, lo, hi };
  });

  writeFileSync(HIT_RATES_PATH, JSON.stringify({ models, detectors: ALL_DETECTORS, tiers: tiersPresent, hitRates }, null, 2), "utf-8");
  writeFileSync(REDUCTION_TEX_PATH, buildReductionTex(reductionRows), "utf-8");
  writeFileSync(GRADIENT_TEX_PATH, buildGradientTex(tierAgg, tiersPresent, models, rows), "utf-8");
  writeFileSync(GRADIENT_CHART_PATH, buildGradientChartTex(tierAgg), "utf-8");
  writeFileSync(HIT_RATES_CHART_PATH, buildHitRateChartTex(detectorStats, rows.length), "utf-8");

  // ---- stdout ----
  console.log("Complexity gradient (rows = tiers):");
  console.log("");
  console.log(["tier".padEnd(28), "N".padStart(5), "any issue".padStart(12), "high issue".padStart(12), "mean issues".padStart(13)].join(" "));
  console.log("-".repeat(74));
  for (const t of tierAgg) {
    console.log([
      TIER_LABEL[t.tier].padEnd(28),
      String(t.n).padStart(5),
      `${(t.anyIssue * 100).toFixed(1)}%`.padStart(12),
      `${(t.highIssue * 100).toFixed(1)}%`.padStart(12),
      t.meanIssues.toFixed(2).padStart(13),
    ].join(" "));
  }

  console.log("");
  console.log("Per-model summary (all tiers):");
  console.log("");
  console.log(["model".padEnd(28), "N".padStart(5), "any issue".padStart(12), "high issue".padStart(12), "scan ms".padStart(10)].join(" "));
  console.log("-".repeat(72));
  for (const r of reductionRows) {
    console.log([
      r.model.padEnd(28),
      String(r.n).padStart(5),
      `${(r.anyIssue * 100).toFixed(1)}%`.padStart(12),
      `${(r.highIssue * 100).toFixed(1)}%`.padStart(12),
      r.meanScanMs.toFixed(2).padStart(10),
    ].join(" "));
  }

  console.log("");
  console.log("Any-issue rate by tier x model:");
  console.log("");
  const gh = ["model".padEnd(28), ...tiersPresent.map((t) => t.padStart(13))].join(" ");
  console.log(gh);
  console.log("-".repeat(gh.length));
  for (const model of models) {
    const cells = tiersPresent.map((tier) => {
      const tr = rows.filter((r) => r.model === model && tierOf(r.promptId) === tier);
      return `${(pct(tr.filter((r) => r.issues.length > 0).length, tr.length) * 100).toFixed(1)}%`.padStart(13);
    });
    console.log([model.padEnd(28), ...cells].join(" "));
  }

  console.log("");
  console.log("Per-detector hit rates (rows = models, columns = detectors):");
  console.log("");
  const header = ["model".padEnd(28), ...ALL_DETECTORS.map((d) => d.padStart(12))].join(" ");
  console.log(header);
  console.log("-".repeat(header.length));
  for (const model of models) {
    const cells = ALL_DETECTORS.map((d) => `${(hitRates[model]![d] * 100).toFixed(1)}%`.padStart(12));
    console.log([model.padEnd(28), ...cells].join(" "));
  }

  console.log("");
  console.log(`Wrote ${HIT_RATES_PATH}`);
  console.log(`Wrote ${REDUCTION_TEX_PATH}`);
  console.log(`Wrote ${GRADIENT_TEX_PATH}`);
  console.log(`Wrote ${GRADIENT_CHART_PATH}`);
  console.log(`Wrote ${HIT_RATES_CHART_PATH}`);
}

function buildReductionTex(rows: Array<{ model: string; n: number; anyIssue: number; highIssue: number; meanScanMs: number }>): string {
  const body = rows.map((r) =>
    `${escapeTex(r.model)} & ${r.n} & ${(r.anyIssue * 100).toFixed(1)}\\% & ${(r.highIssue * 100).toFixed(1)}\\% & ${r.meanScanMs.toFixed(2)} \\\\`,
  ).join("\n");
  return `% Auto-generated by experiments/analyze.ts — do not edit by hand.
\\begin{tabular}{lrrrr}
\\toprule
Model & \\(N\\) & Any issue & High-severity & Scan latency (ms) \\\\
\\midrule
${body}
\\bottomrule
\\end{tabular}
`;
}

function buildGradientTex(
  tierAgg: Array<{ tier: Tier; n: number; anyIssue: number; highIssue: number; meanIssues: number }>,
  tiers: Tier[],
  models: string[],
  rows: ScoreRow[],
): string {
  const aggBody = tierAgg.map((t) =>
    `${TIER_LABEL[t.tier]} & ${t.n} & ${(t.anyIssue * 100).toFixed(1)}\\% & ${(t.highIssue * 100).toFixed(1)}\\% & ${t.meanIssues.toFixed(2)} \\\\`,
  ).join("\n");

  const colspec = "l" + "r".repeat(tiers.length);
  const head = ["Model", ...tiers.map((t) => TIER_LABEL[t].split(" ")[0])].join(" & ");
  const matrixBody = models.map((model) => {
    const cells = tiers.map((tier) => {
      const tr = rows.filter((r) => r.model === model && tierOf(r.promptId) === tier);
      const v = tr.length === 0 ? 0 : tr.filter((r) => r.issues.length > 0).length / tr.length;
      return `${(v * 100).toFixed(1)}\\%`;
    });
    return `${escapeTex(model)} & ${cells.join(" & ")} \\\\`;
  }).join("\n");

  return `% Auto-generated by experiments/analyze.ts — do not edit by hand.
% Complexity gradient: defect rate rises with interactivity and cross-file complexity.
\\begin{tabular}{lrrrr}
\\toprule
Tier & \\(N\\) & Any issue & High-severity & Mean issues/page \\\\
\\midrule
${aggBody}
\\bottomrule
\\end{tabular}

\\vspace{1em}

\\begin{tabular}{${colspec}}
\\toprule
${head} \\\\
\\midrule
${matrixBody}
\\bottomrule
\\end{tabular}
`;
}

/** 95% Wilson score interval for a binomial proportion (z = 1.96). */
function wilson(hits: number, n: number): [number, number] {
  if (n === 0) return [0, 0];
  const z = 1.959963984540054;
  const p = hits / n;
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const center = (p + z2 / (2 * n)) / denom;
  const half = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / denom;
  return [Math.max(0, center - half), Math.min(1, center + half)];
}

const num = (x: number): string => x.toFixed(3);

interface BarSeries { label: string; color: string; values: number[] }

/**
 * Emit a self-contained TikZ bar chart (no pgfplots dependency). Values are in
 * percent. With a single series, optional `errors` draw 95% CI whiskers. The
 * picture is wrapped in \resizebox so it always fits the column width.
 */
function tikzBars(opts: {
  categories: string[];
  series: BarSeries[];
  errors?: Array<{ lo: number; hi: number }>;
  ymax: number;
  ystep: number;
  yLabel: string;
  valueLabels?: boolean;
}): string {
  const { categories, series, errors, ymax, ystep, yLabel, valueLabels } = opts;
  const H = 4.0;
  const sy = H / ymax;
  const barW = 0.5;
  const interBar = 0.06;
  const groupGap = series.length > 1 ? 0.7 : 0.55;
  const nSer = series.length;
  const nCat = categories.length;
  const groupInner = nSer * barW + (nSer - 1) * interBar;
  const stride = groupInner + groupGap;
  const plotW = nCat * groupInner + (nCat - 1) * groupGap;

  const L: string[] = [];
  // Horizontal gridlines + y ticks + labels.
  for (let v = 0; v <= ymax + 1e-9; v += ystep) {
    const y = v * sy;
    L.push(`\\draw[gray!22, line width=0.3pt] (0,${num(y)}) -- (${num(plotW)},${num(y)});`);
    L.push(`\\draw[black] (-0.07,${num(y)}) -- (0,${num(y)});`);
    L.push(`\\node[anchor=east, font=\\scriptsize] at (-0.12,${num(y)}) {${v}\\%};`);
  }
  // Axes.
  L.push(`\\draw[black, line width=0.6pt] (0,0) -- (0,${num(H + 0.1)});`);
  L.push(`\\draw[black, line width=0.6pt] (0,0) -- (${num(plotW)},0);`);
  // y-axis label.
  L.push(`\\node[anchor=south, rotate=90, font=\\footnotesize] at (-0.78,${num(H / 2)}) {${yLabel}};`);

  // Bars.
  for (let c = 0; c < nCat; c++) {
    const groupLeft = c * stride;
    for (let s = 0; s < nSer; s++) {
      const x0 = groupLeft + s * (barW + interBar);
      const x1 = x0 + barW;
      const hVal = series[s]!.values[c]!;
      const h = hVal * sy;
      L.push(`\\fill[${series[s]!.color}] (${num(x0)},0) rectangle (${num(x1)},${num(h)});`);
      if (valueLabels) {
        L.push(`\\node[anchor=south, font=\\scriptsize] at (${num((x0 + x1) / 2)},${num(h + 0.03)}) {${hVal.toFixed(1)}};`);
      }
    }
    // Error whiskers (single-series charts only).
    if (errors && nSer === 1) {
      const xc = groupLeft + barW / 2;
      const lo = errors[c]!.lo * sy;
      const hi = errors[c]!.hi * sy;
      L.push(`\\draw[black, line width=0.5pt] (${num(xc)},${num(lo)}) -- (${num(xc)},${num(hi)});`);
      L.push(`\\draw[black, line width=0.5pt] (${num(xc - 0.1)},${num(hi)}) -- (${num(xc + 0.1)},${num(hi)});`);
      L.push(`\\draw[black, line width=0.5pt] (${num(xc - 0.1)},${num(lo)}) -- (${num(xc + 0.1)},${num(lo)});`);
    }
    // Category label.
    const xc = groupLeft + groupInner / 2;
    L.push(`\\node[anchor=north, font=\\scriptsize] at (${num(xc)},-0.1) {${categories[c]}};`);
  }

  // Legend above the plot for multi-series charts.
  if (nSer > 1) {
    let lx = 0.1;
    const ly = H + 0.45;
    for (const ser of series) {
      L.push(`\\fill[${ser.color}] (${num(lx)},${num(ly)}) rectangle (${num(lx + 0.3)},${num(ly + 0.22)});`);
      L.push(`\\node[anchor=west, font=\\scriptsize] at (${num(lx + 0.36)},${num(ly + 0.11)}) {${ser.label}};`);
      lx += 0.36 + 0.18 + 0.06 * ser.label.length + 0.4;
    }
  }

  return `% Auto-generated by experiments/analyze.ts — do not edit by hand.
\\resizebox{\\linewidth}{!}{%
\\begin{tikzpicture}
${L.join("\n")}
\\end{tikzpicture}%
}
`;
}

function buildGradientChartTex(
  tierAgg: Array<{ tier: Tier; n: number; anyIssue: number; highIssue: number; meanIssues: number }>,
): string {
  const categories = tierAgg.map((t) => {
    const short = TIER_LABEL[t.tier].split(" ")[0]!.replace("Multi-file", "Multi-file");
    return `${short} ($n{=}${t.n}$)`;
  });
  const series: BarSeries[] = [
    { label: "Any issue", color: "blue!60!black", values: tierAgg.map((t) => t.anyIssue * 100) },
    { label: "High-severity", color: "red!70!black", values: tierAgg.map((t) => t.highIssue * 100) },
  ];
  return tikzBars({ categories, series, ymax: 40, ystep: 10, yLabel: "Pages flagged (\\%)", valueLabels: true });
}

function buildHitRateChartTex(
  stats: Array<{ detector: DetectorId; pid: string; hits: number; p: number; lo: number; hi: number }>,
  _n: number,
): string {
  const maxHi = Math.max(...stats.map((s) => s.hi * 100), 1);
  const ymax = Math.max(5, Math.ceil(maxHi / 5) * 5);
  const categories = stats.map((s) => s.pid);
  const series: BarSeries[] = [
    { label: "prevalence", color: "teal!70!black", values: stats.map((s) => s.p * 100) },
  ];
  const errors = stats.map((s) => ({ lo: s.lo * 100, hi: s.hi * 100 }));
  return tikzBars({ categories, series, errors, ymax, ystep: 5, yLabel: "Pages flagged (\\%)" });
}

function escapeTex(s: string): string {
  return s.replace(/[_&%$#{}~^\\]/g, (c) => `\\${c}`);
}

main();
