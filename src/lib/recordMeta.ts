import type { Bound, Commitment, ExcludeReason } from "../types";
import { evidenceFor } from "./evidence.ts";
import { formatFullDate, formatNumberKind } from "./format.ts";
import { sourceDomain } from "./search.ts";
import { STATUS } from "./theme.ts";

const EXCLUDE_PLAIN: Record<ExcludeReason, string> = {
  mw_null: "no MW on the row",
  unverified: "not verified",
  duplicate: "duplicate of another row",
  conflict: "conflicts with another figure",
  target_not_firm: "target is not firm",
  restart: "restart in progress",
  status_flip_pending: "status change is still pending",
  remove_candidate: "candidate for removal",
  unverified_construction: "construction is not verified",
};

const NEVER = new Set(["program", "equipment_supply", "storage", "utility_load", "unresolved"]);

const FIGURE: Record<Bound, string> = {
  exact: "exact",
  approx_filing: "approx_filing",
  up_to: "up_to",
  at_least: "at_least",
};

export interface RecordMeta {
  id: string;
  kind: string;
  status: string;
  counts: "yes" | "no";
  countsWhy: string;
  basis: string;
  figureType: string;
  sourceDomain: string;
  checked: string;
  evidence: string;
}

export function recordMeta(row: Commitment): RecordMeta {
  const evidence = evidenceFor(row);
  const marks = [evidence.status.mark, evidence.mw.mark];
  const unique = [...new Set(marks)];
  return {
    id: row.id,
    kind: formatNumberKind(row.numberKind) ?? row.numberKind,
    status: STATUS[row.status].label,
    counts: row.counts,
    countsWhy: countsWhy(row),
    basis: basisText(row),
    figureType: FIGURE[row.bound] ?? row.bound,
    sourceDomain: sourceDomain(row.sourceUrl) || "not recorded",
    checked: row.checkedOn ? formatFullDate(row.checkedOn) : "not recorded",
    evidence: unique.join(", "),
  };
}

function basisText(row: Commitment): string {
  if (row.mwBasis === "it_load") return "IT load";
  if (row.mwBasis === "facility_power") return "facility power";
  return "not recorded";
}

function countsWhy(row: Commitment): string {
  if (row.counts === "yes") return "Counted. This row is in its kind total.";
  if (row.excludeReason) return `Not counted: ${EXCLUDE_PLAIN[row.excludeReason]}.`;
  if (NEVER.has(row.numberKind)) return "Not counted. This kind does not enter a firm total.";
  return "Not counted.";
}

export const FIELD_DICTIONARY: { name: string; description: string }[] = [
  { name: "id", description: "Stable row id." },
  { name: "buyer", description: "Named actor, tenant, or holder." },
  { name: "counterparty", description: "Operator, utility, developer, or partner." },
  { name: "project", description: "Row name." },
  { name: "numberKind", description: "What the figure measures. Kinds are not added together." },
  { name: "counts", description: "yes only when the row enters its kind total." },
  { name: "bound", description: "Figure type: exact, approx_filing, up_to, or at_least." },
  { name: "excludeReason", description: "Why an otherwise countable row stays out." },
  { name: "capacityMW", description: "Stored megawatts. Empty when none is recorded." },
  { name: "mwBasis", description: "IT load or facility power, only when the row records it." },
  { name: "status", description: "Stored status." },
  { name: "state", description: "State or region as stored. Filters group Texas with TX." },
  { name: "sourceName", description: "Primary source title." },
  { name: "sourceUrl", description: "Primary source URL." },
  { name: "sourceDomain", description: "Hostname of the primary source URL." },
  { name: "sourceName2", description: "Second source title, when the row has one." },
  { name: "sourceUrl2", description: "Second source URL, when the row has one." },
  { name: "checkedOn", description: "Date the link was checked. Empty when not recorded." },
  { name: "evidenceStatus", description: "Status evidence label from the row." },
  { name: "evidenceMw", description: "MW evidence label from the row." },
  { name: "summary", description: "Notes stored on the row." },
];
