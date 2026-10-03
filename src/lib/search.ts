import type { Commitment, NumberKind, Status, TechType } from "../types";
import { formatNumberKind } from "./format.ts";
import { STATUS, TECH } from "./theme.ts";

export interface UsState {
  code: string;
  name: string;
}

export const US_STATES: UsState[] = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "DC", name: "District of Columbia" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
];

/** Lowercase codes that are also ordinary words. Accept them only when typed in capitals. */
const STOP_CODES = new Set(["in", "or", "me", "ok", "hi", "id", "de", "la", "al", "co", "ma", "pa"]);

const BY_CODE = new Map(US_STATES.map((s) => [s.code, s]));

export interface KindPhrase {
  phrase: string;
  kind: NumberKind;
}

/** Plain names accepted for numberKind. Longest phrases first. */
export const KIND_PHRASES: KindPhrase[] = [
  { phrase: "existing plant contracts", kind: "offtake_existing" },
  { phrase: "existing plant contract", kind: "offtake_existing" },
  { phrase: "contracts with existing plants", kind: "offtake_existing" },
  { phrase: "new plant contracts", kind: "offtake_new" },
  { phrase: "new plant contract", kind: "offtake_new" },
  { phrase: "contracts with new plants", kind: "offtake_new" },
  { phrase: "behind the meter", kind: "btm_gen" },
  { phrase: "on site generation", kind: "btm_gen" },
  { phrase: "on site", kind: "btm_gen" },
  { phrase: "onsite", kind: "btm_gen" },
  { phrase: "grid generation", kind: "grid_gen_for_dc" },
  { phrase: "data center it", kind: "it_capacity" },
  { phrase: "it load", kind: "it_capacity" },
  { phrase: "it capacity", kind: "it_capacity" },
];

export interface Ranked<T> {
  row: T;
  score: number;
  matchedFields: string[];
}

type Searchable = Pick<
  Commitment,
  | "buyer"
  | "counterparty"
  | "project"
  | "city"
  | "state"
  | "country"
  | "summary"
  | "status"
  | "numberKind"
  | "techType"
  | "sourceName"
> & {
  sourceName2?: string;
  actorKind?: string;
};

interface FieldBag {
  name: string;
  weight: number;
  values: string[];
}

const EXACT = 100;
const PREFIX = 60;
const SUB = 30;

/** Lowercase, fold hyphens and slashes to spaces. */
export function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[_/]+/g, " ")
    .replace(/-/g, " ")
    .replace(/[^a-z0-9.\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeReg(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function parseStateQuery(original: string): UsState | null {
  const n = norm(original);
  const byLen = [...US_STATES].sort((a, b) => b.name.length - a.name.length);
  for (const st of byLen) {
    const name = norm(st.name);
    if (new RegExp(`\\b${escapeReg(name)}\\b`).test(n)) return st;
  }
  const tokens = original.split(/[^A-Za-z]+/).filter(Boolean);
  for (const tok of tokens) {
    if (tok.length !== 2) continue;
    const st = BY_CODE.get(tok.toUpperCase());
    if (!st) continue;
    const lower = tok.toLowerCase();
    if (tok === tok.toUpperCase() || !STOP_CODES.has(lower)) return st;
  }
  return null;
}

export function rowMatchesState(rowState: string, st: UsState): boolean {
  const n = norm(rowState);
  return n === norm(st.code) || n === norm(st.name);
}

function stateValues(state: string): string[] {
  const raw = state.trim();
  if (!raw) return [];
  const st = US_STATES.find((s) => norm(s.code) === norm(raw) || norm(s.name) === norm(raw));
  if (!st) return [raw];
  return [raw, st.code, st.name];
}

function kindValues(kind: NumberKind): string[] {
  const phrases = KIND_PHRASES.filter((p) => p.kind === kind).map((p) => p.phrase);
  const label = formatNumberKind(kind);
  return label ? [kind, label, ...phrases] : [kind, ...phrases];
}

function statusValues(status: Status): string[] {
  return [status, STATUS[status].label];
}

function techValues(tech: TechType): string[] {
  const meta = TECH[tech];
  return [tech, meta.label, meta.short];
}

function fieldsOf(row: Searchable): FieldBag[] {
  return [
    { name: "project", weight: 10, values: [row.project] },
    { name: "buyer", weight: 10, values: [row.buyer] },
    { name: "counterparty", weight: 4, values: [row.counterparty] },
    { name: "city", weight: 4, values: [row.city] },
    { name: "state", weight: 4, values: stateValues(row.state) },
    { name: "status", weight: 3, values: statusValues(row.status) },
    { name: "numberKind", weight: 4, values: kindValues(row.numberKind) },
    { name: "techType", weight: 3, values: techValues(row.techType) },
    { name: "sourceName", weight: 2, values: [row.sourceName, row.sourceName2 ?? ""] },
    { name: "summary", weight: 1, values: [row.summary] },
    { name: "country", weight: 1, values: [row.country] },
    { name: "actorKind", weight: 1, values: [row.actorKind ?? ""] },
  ];
}

function quality(value: string, term: string): number {
  const v = norm(value);
  const t = norm(term);
  if (!v || !t) return 0;
  if (v === t) return EXACT;
  if (v.startsWith(t)) return PREFIX;
  if (v.includes(t)) return SUB;
  return 0;
}

function termsOf(query: string): string[] {
  return query
    .trim()
    .split(/\s+/)
    .map((t) => norm(t))
    .filter(Boolean);
}

/**
 * Rank rows for a query. Exact field match beats prefix, prefix beats substring.
 * Project and buyer weigh the most. Every term must match (AND).
 * An empty query returns every row with score 0, in the original order.
 */
export function rankRows<T extends Searchable>(query: string, rows: readonly T[]): Ranked<T>[] {
  const phrase = norm(query);
  if (!phrase) {
    return rows.map((row) => ({ row, score: 0, matchedFields: [] }));
  }
  const terms = termsOf(query);
  const out: { row: T; score: number; matchedFields: string[]; index: number }[] = [];
  rows.forEach((row, index) => {
    const fields = fieldsOf(row);
    const matched = new Set<string>();
    let score = 0;
    for (const term of terms) {
      let best = 0;
      let bestName: string | null = null;
      for (const field of fields) {
        for (const value of field.values) {
          const q = quality(value, term);
          const weighted = q * field.weight;
          if (weighted > best) {
            best = weighted;
            bestName = field.name;
          }
        }
      }
      if (best === 0 || !bestName) return;
      score += best;
      matched.add(bestName);
    }
    for (const field of fields) {
      for (const value of field.values) {
        if (norm(value) === phrase) {
          score += 1000 * field.weight;
          matched.add(field.name);
        }
      }
    }
    out.push({ row, score, matchedFields: [...matched], index });
  });
  out.sort((a, b) => b.score - a.score || a.index - b.index);
  return out.map(({ row, score, matchedFields }) => ({ row, score, matchedFields }));
}
