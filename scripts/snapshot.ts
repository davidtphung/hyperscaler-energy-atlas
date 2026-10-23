/**
 * Daily record of committed atlas rows.
 * Counted megawatts are summed only inside one numberKind.
 * Kinds are never added together. This module does not fetch news or edit rows.
 */
import type { CountsFlag, NumberKind, Status } from "../src/types.ts";

export const SNAPSHOT_KINDS = [
  "it_capacity",
  "utility_load",
  "btm_gen",
  "offtake_new",
  "offtake_existing",
  "grid_gen_for_dc",
] as const satisfies readonly NumberKind[];

export interface SnapshotInputRow {
  id: string;
  status: Status | string;
  capacityMW: number | null;
  counts: CountsFlag | string;
  numberKind: NumberKind | string;
}

export interface SnapshotKind {
  numberKind: NumberKind;
  countedMW: number;
  countedRows: number;
  statusMix: Record<string, number>;
}

export interface SnapshotRow {
  id: string;
  status: string;
  capacityMW: number | null;
  counts: string;
  numberKind: string;
}

export interface DataSnapshot {
  date: string;
  source: string;
  note: string;
  rowCount: number;
  kinds: SnapshotKind[];
  rows: SnapshotRow[];
}

export const SNAPSHOT_NOTE =
  "Counted totals sum capacityMW only where counts is yes, and only inside one numberKind. Kinds are never added together.";

function roundMW(mw: number): number {
  return Math.round(mw * 10000) / 10000;
}

export function buildSnapshot(rows: readonly SnapshotInputRow[], date: string, source: string): DataSnapshot {
  const kinds: SnapshotKind[] = SNAPSHOT_KINDS.map((numberKind) => {
    const inKind = rows.filter((row) => row.numberKind === numberKind);
    const counted = inKind.filter((row) => row.counts === "yes");
    const statusMix: Record<string, number> = {};
    for (const row of inKind) {
      const status = String(row.status);
      statusMix[status] = (statusMix[status] ?? 0) + 1;
    }
    const sortedMix: Record<string, number> = {};
    for (const status of Object.keys(statusMix).sort()) sortedMix[status] = statusMix[status];
    return {
      numberKind,
      countedMW: roundMW(counted.reduce((sum, row) => sum + (typeof row.capacityMW === "number" ? row.capacityMW : 0), 0)),
      countedRows: counted.length,
      statusMix: sortedMix,
    };
  });

  const listed: SnapshotRow[] = rows
    .map((row) => ({
      id: row.id,
      status: String(row.status),
      capacityMW: typeof row.capacityMW === "number" ? row.capacityMW : null,
      counts: String(row.counts),
      numberKind: String(row.numberKind),
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  return {
    date,
    source,
    note: SNAPSHOT_NOTE,
    rowCount: listed.length,
    kinds,
    rows: listed,
  };
}

export function pacificDate(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
