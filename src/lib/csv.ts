import type { PreparedCommitment } from "../types";
import { ERA } from "./era";
import { TECH, STATUS, CATEGORY } from "./theme";

const COLUMNS: { key: string; get: (c: PreparedCommitment) => string | number }[] = [
  { key: "id", get: (c) => c.id },
  { key: "buyer", get: (c) => c.buyer },
  { key: "counterparty", get: (c) => c.counterparty },
  { key: "project", get: (c) => c.project },
  { key: "category", get: (c) => CATEGORY[c.category].label },
  { key: "technology", get: (c) => TECH[c.techType].label },
  { key: "capacity_mw", get: (c) => (c.capacityMW ?? "") },
  { key: "status", get: (c) => STATUS[c.status].label },
  { key: "era", get: (c) => ERA[c.era].label },
  { key: "announcement_date", get: (c) => c.date },
  { key: "city", get: (c) => c.city },
  { key: "state", get: (c) => c.state },
  { key: "country", get: (c) => c.country },
  { key: "lat", get: (c) => (c.lat ?? "") },
  { key: "lng", get: (c) => (c.lng ?? "") },
  { key: "confidence", get: (c) => c.confidence },
  { key: "summary", get: (c) => c.summary },
  { key: "source_name", get: (c) => c.sourceName },
  { key: "source_url", get: (c) => c.sourceUrl },
];

function escape(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCSV(rows: PreparedCommitment[]): string {
  const header = COLUMNS.map((c) => c.key).join(",");
  const body = rows.map((r) => COLUMNS.map((c) => escape(c.get(r))).join(",")).join("\n");
  return `${header}\n${body}\n`;
}

export function downloadCSV(rows: PreparedCommitment[], filename = "hyperscaler-commitments.csv") {
  const blob = new Blob([toCSV(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
