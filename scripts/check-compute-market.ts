import fs from "node:fs";
import { COMMITMENTS } from "../src/data/commitments.ts";
import { ONTOLOGY } from "../src/data/computeOntology.ts";
import { TIMELINE } from "../src/data/computeTimeline.ts";
import { hypergridTie, robotsAllows, snapshotFromLatest, validateHistory, validateLatest } from "../src/lib/computeMarket.ts";

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
  "scripts/fetch-compute-market.ts",
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

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log("compute market ok");
