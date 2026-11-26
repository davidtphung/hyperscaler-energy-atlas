import fs from "node:fs";
import { COMMITMENTS } from "../src/data/commitments.ts";
import { ONTOLOGY } from "../src/data/computeOntology.ts";
import { TIMELINE } from "../src/data/computeTimeline.ts";
import { hypergridTie, robotsAllows, snapshotFromLatest, validateHistory, validateLatest } from "../src/lib/computeMarket.ts";
import { parseCoreweavePricing, parseLambdaGpuCloud, parseSfFromPrice } from "../src/lib/archivePrices.ts";
import { filterRange, marketRank, splitGaps, validateIndex, validateSeries } from "../src/lib/computeSeries.ts";

const errors: string[] = [];
function fail(message: string) {
  errors.push(message);
}

const files = [
  "src/lib/routes.ts",
  "src/lib/computeMarket.ts",
  "src/data/computeOntology.ts",
  "src/data/computeTimeline.ts",
  "src/components/ComputeMarketView.tsx",
  "src/components/ComputeMarketCharts.tsx",
  "src/lib/computeSeries.ts",
  "scripts/fetch-compute-market.ts",
  "scripts/backfill-compute-series.ts",
  "scripts/backfill-archive-prices.ts",
  "src/lib/archivePrices.ts",
  "scripts/check-compute-market.ts",
  "scripts/check-routes.ts",
  "scripts/emit-routes.ts",
  ".github/workflows/compute-market-data.yml",
];
for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  if (text.includes("\u2014") || text.includes("\u2013")) fail(`${file} has a long dash`);
}

const power = ONTOLOGY.find((layer) => layer.id === "power");
const nodeIds = new Set(power?.nodes?.map((node) => node.id));
for (const id of ["it-load", "generation", "btm", "grid-connection", "re-matching"]) {
  if (!nodeIds.has(id)) fail(`power node ${id} missing`);
}

for (const era of TIMELINE) {
  for (const event of era.events) {
    if (!event.iso && !event.dateLabel) continue;
    if (!event.sourceUrl || !event.sourceUrl.startsWith("https://") || !event.sourceName) {
      fail(`${event.id} is dated without a source`);
    }
  }
}

if (COMMITMENTS.length !== 167) fail(`row count ${COMMITMENTS.length}`);
const expect: Record<string, { rows: number; mw: number }> = {
  it_capacity: { rows: 19, mw: 7033.5 },
  btm_gen: { rows: 2, mw: 400 },
  offtake_new: { rows: 2, mw: 1073 },
  grid_gen_for_dc: { rows: 0, mw: 0 },
  offtake_existing: { rows: 1, mw: 500 },
};
const tie = hypergridTie(COMMITMENTS);
const summed = tie.reduce((sum, row) => sum + row.mw, 0);
if (summed === 7033.5 + 400 + 1073 + 500 && tie.some((row) => row.mw === summed)) {
  fail("a tie-in row holds the sum of the kinds");
}
for (const row of tie) {
  const want = expect[row.kind];
  if (!want || row.rows !== want.rows || row.mw !== want.mw) fail(`${row.kind} changed`);
}

const view = fs.readFileSync("src/components/ComputeMarketView.tsx", "utf8");
if (!view.includes("hypergridTie(COMMITMENTS)")) fail("tie-in does not read the full commitment list");
if (view.includes("reduce(")) fail("compute view reduces a list");
if (/\b(3\.96|5\.04|0\.066|0\.084)\b/.test(view)) fail("compute view hardcodes an SF price");
if (view.includes("7033")) fail("compute view hardcodes a firm total");
if (!view.includes("David T Phung")) fail("compute view is missing the byline");

if (!view.includes("latest.json")) fail("compute view does not read latest.json");
if (!view.includes('lazy(() => import("./ComputeMarketCharts"))')) fail("charts are not lazy loaded");
const charts = fs.readFileSync("src/components/ComputeMarketCharts.tsx", "utf8");
const seriesLib = fs.readFileSync("src/lib/computeSeries.ts", "utf8");
if (!charts.includes("Live now") || !charts.includes("Live begins") || !charts.includes("RANGE_IDS")) fail("chart controls are missing");
if (!view.includes("ComputeDashboard")) fail("dashboard is missing");
if (!view.includes("marketRank")) fail("market ranking is missing");
if (marketRank("H100 rental price below $2", "Compute") !== 0) fail("compute price rank is wrong");
if (marketRank("AI capex above $200B", "Markets") !== 1) fail("capex rank is wrong");
if (marketRank("Will it rain", "Weather") !== 4) fail("unrelated rank is wrong");
const lambdaRow = parseLambdaGpuCloud("<table><tr><td>On-demand 1x NVIDIA H100 SXM 80 GB $3.29 / GPU / hr</td></tr></table>");
if (lambdaRow.length !== 1 || lambdaRow[0].usdPerGpuHour !== 3.29) fail("lambda archive parser missed the printed GPU-hour price");
const gh200 = parseCoreweavePricing('<div class="kubernetes-gpu-pricing"><div role="listitem"><h3 class="table-model-name">NVIDIA GH200</h3><div>1</div><div>$6.50</div></div>');
if (gh200.length !== 0) fail("GH200 was parsed as one of the tracked chips");
const nodePrice = parseCoreweavePricing('<div class="kubernetes-gpu-pricing"><div role="listitem"><h3 class="table-model-name">NVIDIA HGX H100</h3><div>8</div><div>$49.24</div></div>');
if (nodePrice.length !== 1 || nodePrice[0].usdPerGpuHour !== 49.24 || nodePrice[0].unit !== "USD per node-hour (8 GPU)") {
  fail("CoreWeave parser split a node price into a per-GPU price");
}
const fromPrice = parseSfFromPrice("Buy H100s from $2.12/hr");
if (fromPrice.length !== 1 || fromPrice[0].usdPerGpuHour !== 2.12) fail("SF from-price parser failed");
if (!seriesLib.includes('"1W"') || !seriesLib.includes('"1M"') || !seriesLib.includes('"3M"') || !seriesLib.includes('"1Y"') || !seriesLib.includes('"Max"')) {
  fail("range buttons are missing");
}
if (charts.includes("reduce(")) fail("charts reduce a list");
if (/\/\s*1000\s*\*\s*mw|mw\s*=\s*.*\$/.test(charts)) fail("charts convert dollars and megawatts");
const hour = 60 * 60 * 1000;
if (splitGaps([{ t: 0, v: 1 }, { t: hour, v: 2 }]).length !== 1) fail("a one hour gap was broken");
if (splitGaps([{ t: 0, v: 1 }, { t: 10 * 24 * hour, v: 2 }]).length !== 2) fail("a long gap was connected");
if (filterRange([{ t: Date.now(), v: 1 }], "1W").length !== 1) fail("a fresh point fell out of 1W");

if (!robotsAllows("User-agent: *\nAllow: /\nDisallow: /dashboard\n", "/")) fail("robots parser blocked /");
if (robotsAllows("User-agent: *\nAllow: /\nDisallow: /dashboard\n", "/dashboard")) fail("robots parser allowed a blocked path");

const workflow = fs.readFileSync(".github/workflows/compute-market-data.yml", "utf8");
if (!workflow.includes("17 * * * *") || !workflow.includes("workflow_dispatch")) fail("data workflow schedule is missing");
if (!workflow.includes("DEPLOY_ON_DATA") || !workflow.includes("default: false")) fail("data deploy is not off by default");
if (/api[_-]?key\s*[:=]\s*["'][^"']+["']/i.test(workflow)) fail("data workflow contains a key");

let latest;
try {
  latest = validateLatest(JSON.parse(fs.readFileSync("public/data/compute-market/latest.json", "utf8")));
} catch (error) {
  fail(error instanceof Error ? error.message : "latest.json missing");
}
if (latest) {
  const day = latest.fetched_at.slice(0, 10);
  try {
    validateHistory(JSON.parse(fs.readFileSync(`public/data/compute-market/history/${day}.json`, "utf8")));
  } catch (error) {
    fail(error instanceof Error ? error.message : "history file missing");
  }
  const snapshot = snapshotFromLatest(latest);
  if (snapshot.polymarket.status === "ok" && snapshot.polymarket.markets.length === 0) fail("polymarket snapshot is empty");
  if (snapshot.vast.status === "ok" && !snapshot.vast.rows.some((row) => row.usdPerHour != null)) fail("vast snapshot has no price");
  if (snapshot.sfcompute.status === "ok") {
    const h100 = snapshot.sfcompute.table.find((row) => row.item === "h100-1");
    if (!h100) fail("sf table is missing h100-1");
    const change = snapshot.sfcompute.changelog?.statement.match(/to \$([0-9.]+) per GPU-hour/);
    if (h100 && change && snapshot.sfcompute.conflict !== (h100.usdPerHour !== Number(change[1]))) {
      fail("sf conflict flag does not match the two pages");
    }
  }
  if (snapshot.dropped.length < 2) fail("dropped sources were not recorded");
  if (!latest.sources.some((item) => item.mode === "api") || !latest.sources.some((item) => item.mode === "scrape")) {
    fail("latest.json does not name an api source and a scraped source");
  }
}

try {
  const index = validateIndex(JSON.parse(fs.readFileSync("public/data/compute-market/series/index.json", "utf8")));
  let clob = 0;
  let snapshot = 0;
  let changelog = 0;
  let archived = 0;
  for (const entry of index.series) {
    const series = validateSeries(JSON.parse(fs.readFileSync(`public/data/compute-market/series/${entry.file}`, "utf8")));
    if (series.points.length !== entry.points || series.points[0].t !== entry.start) fail(`${entry.id} index does not match the file`);
    if (series.history === "clob") clob += 1;
    if (series.history === "snapshot") snapshot += 1;
    if (series.history === "changelog") changelog += 1;
    if (series.history === "archive" || series.history === "joined" || series.history === "dataset") archived += 1;
  }
  if (clob < 1) fail("no Polymarket CLOB series");
  if (snapshot < 1) fail("no snapshot series");
  if (changelog < 1) fail("changelog series is missing");
  if (archived < 1) fail("no archived price series");
} catch (error) {
  fail(error instanceof Error ? error.message : "series index missing");
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log("compute market ok");
