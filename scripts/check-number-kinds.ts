import { COMMITMENTS } from "../src/data/commitments.ts";
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
  if (c.parentId && !ids.has(c.parentId)) errors.push(`${c.id}: parentId ${c.parentId} is an orphan`);
  if (c.parentId) {
    const parent = byId.get(c.parentId);
    if (parent && c.counts === "yes" && parent.counts === "yes") {
      errors.push(`${c.id}: parent and child are both counted`);
    }
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`numberKind check ok (${COMMITMENTS.length} rows)`);
