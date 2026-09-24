import type { Commitment, PreparedCommitment, TechType, Status, Category, Era, NumberKind } from "../types";
import { parseDate } from "./format";
import { classifyEra } from "./era";
import { resolveActorKind } from "./actors";

export interface FilterState {
  buyers: Set<string>;
  techs: Set<TechType>;
  statuses: Set<Status>;
  categories: Set<Category>;
  eras: Set<Era>;
  query: string;
}

export function prepare(commitments: Commitment[]): PreparedCommitment[] {
  return commitments
    .map((c) => {
      const t = parseDate(c.date);
      const dated = Number.isFinite(t);
      return {
        ...c,
        actorKind: resolveActorKind(c.buyer, c.actorKind),
        t: dated ? t : Number.NaN,
        year: dated ? new Date(t).getUTCFullYear() : 0,
        era: dated ? classifyEra(t) : "current",
        point: null,
      };
    })
    .sort((a, b) => {
      const af = Number.isFinite(a.t);
      const bf = Number.isFinite(b.t);
      if (af && bf) return a.t - b.t;
      if (af) return -1;
      if (bf) return 1;
      return 0;
    });
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
    if (Number.isFinite(c.t)) {
      minT = Math.min(minT, c.t);
      maxT = Math.max(maxT, c.t);
    }
    totalMW += mwForAggregate(c);
    buyers.set(c.buyer, (buyers.get(c.buyer) ?? 0) + 1);
  }
  const ordered = [...buyers.entries()].sort((a, b) => b[1] - a[1]).map(([b]) => b);
  return { minT, maxT, buyers: ordered, totalMW };
}

function matchesQuery(c: Commitment, q: string): boolean {
  if (!q) return true;
  const kind = "actorKind" in c && c.actorKind ? c.actorKind : "";
  const hay = `${c.buyer} ${kind} ${c.counterparty} ${c.project} ${c.city} ${c.state} ${c.country} ${c.summary}`.toLowerCase();
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
      (f.eras.size === 0 || f.eras.has(c.era)) &&
      matchesQuery(c, f.query)
  );
}

/** Firm hero kinds, in display order. These totals are never added together. */
export const FIRM_KIND_ORDER = [
  "it_capacity",
  "grid_gen_for_dc",
  "btm_gen",
  "offtake_new",
  "offtake_existing",
] as const satisfies readonly NumberKind[];

export interface KindTotal {
  kind: NumberKind;
  rows: number;
  mw: number;
  approx: boolean;
}

/** counts=yes rows only, split by kind. */
export function firmKindTotals(list: Pick<Commitment, "numberKind" | "counts" | "capacityMW" | "bound">[]): KindTotal[] {
  return FIRM_KIND_ORDER.map((kind) => {
    const rows = list.filter((c) => c.numberKind === kind && c.counts === "yes");
    return {
      kind,
      rows: rows.length,
      mw: rows.reduce((sum, c) => sum + (c.capacityMW ?? 0), 0),
      approx: rows.some((c) => c.bound === "approx_filing"),
    };
  });
}

export function announcedCount(list: Pick<Commitment, "status">[]): number {
  return list.filter((c) => c.status === "announced").length;
}

/** Rows with a number kind are not mixed into a single generation total. */
export function isNonGenerationUnit(c: { numberKind?: string }): boolean {
  return Boolean(c.numberKind);
}

/** Do not Atlas-sum labeled IT, demand, compute-target, DC, offtake, storage, derived, matching, BTM generation, facility-power, AI cluster, or campus design capacity rows. */
export function mwForAggregate(c: { capacityMW: number | null; numberKind?: string }): number {
  if (isNonGenerationUnit(c)) return 0;
  return c.capacityMW ?? 0;
}

export function sumMW(list: { capacityMW: number | null; numberKind?: string }[]): number {
  return list.reduce((acc, c) => acc + mwForAggregate(c), 0);
}

export interface FacetCounts {
  buyers: Record<string, number>;
  techs: Record<string, number>;
  statuses: Record<string, number>;
  categories: Record<string, number>;
  eras: Record<string, number>;
}

/**
 * Count, per option, how many commitments would remain if that option were
 * selected, holding every OTHER active facet (and the search query) fixed.
 * Time range is intentionally excluded so chip counts stay stable while
 * scrubbing the timeline.
 */
export function facetCounts(list: PreparedCommitment[], f: FilterState): FacetCounts {
  const q = (c: Commitment) => matchesQuery(c, f.query);
  const okBuyer = (c: PreparedCommitment) => f.buyers.size === 0 || f.buyers.has(c.buyer);
  const okTech = (c: PreparedCommitment) => f.techs.size === 0 || f.techs.has(c.techType);
  const okStatus = (c: PreparedCommitment) => f.statuses.size === 0 || f.statuses.has(c.status);
  const okCat = (c: PreparedCommitment) => f.categories.size === 0 || f.categories.has(c.category);
  const okEra = (c: PreparedCommitment) => f.eras.size === 0 || f.eras.has(c.era);

  const tally = <K extends string>(pick: (c: PreparedCommitment) => K, keep: (c: PreparedCommitment) => boolean) => {
    const m: Record<string, number> = {};
    for (const c of list) if (q(c) && keep(c)) m[pick(c)] = (m[pick(c)] ?? 0) + 1;
    return m;
  };

  return {
    buyers: tally((c) => c.buyer, (c) => okTech(c) && okStatus(c) && okCat(c) && okEra(c)),
    techs: tally((c) => c.techType, (c) => okBuyer(c) && okStatus(c) && okCat(c) && okEra(c)),
    statuses: tally((c) => c.status, (c) => okBuyer(c) && okTech(c) && okCat(c) && okEra(c)),
    categories: tally((c) => c.category, (c) => okBuyer(c) && okTech(c) && okStatus(c) && okEra(c)),
    eras: tally((c) => c.era, (c) => okBuyer(c) && okTech(c) && okStatus(c) && okCat(c)),
  };
}
