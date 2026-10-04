import sourcesFile from "../data/sources.json" with { type: "json" };
import { norm, parseSearchQuery, type Ranked } from "./search.ts";
import { SIGNALS } from "./signals.ts";

export interface SourceEntry {
  id: string;
  name: string;
  publisher: string;
  url: string;
  cadence: string;
  unit: string;
  measures: string;
  evidence: string;
  lastChecked?: string;
  fit: string;
}

export const SOURCES = sourcesFile as SourceEntry[];

export interface CatalogHit {
  id: string;
  group: "signal" | "source";
  title: string;
  detail: string;
  evidence: string;
  anchor: string;
}

function scoreText(value: string, term: string): number {
  const v = norm(value);
  const t = norm(term);
  if (!v || !t) return 0;
  if (v === t) return 100;
  if (v.startsWith(t)) return 60;
  if (v.includes(t)) return 30;
  return 0;
}

export function signalCatalog(): CatalogHit[] {
  const series = SIGNALS.series.map((item) => ({
    id: item.id,
    group: "signal" as const,
    title: item.label,
    detail: `${item.category} construction spending. Census ${item.ownership}. ${item.units}. ${item.vintage}.`,
    evidence: "FACT",
    anchor: "signal-chart",
  }));
  const claim: CatalogHit = {
    id: "kobeissi-2026-10-03",
    group: "signal",
    title: "Third party claim on data center and general office construction spending",
    detail: "Kobeissi Letter post from 3 Oct 2026. Compared with Census on the Signals tab. Not a counted row.",
    evidence: "THIRD-PARTY CLAIM",
    anchor: "signal-claims",
  };
  const sources = SOURCES.map((item) => ({
    id: item.id,
    group: "source" as const,
    title: item.name,
    detail: `${item.publisher}. ${item.measures} ${item.unit}. ${item.fit}`,
    evidence: item.evidence,
    anchor: item.id,
  }));
  return [...series, claim, ...sources];
}

export const SIGNAL_CATALOG = signalCatalog();

/** Rank Signals and source cards. Commitment rows are not included. */
export function rankCatalog(query: string, docs: readonly CatalogHit[] = SIGNAL_CATALOG): Ranked<CatalogHit>[] {
  const terms = parseSearchQuery(query)
    .text.split(/\s+/)
    .map((term) => norm(term))
    .filter(Boolean);
  if (terms.length === 0) return [];
  const out: { row: CatalogHit; score: number; index: number }[] = [];
  docs.forEach((doc, index) => {
    let score = 0;
    for (const term of terms) {
      const title = scoreText(doc.title, term) * 4;
      const detail = scoreText(doc.detail, term);
      const evidence = scoreText(doc.evidence, term) * 2;
      const id = scoreText(doc.id, term) * 2;
      const best = Math.max(title, detail, evidence, id);
      if (best === 0) return;
      score += best;
    }
    out.push({ row: doc, score, index });
  });
  out.sort((a, b) => b.score - a.score || a.index - b.index);
  return out.map(({ row, score }) => ({ row, score, matchedFields: [row.group] }));
}
