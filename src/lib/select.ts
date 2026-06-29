import type { Commitment, PreparedCommitment, TechType, Status, Category } from "../types";
import { parseDate } from "./format";

export interface FilterState {
  buyers: Set<string>;
  techs: Set<TechType>;
  statuses: Set<Status>;
  categories: Set<Category>;
  query: string;
}

export function prepare(commitments: Commitment[]): PreparedCommitment[] {
  return commitments
    .map((c) => {
      const t = parseDate(c.date);
      return { ...c, t, year: new Date(t).getUTCFullYear(), point: null };
    })
    .sort((a, b) => a.t - b.t);
}

export interface Domain {
  minT: number;
  maxT: number;
  buyers: string[];
  totalMW: number;
}

export function domainOf(prepared: PreparedCommitment[]): Domain {
  let minT = Infinity;
  let maxT = -Infinity;
  let totalMW = 0;
  const buyers = new Map<string, number>();
  for (const c of prepared) {
    minT = Math.min(minT, c.t);
    maxT = Math.max(maxT, c.t);
    totalMW += c.capacityMW ?? 0;
    buyers.set(c.buyer, (buyers.get(c.buyer) ?? 0) + (c.capacityMW ?? 0));
  }
  const ordered = [...buyers.entries()].sort((a, b) => b[1] - a[1]).map(([b]) => b);
  return { minT, maxT, buyers: ordered, totalMW };
}

function matchesQuery(c: Commitment, q: string): boolean {
  if (!q) return true;
  const hay = `${c.buyer} ${c.counterparty} ${c.project} ${c.city} ${c.state} ${c.country} ${c.summary}`.toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => hay.includes(term));
}

/** Apply every facet filter (buyer, technology, status, category, query). The
 * timeline reveal is applied separately so future commitments can render faintly. */
export function applyFacets(list: PreparedCommitment[], f: FilterState): PreparedCommitment[] {
  return list.filter(
    (c) =>
      (f.buyers.size === 0 || f.buyers.has(c.buyer)) &&
      (f.techs.size === 0 || f.techs.has(c.techType)) &&
      (f.statuses.size === 0 || f.statuses.has(c.status)) &&
      (f.categories.size === 0 || f.categories.has(c.category)) &&
      matchesQuery(c, f.query)
  );
}

export function sumMW(list: { capacityMW: number | null }[]): number {
  return list.reduce((acc, c) => acc + (c.capacityMW ?? 0), 0);
}

export interface FacetCounts {
  buyers: Record<string, number>;
  techs: Record<string, number>;
  statuses: Record<string, number>;
  categories: Record<string, number>;
}

/**
 * Count, per option, how many commitments would remain if that option were
 * selected, holding every OTHER active facet (and the search query) fixed.
 * Time range is intentionally excluded so chip counts stay stable while
 * scrubbing the timeline.
 */
export function facetCounts(list: PreparedCommitment[], f: FilterState): FacetCounts {
  const q = (c: Commitment) => matchesQuery(c, f.query);
  const okBuyer = (c: Commitment) => f.buyers.size === 0 || f.buyers.has(c.buyer);
  const okTech = (c: Commitment) => f.techs.size === 0 || f.techs.has(c.techType);
  const okStatus = (c: Commitment) => f.statuses.size === 0 || f.statuses.has(c.status);
  const okCat = (c: Commitment) => f.categories.size === 0 || f.categories.has(c.category);

  const tally = <K extends string>(pick: (c: PreparedCommitment) => K, keep: (c: PreparedCommitment) => boolean) => {
    const m: Record<string, number> = {};
    for (const c of list) if (q(c) && keep(c)) m[pick(c)] = (m[pick(c)] ?? 0) + 1;
    return m;
  };

  return {
    buyers: tally((c) => c.buyer, (c) => okTech(c) && okStatus(c) && okCat(c)),
    techs: tally((c) => c.techType, (c) => okBuyer(c) && okStatus(c) && okCat(c)),
    statuses: tally((c) => c.status, (c) => okBuyer(c) && okTech(c) && okCat(c)),
    categories: tally((c) => c.category, (c) => okBuyer(c) && okTech(c) && okStatus(c)),
  };
}
