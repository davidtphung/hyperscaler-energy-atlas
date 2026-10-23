/**
 * Counted totals stay split by kind. This check also locks the history
 * snapshots, the changelog seed, and the rows added with this record.
 */
import fs from "node:fs";
import { COMMITMENTS } from "../src/data/commitments.ts";
import { firmKindTotals } from "../src/lib/select.ts";
import { buildSnapshot, SNAPSHOT_KINDS, type DataSnapshot } from "./snapshot.ts";

const errors: string[] = [];
function fail(msg: string) {
  errors.push(msg);
}

const EXPECTED: Record<string, { rows: number; mw: number }> = {
  it_capacity: { rows: 19, mw: 7033.5 },
  grid_gen_for_dc: { rows: 0, mw: 0 },
  btm_gen: { rows: 2, mw: 400 },
  offtake_new: { rows: 2, mw: 1073 },
  offtake_existing: { rows: 1, mw: 500 },
};

if (COMMITMENTS.length !== 167) fail(`expected 167 rows, got ${COMMITMENTS.length}`);

const totals = Object.fromEntries(firmKindTotals(COMMITMENTS).map((row) => [row.kind, row]));
for (const [kind, want] of Object.entries(EXPECTED)) {
  const got = totals[kind];
  if (!got || got.rows !== want.rows || got.mw !== want.mw) {
    fail(`${kind}: expected ${want.rows} counted rows and ${want.mw} MW, got ${got?.rows} rows and ${got?.mw} MW`);
  }
}

const blended = Object.values(EXPECTED).reduce((sum, row) => sum + row.mw, 0);
const rendered = fs.readFileSync("src/components/RecordView.tsx", "utf8");
if (rendered.includes(String(blended))) fail("record view prints a blended total");
if (/[—–]/.test(rendered)) fail("record view copy uses an em or en dash");

const FLUIDSTACK: Record<string, number> = {
  "fluidstack-lake-mariner-it-378": 378,
  "fluidstack-barber-lake-it-168": 168,
  "fluidstack-abernathy-it-168": 168,
  "fluidstack-river-bend-it-245": 245,
};
for (const [id, mw] of Object.entries(FLUIDSTACK)) {
  const row = COMMITMENTS.find((item) => item.id === id);
  if (!row) fail(`missing ${id}`);
  else if (row.capacityMW !== mw || row.numberKind !== "it_capacity") {
    fail(`${id} changed: ${row.capacityMW} ${row.numberKind}`);
  }
}

const tensor = COMMITMENTS.find((row) => row.id === "tensorwave-fermi-matador-facility-222");
if (!tensor) fail("missing tensorwave row");
else {
  if (tensor.capacityMW !== 156 || tensor.counts !== "no" || tensor.numberKind !== "it_capacity") {
    fail(`tensorwave is ${tensor.capacityMW} ${tensor.counts} ${tensor.numberKind}`);
  }
  if (tensor.mwBasis !== "it_load") fail("tensorwave basis is not critical IT");
  if (tensor.energizedMW != null || tensor.onlineDate) fail("tensorwave energized MW or COD was filled");
  if (!tensor.summary.includes("222 MW") || !/facility power/i.test(tensor.summary)) {
    fail("tensorwave summary does not keep 222 MW as facility power");
  }
}

const ADDED = [
  "microsoft-nisource-genco-1100",
  "anthropic-everwind-point-tupper-95",
  "google-aes-indiana-monrovia-390",
  "soar-ai-chillicothe-oh",
  "google-xcel-pine-island-mn",
  "terawulf-muskie-ky-1000",
  "amazon-aep-xenergy-sullivan-960",
];
for (const id of ADDED) {
  const row = COMMITMENTS.find((item) => item.id === id);
  if (!row) {
    fail(`missing ${id}`);
    continue;
  }
  if (row.counts !== "no") fail(`${id} counts`);
  if (!row.sourceUrl || !row.confidence) fail(`${id} missing source or confidence`);
  if (row.energizedMW != null || row.onlineDate) fail(`${id} energized MW or COD was filled`);
  if (/[—–]/.test(`${row.headline} ${row.summary}`)) fail(`${id} copy uses an em or en dash`);
}

const niso = COMMITMENTS.find((row) => row.id === "microsoft-nisource-genco-1100");
if (niso && (niso.capacityMW !== 1100 || niso.numberKind !== "offtake_new" || niso.bound !== "approx_filing")) {
  fail("NiSource row does not store about 1,100 MW of new generation");
}
const everwind = COMMITMENTS.find((row) => row.id === "anthropic-everwind-point-tupper-95");
if (everwind && (everwind.capacityMW !== 95 || everwind.mwBasis != null || !/basis is not stated/i.test(everwind.summary))) {
  fail("EverWind row must store 95 MW and state that the basis is unknown");
}
if (everwind?.summary.includes("325") && everwind.capacityMW === 325) fail("EverWind expansion was stored as capacity");
const monrovia = COMMITMENTS.find((row) => row.id === "google-aes-indiana-monrovia-390");
if (monrovia && (monrovia.capacityMW !== 390 || monrovia.numberKind !== "utility_load")) {
  fail("Monrovia row is not 390 MW of utility load");
}
const soar = COMMITMENTS.find((row) => row.id === "soar-ai-chillicothe-oh");
if (soar && (soar.capacityMW != null || soar.status !== "construction" || soar.excludeReason !== "mw_null")) {
  fail("SOAR row should be under construction with empty megawatts");
}
if (soar && !soar.summary.includes("154 MW")) fail("SOAR summary does not explain the 154 MW site power");
const pine = COMMITMENTS.find((row) => row.id === "google-xcel-pine-island-mn");
if (pine && (pine.capacityMW != null || pine.numberKind !== "utility_load" || pine.status !== "announced")) {
  fail("Pine Island load megawatts must stay empty");
}
if (pine && !/780 MW/.test(pine.summary)) fail("Pine Island summary does not explain the unverified 780 MW");
const muskie = COMMITMENTS.find((row) => row.id === "terawulf-muskie-ky-1000");
if (muskie && (muskie.capacityMW !== 1000 || muskie.numberKind !== "utility_load" || muskie.status !== "announced")) {
  fail("Muskie row is not an announced 1,000 MW utility load");
}
const breed = COMMITMENTS.find((row) => row.id === "amazon-aep-xenergy-sullivan-960");
if (breed && (breed.capacityMW !== 960 || breed.status !== "exploratory" || breed.counts !== "no")) {
  fail("Sullivan County row is not an uncounted 960 MW feasibility study");
}

function readSnap(file: string): DataSnapshot {
  return JSON.parse(fs.readFileSync(file, "utf8")) as DataSnapshot;
}

function assertTotals(snap: DataSnapshot, label: string) {
  if (/total|blend|summed/i.test(Object.keys(snap).join(" "))) fail(`${label} has a cross-kind total field`);
  if (snap.kinds.length !== SNAPSHOT_KINDS.length) fail(`${label} kind count`);
  for (const kind of SNAPSHOT_KINDS) {
    const got = snap.kinds.find((item) => item.numberKind === kind);
    const want = kind === "utility_load" ? { rows: 0, mw: 0 } : EXPECTED[kind];
    if (!got || !want || got.countedRows !== want.rows || got.countedMW !== want.mw) {
      fail(`${label} ${kind}: ${got?.countedRows} rows ${got?.countedMW} MW`);
    }
  }
  for (const row of snap.rows) {
    for (const key of ["id", "status", "capacityMW", "counts"]) {
      if (!(key in row)) fail(`${label} row missing ${key}`);
    }
  }
}

const backfill = readSnap("data/history/2026-10-08.json");
if (backfill.date !== "2026-10-08" || backfill.rowCount !== 160 || backfill.source !== "public/data.json") {
  fail("2026-10-08 snapshot is not the 160 row backfill from data.json");
}
assertTotals(backfill, "2026-10-08");
const oldTensor = backfill.rows.find((row) => row.id === "tensorwave-fermi-matador-facility-222");
if (!oldTensor || oldTensor.capacityMW !== 222 || oldTensor.counts !== "no") fail("backfill tensorwave is not 222 MW uncounted");
for (const id of ADDED) {
  if (backfill.rows.some((row) => row.id === id)) fail(`${id} leaked into the 2026-10-08 backfill`);
}

const todayPath = "data/history/2026-10-23.json";
if (!fs.existsSync(todayPath)) fail("missing 2026-10-23 snapshot");
else {
  const today = readSnap(todayPath);
  const expected = buildSnapshot(COMMITMENTS, "2026-10-23", "src/data/commitments.ts");
  if (JSON.stringify(today) !== JSON.stringify(expected)) fail("2026-10-23 snapshot does not match committed rows");
  assertTotals(today, "2026-10-23");
  if (today.rowCount !== 167) fail(`2026-10-23 row count ${today.rowCount}`);
  const nowTensor = today.rows.find((row) => row.id === "tensorwave-fermi-matador-facility-222");
  if (!nowTensor || nowTensor.capacityMW !== 156) fail("today snapshot still has the old TensorWave figure");
}

const changelog = JSON.parse(fs.readFileSync("data/changelog.json", "utf8")) as {
  entries: { date: string; type: string; rowId: string; before: string; after: string; sourceUrl: string }[];
};
if (/[—–]/.test(JSON.stringify(changelog))) fail("changelog uses an em or en dash");
const types = new Set(["row_added", "status_changed", "mw_corrected", "counts_changed"]);
const seen = new Set<string>();
for (const entry of changelog.entries) {
  if (!entry.date || !types.has(entry.type) || !entry.rowId || entry.before == null || entry.after == null || !entry.sourceUrl) {
    fail(`changelog entry incomplete: ${entry.rowId}`);
  }
  seen.add(`${entry.type}:${entry.rowId}`);
}
if (!seen.has("mw_corrected:tensorwave-fermi-matador-facility-222")) fail("changelog missing the TensorWave correction");
for (const id of ADDED) {
  if (!seen.has(`row_added:${id}`)) fail(`changelog missing ${id}`);
}

const workflow = fs.readFileSync(".github/workflows/daily-snapshot.yml", "utf8");
if (!workflow.includes("15 15 * * *")) fail("daily snapshot cron is not 15:15 UTC");
if (/fetch-signals|npm run build|gh-pages/.test(workflow)) fail("daily snapshot workflow fetches news, builds, or deploys");
if (!workflow.includes("scripts/write-snapshot.ts")) fail("daily snapshot workflow does not record state");

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log("history check ok");
console.log("counted totals: IT 7,033.5 MW/19, grid 0, on-site 400/2, new-plant 1,073/2, existing-plant 500/1");
