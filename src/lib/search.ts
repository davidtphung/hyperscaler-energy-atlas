import type { Bound, Commitment, CountsFlag, NumberKind, Status, TechType } from "../types";
import { evidenceFor } from "./evidence.ts";
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

export type ChipKey = "kind" | "state" | "counted" | "status" | "basis" | "bound" | "id";

export interface SearchChip {
  key: ChipKey;
  raw: string;
  value: string;
  label: string;
  start: number;
  end: number;
}

export interface ParsedQuery {
  chips: SearchChip[];
  text: string;
}

export interface TextPart {
  text: string;
  hit: boolean;
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
  id?: string;
  sourceName2?: string;
  sourceUrl?: string;
  sourceUrl2?: string;
  actorKind?: string;
  headline?: string;
  counts?: CountsFlag;
  bound?: Bound;
  excludeReason?: string;
  confidence?: string;
  category?: string;
  date?: string;
  parentId?: string;
  capacityMW?: number | null;
  mwBasis?: Commitment["mwBasis"];
  checkedOn?: string;
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

/** Display key for a state. Texas and TX share one key. The stored value is unchanged. */
export function stateKey(raw: string): { key: string; label: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { key: "", label: "Unspecified" };
  const st = US_STATES.find((s) => norm(s.code) === norm(trimmed) || norm(s.name) === norm(trimmed));
  if (st) return { key: st.code, label: st.name };
  return { key: norm(trimmed), label: trimmed };
}

const KIND_ALIAS: Record<string, NumberKind> = {
  it: "it_capacity",
  it_load: "it_capacity",
  itload: "it_capacity",
  it_capacity: "it_capacity",
  grid: "grid_gen_for_dc",
  grid_gen: "grid_gen_for_dc",
  grid_generation: "grid_gen_for_dc",
  grid_gen_for_dc: "grid_gen_for_dc",
  on_site: "btm_gen",
  onsite: "btm_gen",
  btm: "btm_gen",
  btm_gen: "btm_gen",
  behind_the_meter: "btm_gen",
  new: "offtake_new",
  new_plant: "offtake_new",
  new_plants: "offtake_new",
  offtake_new: "offtake_new",
  existing: "offtake_existing",
  existing_plant: "offtake_existing",
  offtake_existing: "offtake_existing",
  utility: "utility_load",
  utility_load: "utility_load",
  program: "program",
  equipment: "equipment_supply",
  equipment_supply: "equipment_supply",
  storage: "storage",
  unresolved: "unresolved",
};

const STATUS_ALIAS: Record<string, Status> = {
  operational: "operational",
  operating: "operational",
  operation: "operational",
  construction: "construction",
  under_construction: "construction",
  permitted: "permitted",
  contracted: "contracted",
  ppa_signed: "ppa-signed",
  ppa: "ppa-signed",
  announced: "announced",
  exploratory: "exploratory",
  cancelled: "cancelled",
  canceled: "cancelled",
};

const BOUND_ALIAS: Record<string, Bound> = {
  exact: "exact",
  approx: "approx_filing",
  approx_filing: "approx_filing",
  approximate: "approx_filing",
  up_to: "up_to",
  upto: "up_to",
  at_least: "at_least",
  atleast: "at_least",
};

function tokenKey(raw: string): string {
  return raw.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function makeChip(key: string, raw: string): Omit<SearchChip, "start" | "end"> | null {
  const k = key.toLowerCase() as ChipKey;
  if (k === "kind") {
    const kind = KIND_ALIAS[tokenKey(raw)];
    if (!kind) return null;
    return { key: k, raw, value: kind, label: `Kind: ${formatNumberKind(kind)}` };
  }
  if (k === "state") {
    const st = stateKey(raw);
    if (!st.key) return null;
    return { key: k, raw, value: st.key, label: `State: ${st.label}` };
  }
  if (k === "counted") {
    const v = raw.trim().toLowerCase();
    const yes = v === "yes" || v === "y" || v === "true" || v === "counted";
    const no = v === "no" || v === "n" || v === "false" || v === "not";
    if (!yes && !no) return null;
    return { key: k, raw, value: yes ? "yes" : "no", label: yes ? "Counted: yes" : "Counted: no" };
  }
  if (k === "status") {
    const status = STATUS_ALIAS[tokenKey(raw)];
    if (!status) return null;
    return { key: k, raw, value: status, label: `Status: ${STATUS[status].label}` };
  }
  if (k === "bound") {
    const bound = BOUND_ALIAS[tokenKey(raw)];
    if (!bound) return null;
    return { key: k, raw, value: bound, label: `Figure: ${bound}` };
  }
  if (k === "id") {
    const value = raw.trim().toLowerCase();
    if (!value) return null;
    return { key: k, raw, value, label: `Id: ${raw.trim()}` };
  }
  if (k === "basis") {
    const value = tokenKey(raw);
    if (!value) return null;
    return { key: k, raw, value, label: `Basis: ${raw.trim()}` };
  }
  return null;
}

/** Pull kind:on_site, state:OH, counted:yes and the other field chips out of a query. */
export function parseSearchQuery(query: string): ParsedQuery {
  const re = /(^|\s)(kind|state|counted|status|basis|bound|id):([^\s]+)/gi;
  const chips: SearchChip[] = [];
  const cuts: [number, number][] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(query))) {
    const lead = match[1] ?? "";
    const chip = makeChip(match[2] ?? "", match[3] ?? "");
    if (!chip) continue;
    const start = match.index + lead.length;
    const end = match.index + match[0].length;
    chips.push({ ...chip, start, end });
    cuts.push([start, end]);
  }
  let text = query;
  for (let i = cuts.length - 1; i >= 0; i--) {
    const [start, end] = cuts[i];
    text = `${text.slice(0, start)} ${text.slice(end)}`;
  }
  return { chips, text: text.replace(/\s+/g, " ").trim() };
}

export function withoutChip(query: string, chip: SearchChip): string {
  const next = `${query.slice(0, chip.start)} ${query.slice(chip.end)}`;
  return next.replace(/\s+/g, " ").trim();
}

function basisKey(row: Searchable): string {
  if (row.mwBasis === "it_load") return "it_load";
  if (row.mwBasis === "facility_power") return "facility_power";
  return "not_recorded";
}

function chipHits(row: Searchable, chip: SearchChip): boolean {
  if (chip.key === "kind") return row.numberKind === chip.value;
  if (chip.key === "state") return stateKey(row.state).key === chip.value;
  if (chip.key === "counted") return row.counts === chip.value;
  if (chip.key === "status") return row.status === chip.value;
  if (chip.key === "bound") return row.bound === chip.value;
  if (chip.key === "id") return (row.id ?? "").toLowerCase().includes(chip.value);
  if (chip.key === "basis") return basisKey(row) === chip.value || (chip.value === "unknown" && basisKey(row) === "not_recorded");
  return false;
}

/** Same key is OR. Different keys are AND. */
export function chipsMatch(row: Searchable, chips: readonly SearchChip[]): boolean {
  const groups = new Map<ChipKey, SearchChip[]>();
  for (const chip of chips) {
    const list = groups.get(chip.key);
    if (list) list.push(chip);
    else groups.set(chip.key, [chip]);
  }
  for (const list of groups.values()) {
    if (!list.some((chip) => chipHits(row, chip))) return false;
  }
  return true;
}

export function sourceDomain(url: string | undefined): string {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
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
  const evidence =
    row.id != null
      ? evidenceFor({ id: row.id, counts: row.counts ?? "no", capacityMW: row.capacityMW ?? null })
      : null;
  const domains = [sourceDomain(row.sourceUrl), sourceDomain(row.sourceUrl2)].filter(Boolean);
  return [
    { name: "project", weight: 10, values: [row.project, row.headline ?? ""] },
    { name: "buyer", weight: 10, values: [row.buyer] },
    { name: "counterparty", weight: 4, values: [row.counterparty] },
    { name: "city", weight: 4, values: [row.city] },
    { name: "state", weight: 4, values: stateValues(row.state) },
    { name: "status", weight: 3, values: statusValues(row.status) },
    { name: "numberKind", weight: 4, values: kindValues(row.numberKind) },
    { name: "techType", weight: 3, values: techValues(row.techType) },
    { name: "sourceName", weight: 2, values: [row.sourceName, row.sourceName2 ?? ""] },
    { name: "sourceUrl", weight: 2, values: [row.sourceUrl ?? "", row.sourceUrl2 ?? "", ...domains] },
    { name: "summary", weight: 1, values: [row.summary] },
    { name: "country", weight: 1, values: [row.country] },
    { name: "actorKind", weight: 1, values: [row.actorKind ?? ""] },
    { name: "id", weight: 2, values: [row.id ?? ""] },
    { name: "counts", weight: 2, values: [row.counts ?? "", row.counts === "yes" ? "counted" : "not counted"] },
    { name: "bound", weight: 2, values: [row.bound ?? ""] },
    { name: "basis", weight: 1, values: [row.mwBasis ?? ""] },
    { name: "evidence", weight: 2, values: evidence ? [evidence.status.mark, evidence.mw.mark, evidence.status.reason, evidence.mw.reason] : [] },
    { name: "excludeReason", weight: 1, values: [row.excludeReason ?? ""] },
    { name: "confidence", weight: 1, values: [row.confidence ?? ""] },
    { name: "category", weight: 1, values: [row.category ?? ""] },
    { name: "date", weight: 1, values: [row.date ?? "", row.checkedOn ?? ""] },
    { name: "parentId", weight: 1, values: [row.parentId ?? ""] },
  ];
}

export interface IndexedRow<T> {
  row: T;
  fields: FieldBag[];
}

/** Shared field index for ranked search and Ask the Atlas. */
export function indexCommitments<T extends Searchable>(rows: readonly T[]): IndexedRow<T>[] {
  return rows.map((row) => ({ row, fields: fieldsOf(row) }));
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

export function queryTerms(query: string): string[] {
  return termsOf(parseSearchQuery(query).text);
}

/** A short slice of a matched field that is not already shown on the result row. */
export function matchSnippet(row: Searchable, terms: readonly string[], matchedFields: readonly string[]): string {
  const needles = terms.map((term) => term.toLowerCase()).filter((term) => term.length >= 2);
  if (needles.length === 0) return "";
  const visible = `${row.project} ${row.buyer} ${row.state} ${row.city}`.toLowerCase();
  if (needles.every((needle) => visible.includes(needle))) return "";
  const shown = new Set([row.project, row.buyer, row.state, row.city].filter(Boolean).map((value) => value.toLowerCase()));
  const fields = fieldsOf(row).filter((field) => matchedFields.includes(field.name));
  for (const field of fields) {
    for (const value of field.values) {
      if (!value || shown.has(value.toLowerCase())) continue;
      if (value === row.numberKind) continue;
      if (!value.includes(" ") && value.length < 24) continue;
      const lower = value.toLowerCase();
      let at = -1;
      for (const needle of needles) {
        const found = lower.indexOf(needle);
        if (found >= 0 && (at < 0 || found < at)) at = found;
      }
      if (at < 0) continue;
      const start = Math.max(0, at - 28);
      const end = Math.min(value.length, at + 52);
      const lead = start > 0 ? "..." : "";
      const tail = end < value.length ? "..." : "";
      return `${lead}${value.slice(start, end).trim()}${tail}`;
    }
  }
  return "";
}

/** Case-insensitive highlight spans for the free-text part of a query. */
export function highlightParts(text: string, terms: readonly string[]): TextPart[] {
  if (!text) return [{ text: "", hit: false }];
  if (terms.length === 0) return [{ text, hit: false }];
  const lower = text.toLowerCase();
  const ranges: [number, number][] = [];
  for (const term of terms) {
    const needle = term.toLowerCase();
    if (needle.length < 2) continue;
    let from = 0;
    while (from < lower.length) {
      const at = lower.indexOf(needle, from);
      if (at < 0) break;
      ranges.push([at, at + needle.length]);
      from = at + needle.length;
    }
  }
  if (ranges.length === 0) return [{ text, hit: false }];
  ranges.sort((a, b) => a[0] - b[0] || b[1] - a[1]);
  const merged: [number, number][] = [];
  for (const range of ranges) {
    const last = merged[merged.length - 1];
    if (!last || range[0] > last[1]) merged.push([range[0], range[1]]);
    else last[1] = Math.max(last[1], range[1]);
  }
  const parts: TextPart[] = [];
  let cursor = 0;
  for (const [start, end] of merged) {
    if (start > cursor) parts.push({ text: text.slice(cursor, start), hit: false });
    parts.push({ text: text.slice(start, end), hit: true });
    cursor = end;
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor), hit: false });
  return parts;
}

/**
 * Rank rows for a query. Exact field match beats prefix, prefix beats substring.
 * Project and buyer weigh the most. Every free-text term must match (AND).
 * Field chips (kind:, state:, counted:, and the rest) filter before ranking.
 * An empty query returns every row with score 0, in the original order.
 */
export function rankRows<T extends Searchable>(query: string, rows: readonly T[]): Ranked<T>[] {
  const parsed = parseSearchQuery(query);
  const phrase = norm(parsed.text);
  if (!phrase && parsed.chips.length === 0) {
    return rows.map((row) => ({ row, score: 0, matchedFields: [] }));
  }
  const terms = termsOf(parsed.text);
  const indexed = indexCommitments(rows);
  const out: { row: T; score: number; matchedFields: string[]; index: number }[] = [];
  indexed.forEach((doc, index) => {
    if (!chipsMatch(doc.row, parsed.chips)) return;
    const matched = new Set<string>(parsed.chips.map((chip) => chip.key));
    if (!phrase) {
      out.push({ row: doc.row, score: 1, matchedFields: [...matched], index });
      return;
    }
    let score = 0;
    for (const term of terms) {
      let best = 0;
      let bestName: string | null = null;
      for (const field of doc.fields) {
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
    for (const field of doc.fields) {
      for (const value of field.values) {
        if (norm(value) === phrase) {
          score += 1000 * field.weight;
          matched.add(field.name);
        }
      }
    }
    out.push({ row: doc.row, score, matchedFields: [...matched], index });
  });
  out.sort((a, b) => b.score - a.score || a.index - b.index);
  return out.map(({ row, score, matchedFields }) => ({ row, score, matchedFields }));
}
