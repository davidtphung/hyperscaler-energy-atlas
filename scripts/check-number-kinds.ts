import fs from "node:fs";
import path from "node:path";
import { COMMITMENTS } from "../src/data/commitments.ts";
import { formatFirmGW, formatFirmMW, formatNumberKind } from "../src/lib/format.ts";
import type { Bound, CountsFlag, ExcludeReason, NumberKind } from "../src/types.ts";

const KINDS = new Set<NumberKind>([
  "it_capacity",
  "grid_gen_for_dc",
  "btm_gen",
  "offtake_existing",
  "offtake_new",
  "utility_load",
  "program",
  "equipment_supply",
  "storage",
  "unresolved",
]);
const COUNTS = new Set<CountsFlag>(["yes", "no"]);
const BOUNDS = new Set<Bound>(["exact", "up_to", "at_least"]);
const REASONS = new Set<ExcludeReason>([
  "mw_null",
  "unverified",
  "duplicate",
  "conflict",
  "target_not_firm",
  "restart",
  "status_flip_pending",
  "remove_candidate",
]);
const NEVER = new Set<NumberKind>(["program", "equipment_supply", "storage", "utility_load", "unresolved"]);
const COUNTABLE = new Set<NumberKind>(["it_capacity", "grid_gen_for_dc", "btm_gen", "offtake_new", "offtake_existing"]);

const errors: string[] = [];
const ids = new Set(COMMITMENTS.map((c) => c.id));
const byId = new Map(COMMITMENTS.map((c) => [c.id, c]));

if (ids.size !== COMMITMENTS.length) errors.push("duplicate commitment ids");

for (const c of COMMITMENTS) {
  if (!c.numberKind || !KINDS.has(c.numberKind)) errors.push(`${c.id}: missing or illegal numberKind`);
  if (!COUNTS.has(c.counts)) errors.push(`${c.id}: illegal counts`);
  if (!BOUNDS.has(c.bound)) errors.push(`${c.id}: illegal bound`);
  if (c.excludeReason && !REASONS.has(c.excludeReason)) errors.push(`${c.id}: illegal excludeReason`);
  if (c.counts === "yes" && (c.bound !== "exact" || NEVER.has(c.numberKind))) {
    errors.push(`${c.id}: counted row is non-exact or a never-count kind`);
  }
  const built = c.status === "construction" || c.status === "operational";
  if (c.counts === "no" && c.bound === "exact" && COUNTABLE.has(c.numberKind) && built && !c.excludeReason) {
    errors.push(`${c.id}: exact countable construction or operational row has counts=no and no excludeReason`);
  }
  if (c.counts === "yes" && c.excludeReason) errors.push(`${c.id}: counted row has an excludeReason`);
  if (c.counts === "yes" && c.status !== "construction" && c.status !== "operational") {
    errors.push(`${c.id}: counted row is not under construction or operating`);
  }
  if (c.counts === "yes" && !c.sourceUrl) errors.push(`${c.id}: counted row has no primary source`);
  if (c.parentId && !ids.has(c.parentId)) errors.push(`${c.id}: parentId ${c.parentId} is an orphan`);
  if (c.parentId) {
    const parent = byId.get(c.parentId);
    if (parent && c.counts === "yes" && parent.counts === "yes") {
      errors.push(`${c.id}: parent and child are both counted`);
    }
  }
}

const EXPECTED: Record<string, { rows: number; mw: number; gw: string; mwLabel: string }> = {
  it_capacity: { rows: 26, mw: 13397.5, gw: "13.40 GW", mwLabel: "13,397.5 MW" },
  grid_gen_for_dc: { rows: 1, mw: 2262, gw: "2.26 GW", mwLabel: "2,262 MW" },
  btm_gen: { rows: 3, mw: 616, gw: "0.62 GW", mwLabel: "616 MW" },
  offtake_new: { rows: 3, mw: 1188, gw: "1.19 GW", mwLabel: "1,188 MW" },
  offtake_existing: { rows: 1, mw: 140, gw: "0.14 GW", mwLabel: "140 MW" },
};

const totals = new Map<string, { rows: number; mw: number }>();
for (const c of COMMITMENTS) {
  if (c.counts !== "yes") continue;
  const bucket = totals.get(c.numberKind) ?? { rows: 0, mw: 0 };
  bucket.rows += 1;
  bucket.mw += c.capacityMW ?? 0;
  totals.set(c.numberKind, bucket);
}

for (const [kind, expected] of Object.entries(EXPECTED)) {
  const got = totals.get(kind) ?? { rows: 0, mw: 0 };
  if (got.rows !== expected.rows || got.mw !== expected.mw) {
    const rows = COMMITMENTS.filter((c) => c.counts === "yes" && c.numberKind === kind)
      .map((c) => `${c.id} ${c.capacityMW} ${c.status}`)
      .join("; ");
    errors.push(`${kind}: expected ${expected.rows} rows ${expected.mw} MW, got ${got.rows} rows ${got.mw} MW. ${rows}`);
  }
  const label = formatNumberKind(kind as NumberKind);
  const gw = formatFirmGW(expected.mw);
  const mwLabel = formatFirmMW(expected.mw);
  if (gw !== expected.gw || mwLabel !== expected.mwLabel) {
    errors.push(`${kind}: rendered ${gw} (${mwLabel}), expected ${expected.gw} (${expected.mwLabel})`);
  }
  if (kind === "grid_gen_for_dc" && label !== "Grid generation being built for a data center") {
    errors.push(`grid label is "${label}"`);
  }
  console.log(`${gw} (${mwLabel}) ${label}`);
}

const blended = [...totals.values()].reduce((sum, b) => sum + b.mw, 0);
if (COMMITMENTS.some((c) => `${c.headline} ${c.summary}`.includes("121.1"))) {
  errors.push("121.1 appears in commitment copy");
}

function walk(dir: string) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (name === "node_modules" || name === "dist") continue;
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full);
    else if (/\.(ts|tsx|css|html)$/.test(name)) {
      const text = fs.readFileSync(full, "utf8");
      if (!text.includes("121.1")) continue;
      const lines = text.split("\n");
      lines.forEach((line, i) => {
        if (!line.includes("121.1")) return;
        if (/"lng":\s*-?121\.1/.test(line)) return;
        errors.push(`${full}:${i + 1} contains 121.1 outside a map longitude`);
      });
    }
  }
}
walk(path.resolve(import.meta.dirname, "../src"));

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`numberKind check ok (${COMMITMENTS.length} rows)`);
console.log(`kinds stay separate; blended sum ${blended} MW is not rendered`);
