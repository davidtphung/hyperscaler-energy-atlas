import fs from "node:fs";
import { COMMITMENTS } from "../src/data/commitments.ts";
import { ask } from "../src/lib/ask.ts";
import { firmKindTotals } from "../src/lib/select.ts";
import { rankRows } from "../src/lib/search.ts";
import { SOURCES, rankCatalog } from "../src/lib/signalSearch.ts";
import { DC_SA, GEN_SA, SIGNALS, claimChecks, latestPoint, seriesById } from "../src/lib/signals.ts";

const errors: string[] = [];
function fail(msg: string) {
  errors.push(msg);
}

if (COMMITMENTS.length !== 154) fail(`row count ${COMMITMENTS.length}`);
const totals = Object.fromEntries(firmKindTotals(COMMITMENTS).map((row) => [row.kind, row]));
const expect: Record<string, { rows: number; mw: number }> = {
  it_capacity: { rows: 20, mw: 8085.5 },
  btm_gen: { rows: 2, mw: 400 },
  offtake_new: { rows: 3, mw: 1188 },
  grid_gen_for_dc: { rows: 0, mw: 0 },
  offtake_existing: { rows: 0, mw: 0 },
};
for (const [kind, want] of Object.entries(expect)) {
  const got = totals[kind];
  if (!got || got.rows !== want.rows || got.mw !== want.mw) {
    fail(`${kind} is ${got?.mw} MW over ${got?.rows}`);
  }
}

const dc = latestPoint(seriesById(DC_SA));
const general = latestPoint(seriesById(GEN_SA));
if (dc.month !== "2026-08" || dc.value !== 84950) fail(`data center latest ${dc.month} ${dc.value}`);
if (general.month !== "2026-08" || general.value !== 45809) fail(`general office latest ${general.month} ${general.value}`);
if (SIGNALS.series.some((series) => JSON.stringify(series).includes("capacityMW"))) fail("a series stores capacityMW");

const wantMatch: Record<string, boolean> = {
  "dc-aug-yoy": true,
  "dc-aug-level": true,
  "dc-jun-yoy": false,
  "dc-since-level": true,
  "dc-since-pct": false,
  "gen-yoy": true,
  "gen-level": true,
  gap: true,
};
const checks = claimChecks();
for (const [id, matched] of Object.entries(wantMatch)) {
  const row = checks.find((item) => item.id === id);
  if (!row) fail(`missing claim ${id}`);
  else if (row.matched !== matched) fail(`${id} matched=${row.matched} census=${row.census}`);
}

for (const query of ["construction spending", "census", "office", "capex", "queue"]) {
  const cards = rankCatalog(query);
  if (cards.length === 0) fail(`${query} returned no signal or source card`);
  const rowIds = new Set(rankRows(query, COMMITMENTS).map((hit) => hit.row.id));
  if (cards.some((hit) => rowIds.has(hit.row.id))) fail(`${query} mixed a catalog card into row ids`);
}
const capex = rankCatalog("capex");
if (!capex.some((hit) => hit.row.evidence === "COMPANY CLAIM")) fail("capex did not return the SEC company claim");
const epoch = rankCatalog("epoch");
if (!epoch.some((hit) => hit.row.evidence === "THIRD-PARTY ESTIMATE")) fail("epoch did not return the third party estimate");
const claim = rankCatalog("kobeissi");
if (!claim.some((hit) => hit.row.evidence === "THIRD-PARTY CLAIM")) fail("kobeissi claim card missing");
if (SOURCES.some((source) => source.lastChecked && !/^\d{4}-\d{2}-\d{2}$/.test(source.lastChecked))) {
  fail("a last checked date is not a real date");
}

const spending = ask("what is census construction spending in MW", COMMITMENTS);
if (spending.groups.length !== 0) fail("construction spending ask returned rows");
if (!spending.lead.includes("not megawatts")) fail("construction spending ask did not refuse a conversion");
if (/\d+(\.\d+)?\s*(MW|GW)/.test(spending.lead)) fail("construction spending ask printed a power figure");

const files = [
  "scripts/fetch-signals.ts",
  "scripts/check-signals.ts",
  "src/lib/signals.ts",
  "src/lib/signalSearch.ts",
  "src/components/SignalsView.tsx",
  "src/data/sources.json",
  "src/data/signals.json",
  "public/signals.json",
];
for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  if (text.includes("\u2014") || text.includes("\u2013")) fail(`${file} has a long dash`);
}
const view = fs.readFileSync("src/components/SignalsView.tsx", "utf8");
if (view.includes("formatPower") || view.includes("fetch(")) fail("signals view formats power or fetches");
if (fs.readFileSync("src/data/signals.json", "utf8") !== fs.readFileSync("public/signals.json", "utf8")) {
  fail("public signals JSON differs from src");
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log("signals ok (dollars stay dollars, claims checked, rows unchanged)");
