import type { Commitment, ExcludeReason, NumberKind, Status } from "../types";
import { evidenceFor } from "./evidence.ts";
import { formatBoundPower, formatKindTotal, formatLocation, formatNumberKind, formatPower } from "./format.ts";
import { listsAsActor } from "./actors.ts";
import { firmKindTotals, FIRM_KIND_ORDER } from "./select.ts";
import {
  indexCommitments,
  KIND_PHRASES,
  norm,
  parseStateQuery,
  rowMatchesState,
  type UsState,
} from "./search.ts";
import { STATUS } from "./theme.ts";

export const ASK_FOOTER = "Answered from the rows loaded in this page. No data left your browser.";

export const ASK_EXAMPLES = [
  "who has the on-site generation",
  "which rows are in Texas over 500 MW",
  "what is counted IT load",
  "what is counted grid generation",
  "what is counted new plant contracts",
  "what is counted existing plant contracts",
  "what is counted on-site generation",
  "what is under construction in Ohio",
  "what does Meta have",
  "show Fluidstack",
];

const EXCLUDE_PLAIN: Record<ExcludeReason, string> = {
  mw_null: "no MW on the row",
  unverified: "not verified",
  duplicate: "duplicate of another row",
  plant_capacity_no_buyer: "plant capacity, no buyer named in the source",
  conflict: "conflicts with another figure",
  target_not_firm: "target is not firm",
  restart: "restart in progress",
  status_flip_pending: "status change is still pending",
  remove_candidate: "candidate for removal",
  unverified_construction: "construction is not verified",
};

const STATUS_PHRASES: { phrase: string; status: Status }[] = [
  { phrase: "under construction", status: "construction" },
  { phrase: "in construction", status: "construction" },
  { phrase: "in operation", status: "operational" },
  { phrase: "operational", status: "operational" },
  { phrase: "operating", status: "operational" },
  { phrase: "ppa signed", status: "ppa-signed" },
  { phrase: "permitted", status: "permitted" },
  { phrase: "contracted", status: "contracted" },
  { phrase: "announced", status: "announced" },
  { phrase: "exploratory", status: "exploratory" },
  { phrase: "cancelled", status: "cancelled" },
  { phrase: "canceled", status: "cancelled" },
  { phrase: "construction", status: "construction" },
];

const BUYER_STOP = new Set([
  "what", "does", "have", "show", "rows", "which", "under", "where", "from", "this",
  "that", "with", "over", "above", "more", "than", "least", "below", "less", "counted",
  "count", "total", "much", "plant", "plants", "contract", "contracts", "generation",
  "site", "load", "texas", "ohio", "about", "only", "kind", "kinds",
]);

export interface AskHit {
  id: string;
  buyer: string;
  counterparty: string;
  project: string;
  place: string;
  mwText: string;
  statusLabel: string;
  counted: boolean;
  countTag: string;
  sourceName: string;
  sourceUrl: string;
  sourceName2: string | null;
  sourceUrl2: string | null;
  statusEvidence: string | null;
  mwEvidence: string | null;
}

export interface AskGroup {
  kind: NumberKind;
  heading: string;
  totalMw: number | null;
  totalText: string | null;
  hits: AskHit[];
}

export interface AskResult {
  ok: boolean;
  lead: string;
  separation: string | null;
  groups: AskGroup[];
  footer: string;
}

interface Cmp {
  word: string;
  op: "gt" | "gte" | "lt";
  mw: number;
}

interface Parsed {
  holders: boolean;
  countedOnly: boolean;
  kinds: NumberKind[];
  state: UsState | null;
  status: Status | null;
  buyer: string | null;
  cmp: Cmp | null;
}

function escapeReg(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findKinds(text: string): NumberKind[] {
  let rest = text;
  const found: NumberKind[] = [];
  for (const phrase of KIND_PHRASES) {
    if (rest.includes(phrase.phrase)) {
      found.push(phrase.kind);
      rest = rest.replace(phrase.phrase, " ");
    }
  }
  return [...new Set(found)];
}

function findStatus(text: string): Status | null {
  for (const phrase of STATUS_PHRASES) {
    if (new RegExp(`\\b${escapeReg(phrase.phrase)}\\b`).test(text)) return phrase.status;
  }
  return null;
}

function findBuyer(text: string, rows: readonly Commitment[]): string | null {
  const names = [...new Set(rows.map((r) => r.buyer))].filter(listsAsActor).sort((a, b) => norm(b).length - norm(a).length);
  for (const name of names) {
    const n = norm(name);
    if (n.length < 3) continue;
    if (new RegExp(`\\b${escapeReg(n)}\\b`).test(text)) return name;
  }
  for (const name of names) {
    const head = norm(name).split(" ")[0] ?? "";
    if (head.length < 4 || BUYER_STOP.has(head)) continue;
    if (new RegExp(`\\b${escapeReg(head)}\\b`).test(text)) return name;
  }
  return null;
}

function findComparator(text: string): Cmp | null {
  const re = /\b(more than|less than|at least|over|above|under|below)\s+(\d+(?:\.\d+)?)\s*(gw|mw)?\b/;
  const m = re.exec(text);
  if (!m) return null;
  const word = m[1];
  let mw = Number(m[2]);
  if (m[3] === "gw") mw *= 1000;
  const op: Cmp["op"] =
    word === "at least" ? "gte" : word === "under" || word === "below" || word === "less than" ? "lt" : "gt";
  return { word, op, mw };
}

function passesMw(capacityMW: number | null, cmp: Cmp): boolean {
  if (capacityMW == null || !Number.isFinite(capacityMW)) return false;
  if (cmp.op === "gt") return capacityMW > cmp.mw;
  if (cmp.op === "gte") return capacityMW >= cmp.mw;
  return capacityMW < cmp.mw;
}

function buyerMatches(rowBuyer: string, wanted: string): boolean {
  const a = norm(rowBuyer);
  const b = norm(wanted);
  return a === b || a.startsWith(`${b} `);
}

function parse(question: string, rows: readonly Commitment[]): Parsed | null {
  const text = norm(question);
  if (!text) return null;
  const holders = /\bwho\b/.test(text) && /\b(on site|onsite|behind the meter)\b/.test(text);
  const countedOnly = holders || /\bcounted\b/.test(text) || /\btotal\b/.test(text) || /\bhow much\b/.test(text);
  let kinds = findKinds(text);
  if (holders) kinds = ["btm_gen"];
  const state = parseStateQuery(question);
  const status = findStatus(text);
  const buyer = findBuyer(text, rows);
  const cmp = findComparator(text);
  const parsed: Parsed = { holders, countedOnly, kinds, state, status, buyer, cmp };
  const hasFilter = holders || kinds.length > 0 || state != null || status != null || buyer != null || cmp != null;
  if (!hasFilter) return null;
  if (countedOnly && kinds.length === 0 && !state && !status && !buyer && !cmp) return null;
  return parsed;
}

function leadFor(p: Parsed): string {
  if (p.holders) return "Who holds the on-site generation.";
  if (p.countedOnly && p.kinds.length === 1) {
    return `Counted ${formatNumberKind(p.kinds[0])}.`;
  }
  const bits = ["Matching rows"];
  if (p.status) bits.push(STATUS[p.status].label.toLowerCase());
  if (p.state) bits.push(`in ${p.state.name}`);
  if (p.buyer) bits.push(`for ${p.buyer}`);
  if (p.kinds.length === 1) bits.push(`(${formatNumberKind(p.kinds[0])})`);
  if (p.cmp) bits.push(`${p.cmp.word} ${formatPower(p.cmp.mw)}`);
  return `${bits.join(" ")}.`;
}

function countTag(row: Commitment): string {
  if (row.counts === "yes") return "Counted";
  if (row.excludeReason) return `Not counted: ${EXCLUDE_PLAIN[row.excludeReason]}`;
  return "Not counted";
}

function toHit(row: Commitment): AskHit {
  const ev = row.numberKind === "btm_gen" ? evidenceFor(row) : null;
  return {
    id: row.id,
    buyer: row.buyer,
    counterparty: row.counterparty,
    project: row.project,
    place: formatLocation(row.city, row.state, row.country),
    mwText: formatBoundPower(row.capacityMW, row.bound),
    statusLabel: STATUS[row.status].label,
    counted: row.counts === "yes",
    countTag: countTag(row),
    sourceName: row.sourceName,
    sourceUrl: row.sourceUrl,
    sourceName2: row.sourceName2 ?? null,
    sourceUrl2: row.sourceUrl2 ?? null,
    statusEvidence: ev ? ev.status.mark : null,
    mwEvidence: ev ? ev.mw.mark : null,
  };
}

function kindOrder(kind: NumberKind): number {
  const i = FIRM_KIND_ORDER.indexOf(kind as (typeof FIRM_KIND_ORDER)[number]);
  return i === -1 ? FIRM_KIND_ORDER.length : i;
}

/**
 * Answer a question from the loaded rows only.
 * Per kind totals use counted rows of that one kind. Kinds are never added together.
 */
export function ask(question: string, rows: readonly Commitment[]): AskResult {
  const footer = ASK_FOOTER;
  const folded = norm(question);
  const dollarTalk = /\bdollar|\bbillion|\bspending\b/.test(folded);
  const powerTalk = /\bmegawatt|\bmw\b|\bgw\b/.test(folded);
  if (folded.includes("construction spending") || (dollarTalk && powerTalk)) {
    return {
      ok: true,
      lead: "Construction spending on the Signals tab is in dollars. Those dollars are not megawatts, and this answer does not convert them.",
      separation: null,
      groups: [],
      footer,
    };
  }
  const parsed = parse(question, rows);
  if (!parsed) {
    return {
      ok: false,
      lead: "This helper only answers questions about the rows loaded on this page. Try an example.",
      separation: null,
      groups: [],
      footer,
    };
  }

  const matched = indexCommitments(rows)
    .filter(({ row }) => {
      if (parsed.kinds.length > 0 && !parsed.kinds.includes(row.numberKind)) return false;
      if (parsed.state && !rowMatchesState(row.state, parsed.state)) return false;
      if (parsed.status && row.status !== parsed.status) return false;
      if (parsed.buyer && !buyerMatches(row.buyer, parsed.buyer)) return false;
      if (parsed.cmp && !passesMw(row.capacityMW, parsed.cmp)) return false;
      return true;
    })
    .map(({ row }) => row);

  const listed = parsed.countedOnly ? matched.filter((row) => row.counts === "yes") : matched;
  const showTotal = parsed.countedOnly && parsed.kinds.length === 1;
  const onlyKind = parsed.kinds.length === 1 ? parsed.kinds[0] : null;
  const kindTotal = showTotal && onlyKind ? firmKindTotals(matched).find((k) => k.kind === onlyKind) ?? null : null;

  const byKind = new Map<NumberKind, Commitment[]>();
  for (const row of listed) {
    const list = byKind.get(row.numberKind);
    if (list) list.push(row);
    else byKind.set(row.numberKind, [row]);
  }
  const kinds = [...byKind.keys()].sort((a, b) => kindOrder(a) - kindOrder(b) || a.localeCompare(b));
  const groups: AskGroup[] = kinds.map((kind) => {
    const heading = formatNumberKind(kind) ?? kind;
    const isTotalKind = showTotal && kind === onlyKind && kindTotal != null;
    return {
      kind,
      heading,
      totalMw: isTotalKind ? kindTotal.mw : null,
      totalText: isTotalKind ? formatKindTotal(kindTotal.mw) : null,
      hits: (byKind.get(kind) ?? []).map(toHit),
    };
  });

  const headings = groups.map((g) => g.heading);
  let separation: string | null = null;
  if (groups.length > 1) {
    separation = `Kinds are listed separately: ${headings.join(", ")}. No combined total.`;
  } else if (showTotal && groups[0]) {
    separation = `This total is ${groups[0].heading} only. It is not added to the other kinds.`;
  } else if (groups.length === 1) {
    separation = `${groups[0].heading} is listed on its own. It is not added to the other kinds.`;
  }

  const lead = listed.length === 0 ? `${leadFor(parsed)} No loaded rows match that question.` : leadFor(parsed);

  return { ok: true, lead, separation, groups, footer };
}
