import type { NumberKind } from "../types";
import { firmKindTotals } from "./select.ts";

export const POLY_TAG_ID = "104967";
export const POLY_PAGE = "https://polymarket.com/tech/compute";
export const POLY_KEYSET = "https://gamma-api.polymarket.com/events/keyset";

export const VAST_PAGE = "https://vast.ai/";
export const VAST_API = "https://console.vast.ai/api/v0/bundles/";
export const RUNPOD_PAGE = "https://www.runpod.io/";
export const RUNPOD_API = "https://api.runpod.io/graphql";
export const SF_HOME = "https://autoresearch.sfcompute.com/";
export const SF_CHANGELOG = "https://autoresearch.sfcompute.com/changelog";

export const DROPPED_SOURCES: { name: string; url: string; reason: string }[] = [
  {
    name: "SF Compute order book",
    url: "https://api.sfcompute.com/preview/v2/orderbook/quote",
    reason: "The quote endpoint requires a bearer token. This page does not use a key, so it shows no order book price.",
  },
  {
    name: "sfcompute.com pricing",
    url: "https://sfcompute.com/pricing",
    reason: "That path redirects to a login page. List prices on this page come from the public Autoresearch site.",
  },
];

export interface PolyMarket {
  id: string;
  eventTitle: string;
  eventSlug: string;
  question: string;
  outcome: string;
  probability: number;
  volumeUsd: number | null;
  endDate: string | null;
  url: string;
}

export interface VastOffer {
  gpuName: string;
  offerId: number | null;
  usdPerHour: number | null;
  vramMb: number | null;
  place: string | null;
}

export interface RunpodOffer {
  id: string;
  name: string;
  memoryGb: number | null;
  secureUsdPerHour: number | null;
  communityUsdPerHour: number | null;
}

export interface SfTableRow {
  item: string;
  rateText: string;
  usdPerHour: number | null;
  hourSource: "stated" | "calculated" | "none";
}

export interface SfChangelog {
  title: string;
  statement: string;
  iso: string;
  url: string;
}

export interface SfSample {
  rateText: string;
  context: string;
}

export interface SnapshotSection {
  status: "ok" | "error";
  stale: boolean;
  asOf: string | null;
  error: string | null;
}

export interface ComputeSnapshot {
  fetchedAt: string;
  polymarket: SnapshotSection & {
    sourceUrl: string;
    pageUrl: string;
    markets: PolyMarket[];
  };
  vast: SnapshotSection & {
    sourceUrl: string;
    pageUrl: string;
    note: string;
    rows: VastOffer[];
  };
  runpod: SnapshotSection & {
    sourceUrl: string;
    pageUrl: string;
    note: string;
    rows: RunpodOffer[];
  };
  sfcompute: SnapshotSection & {
    homeUrl: string;
    changelogUrl: string;
    note: string;
    conflict: boolean;
    table: SfTableRow[];
    changelog: SfChangelog | null;
    sample: SfSample | null;
  };
  dropped: { name: string; url: string; reason: string }[];
}

export interface TieRow {
  kind: NumberKind;
  layer: string;
  node: string;
  note: string;
  rows: number;
  mw: number;
  approx: boolean;
}

const TIE: { kind: NumberKind; layer: string; node: string; note: string }[] = [
  {
    kind: "it_capacity",
    layer: "IT capacity",
    node: "IT load",
    note: "Counted data center IT. This is not generation.",
  },
  {
    kind: "grid_gen_for_dc",
    layer: "Power",
    node: "Generation",
    note: "Grid generation tied to a data center. This is not IT load.",
  },
  {
    kind: "btm_gen",
    layer: "Power",
    node: "Behind the meter",
    note: "On-site generation. This is not the grid connection.",
  },
  {
    kind: "offtake_new",
    layer: "Power",
    node: "New-plant contracts",
    note: "Contracts for plants that were not yet operating. This is not IT load.",
  },
  {
    kind: "offtake_existing",
    layer: "Power",
    node: "Existing-plant contracts",
    note: "Contracts for plants that already existed. This is not new generation.",
  },
];

export function hypergridTie(rows: Parameters<typeof firmKindTotals>[0]): TieRow[] {
  const totals = firmKindTotals(rows);
  return TIE.map((item) => {
    const total = totals.find((row) => row.kind === item.kind);
    if (!total) throw new Error(`missing kind ${item.kind}`);
    return { ...item, rows: total.rows, mw: total.mw, approx: total.approx };
  });
}

export function polymarketKeysetUrl(afterCursor?: string | null): string {
  const url = new URL(POLY_KEYSET);
  url.searchParams.set("tag_id", POLY_TAG_ID);
  url.searchParams.set("closed", "false");
  url.searchParams.set("limit", "40");
  url.searchParams.set("order", "volume");
  url.searchParams.set("ascending", "false");
  if (afterCursor) url.searchParams.set("after_cursor", afterCursor);
  return url.toString();
}

export function publicDataUrl(file: string): string {
  const base = typeof document === "undefined" ? "https://hypergrid.davidtphung.com/" : document.baseURI;
  return new URL(file, base).toString();
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function parseJsonArray(value: unknown): unknown[] | null {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function yesOutcome(market: Record<string, unknown>): { outcome: string; probability: number } | null {
  const outcomes = parseJsonArray(market.outcomes);
  const prices = parseJsonArray(market.outcomePrices);
  if (!outcomes || !prices) return null;
  const yesAt = outcomes.findIndex((item) => asString(item).toLowerCase() === "yes");
  const index = yesAt >= 0 ? yesAt : 0;
  const outcome = asString(outcomes[index]);
  const probability = asNumber(prices[index]);
  if (!outcome || probability == null || probability < 0 || probability > 1) return null;
  return { outcome, probability };
}

export function parsePolymarketPayload(data: unknown): { markets: PolyMarket[]; nextCursor: string | null } {
  const record = asRecord(data);
  const events = Array.isArray(data) ? data : record && Array.isArray(record.events) ? record.events : [];
  const nextCursor = record ? asString(record.next_cursor) || null : null;
  const markets: PolyMarket[] = [];
  for (const eventValue of events) {
    const event = asRecord(eventValue);
    if (!event) continue;
    const eventSlug = asString(event.slug);
    const eventTitle = asString(event.title) || eventSlug || "Untitled event";
    const eventEnd = asString(event.endDate) || null;
    const eventMarkets = Array.isArray(event.markets) ? event.markets : [];
    for (const marketValue of eventMarkets) {
      const market = asRecord(marketValue);
      if (!market) continue;
      const priced = yesOutcome(market);
      const question = asString(market.question);
      if (!priced || !question) continue;
      const volume = asNumber(market.volumeNum) ?? asNumber(market.volume);
      const id = asString(market.id) || `${eventSlug}:${question}`;
      markets.push({
        id,
        eventTitle,
        eventSlug,
        question,
        outcome: priced.outcome,
        probability: priced.probability,
        volumeUsd: volume,
        endDate: asString(market.endDate) || eventEnd,
        url: eventSlug ? `https://polymarket.com/event/${eventSlug}` : POLY_PAGE,
      });
    }
  }
  return { markets, nextCursor };
}

const SF_ROW = /role="cell" class="text-foreground">([^<]+)<\/td><td role="cell" class="ln-num">([^<]+)<\/td>/g;

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function hourOf(rateText: string): { usdPerHour: number | null; hourSource: SfTableRow["hourSource"] } {
  const stated = rateText.match(/\(\$([0-9]+(?:\.[0-9]+)?)\/hr\)/);
  if (stated) return { usdPerHour: Number(stated[1]), hourSource: "stated" };
  const perMinute = rateText.match(/^\$([0-9]+(?:\.[0-9]+)?)\/min(?: per GPU)?$/);
  if (perMinute) {
    const perHour = Number(perMinute[1]) * 60;
    return { usdPerHour: Math.round(perHour * 10000) / 10000, hourSource: "calculated" };
  }
  return { usdPerHour: null, hourSource: "none" };
}

export function parseSfTable(html: string): SfTableRow[] {
  const rows: SfTableRow[] = [];
  const seen = new Set<string>();
  for (const match of html.matchAll(SF_ROW)) {
    const item = decodeHtml(match[1]).trim();
    const rateText = decodeHtml(match[2]).trim();
    if (!item || !rateText || seen.has(`${item}|${rateText}`)) continue;
    seen.add(`${item}|${rateText}`);
    rows.push({ item, rateText, ...hourOf(rateText) });
  }
  return rows;
}

export function parseSfChangelog(html: string): SfChangelog | null {
  const block = html.match(/id="h100-price-october-2026"[\s\S]{0,1800}?<\/div>/);
  if (!block) return null;
  const titleMatch = block[0].match(/>([^<]*\$5\.04 per GPU-hour)<\/a>/);
  const statementMatch = block[0].match(
    /On October 8 at 00:00 Pacific time, the H100 list price changed from \$[0-9.]+ to \$[0-9.]+ per GPU-hour\.[\s\S]*?<\/p>/,
  );
  if (!statementMatch) return null;
  const statement = decodeHtml(statementMatch[0].replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
  const isoMatch = html.match(/dateTime="(2026-10-08T07:00:00Z)"/);
  return {
    title: titleMatch ? decodeHtml(titleMatch[1]) : "H100 list price change",
    statement,
    iso: isoMatch?.[1] ?? "2026-10-08T07:00:00Z",
    url: "https://autoresearch.sfcompute.com/changelog/h100-price-october-2026",
  };
}

export function parseSfSample(html: string): SfSample | null {
  const match = html.match(/chip h100[\s\S]{0,900}?\$([0-9]+(?:\.[0-9]+)?)\/min/);
  if (!match) return null;
  return {
    rateText: `$${match[1]}/min`,
    context: "The homepage sample prints this rate beside an H100 create command.",
  };
}

export function sfConflict(table: SfTableRow[], changelog: SfChangelog | null): boolean {
  if (!changelog) return false;
  const row = table.find((item) => item.item === "h100-1");
  const change = changelog.statement.match(/changed from \$([0-9.]+) to \$([0-9.]+) per GPU-hour/);
  if (!row || row.usdPerHour == null || !change) return false;
  return row.usdPerHour !== Number(change[2]);
}

function finiteOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function isPolyMarket(value: unknown): value is PolyMarket {
  const row = asRecord(value);
  if (!row) return false;
  return (
    typeof row.id === "string" &&
    typeof row.question === "string" &&
    typeof row.outcome === "string" &&
    typeof row.probability === "number" &&
    row.probability >= 0 &&
    row.probability <= 1 &&
    (row.volumeUsd == null || (typeof row.volumeUsd === "number" && Number.isFinite(row.volumeUsd))) &&
    typeof row.url === "string"
  );
}

export function readSnapshot(data: unknown): ComputeSnapshot | null {
  const row = asRecord(data);
  if (!row) return null;
  const polymarket = asRecord(row.polymarket);
  const vast = asRecord(row.vast);
  const runpod = asRecord(row.runpod);
  const sfcompute = asRecord(row.sfcompute);
  if (!polymarket || !vast || !runpod || !sfcompute) return null;
  if (!Array.isArray(polymarket.markets) || !polymarket.markets.every(isPolyMarket)) return null;
  if (!Array.isArray(vast.rows) || !Array.isArray(runpod.rows) || !Array.isArray(sfcompute.table)) return null;
  for (const offer of vast.rows) {
    const item = asRecord(offer);
    if (!item || typeof item.gpuName !== "string") return null;
    if (item.usdPerHour != null && (typeof item.usdPerHour !== "number" || item.usdPerHour <= 0)) return null;
  }
  for (const offer of runpod.rows) {
    const item = asRecord(offer);
    if (!item || typeof item.name !== "string") return null;
    for (const key of ["secureUsdPerHour", "communityUsdPerHour"] as const) {
      const price = item[key];
      if (price != null && (typeof price !== "number" || price <= 0)) return null;
    }
  }
  return data as ComputeSnapshot;
}

export function listedPrice(value: unknown): number | null {
  const price = finiteOrNull(value);
  if (price == null || price <= 0) return null;
  return price;
}

export function formatChance(probability: number): string {
  const pct = Math.round(probability * 10000) / 100;
  if (Number.isInteger(pct)) return `${pct}%`;
  return `${pct.toFixed(2).replace(/0$/, "")}%`;
}

export function formatVolume(usd: number): string {
  return usd.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: usd >= 100 ? 0 : 2,
  });
}

export function formatHourly(usd: number): string {
  const digits = Math.abs(usd) >= 100 ? 2 : 4;
  const text = usd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: digits });
  return `$${text} per hour`;
}

export function formatVramMb(mb: number): string {
  const gb = mb / 1024;
  const gbText = gb >= 10 ? String(Math.round(gb)) : gb.toFixed(1).replace(/\.0$/, "");
  return `${mb.toLocaleString("en-US")} MB reported (${gbText} GB)`;
}

export function formatPacific(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "time unavailable";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

export type EvidenceLabel = "FACT" | "ESTIMATE" | "CLAIM";

export interface DataRecord {
  source: string;
  url: string;
  fetched_at: string;
  value: number;
  unit: string;
  label: EvidenceLabel;
  stale: boolean;
  stale_age_seconds: number | null;
  key: string;
  name: string;
  detail: string | null;
  group: string | null;
  outcome: string | null;
  volume_usd: number | null;
  end_date: string | null;
  vram_mb: number | null;
  place: string | null;
  offer_id: number | null;
  memory_gb: number | null;
  rate_text: string | null;
  price_kind: string | null;
}

export interface DataGap {
  source: string;
  url: string;
  name: string;
  reason: string;
}

export interface SourceNote {
  source: string;
  mode: "api" | "scrape" | "dropped";
  url: string;
  note: string;
}

export interface LatestFile {
  fetched_at: string;
  records: DataRecord[];
  gaps: DataGap[];
  dropped: { source: string; url: string; reason: string }[];
  sources: SourceNote[];
}

export interface HistoryFile {
  date: string;
  runs: { fetched_at: string; records: DataRecord[] }[];
}

const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
const LABELS = new Set<EvidenceLabel>(["FACT", "ESTIMATE", "CLAIM"]);

export function robotsAllows(body: string, pathname: string): boolean {
  const lines = body.split(/\r?\n/);
  let inStar = false;
  const rules: { allow: boolean; path: string }[] = [];
  for (const raw of lines) {
    const line = raw.replace(/#.*$/, "").trim();
    if (!line) continue;
    const match = line.match(/^(user-agent|allow|disallow)\s*:\s*(.*)$/i);
    if (!match) continue;
    const key = match[1].toLowerCase();
    const value = match[2].trim();
    if (key === "user-agent") {
      inStar = value === "*";
      continue;
    }
    if (!inStar || !value) continue;
    rules.push({ allow: key === "allow", path: value });
  }
  let best: { allow: boolean; length: number } | null = null;
  for (const rule of rules) {
    if (!pathname.startsWith(rule.path)) continue;
    if (!best || rule.path.length > best.length) best = { allow: rule.allow, length: rule.path.length };
  }
  return best ? best.allow : true;
}

function record(input: DataRecord): DataRecord {
  return { ...input };
}

export function polymarketRecords(markets: PolyMarket[], fetchedAt: string): DataRecord[] {
  return markets.map((market) =>
    record({
      source: "Polymarket",
      url: market.url,
      fetched_at: fetchedAt,
      value: market.probability,
      unit: "implied probability",
      label: "CLAIM",
      stale: false,
      stale_age_seconds: null,
      key: `polymarket|${market.id}`,
      name: market.question,
      detail: null,
      group: market.eventTitle,
      outcome: market.outcome,
      volume_usd: market.volumeUsd,
      end_date: market.endDate,
      vram_mb: null,
      place: null,
      offer_id: null,
      memory_gb: null,
      rate_text: null,
      price_kind: null,
    }),
  );
}

export function vastRecords(rows: VastOffer[], fetchedAt: string): { records: DataRecord[]; gaps: DataGap[] } {
  const records: DataRecord[] = [];
  const gaps: DataGap[] = [];
  for (const row of rows) {
    if (row.usdPerHour == null) {
      gaps.push({
        source: "Vast.ai",
        url: VAST_PAGE,
        name: row.gpuName,
        reason: "No rentable one-GPU on-demand offer came back.",
      });
      continue;
    }
    records.push(
      record({
        source: "Vast.ai",
        url: VAST_PAGE,
        fetched_at: fetchedAt,
        value: row.usdPerHour,
        unit: "USD per hour",
        label: "FACT",
        stale: false,
        stale_age_seconds: null,
        key: `vast|${row.gpuName}|USD per hour`,
        name: row.gpuName,
        detail: "Lowest posted on-demand ask for one whole GPU. Not a cleared trade.",
        group: null,
        outcome: null,
        volume_usd: null,
        end_date: null,
        vram_mb: row.vramMb,
        place: row.place,
        offer_id: row.offerId,
        memory_gb: null,
        rate_text: null,
        price_kind: null,
      }),
    );
  }
  return { records, gaps };
}

export function runpodRecords(rows: RunpodOffer[], fetchedAt: string): { records: DataRecord[]; gaps: DataGap[] } {
  const records: DataRecord[] = [];
  const gaps: DataGap[] = [];
  for (const row of rows) {
    if (row.secureUsdPerHour == null && row.communityUsdPerHour == null) {
      gaps.push({
        source: "RunPod",
        url: RUNPOD_PAGE,
        name: row.name,
        reason: "This name is not listed with a price above zero.",
      });
      continue;
    }
    const kinds: { kind: string; value: number | null }[] = [
      { kind: "secure", value: row.secureUsdPerHour },
      { kind: "community", value: row.communityUsdPerHour },
    ];
    for (const kind of kinds) {
      if (kind.value == null) continue;
      records.push(
        record({
          source: "RunPod",
          url: RUNPOD_PAGE,
          fetched_at: fetchedAt,
          value: kind.value,
          unit: "USD per hour",
          label: "FACT",
          stale: false,
          stale_age_seconds: null,
          key: `runpod|${row.id}|${kind.kind}`,
          name: row.name,
          detail: "Posted catalog price. A zero from the feed is omitted.",
          group: null,
          outcome: null,
          volume_usd: null,
          end_date: null,
          vram_mb: null,
          place: null,
          offer_id: null,
          memory_gb: row.memoryGb,
          rate_text: null,
          price_kind: kind.kind,
        }),
      );
    }
  }
  return { records, gaps };
}

export function sfRecords(
  table: SfTableRow[],
  changelog: SfChangelog | null,
  sample: SfSample | null,
  fetchedAt: string,
): { records: DataRecord[]; gaps: DataGap[] } {
  const records: DataRecord[] = [];
  const gaps: DataGap[] = [];
  for (const row of table) {
    if (row.hourSource === "stated" && row.usdPerHour != null) {
      records.push(
        record({
          source: "SF Compute Autoresearch",
          url: SF_HOME,
          fetched_at: fetchedAt,
          value: row.usdPerHour,
          unit: "USD per hour",
          label: "FACT",
          stale: false,
          stale_age_seconds: null,
          key: `sf|${row.item}|USD per hour`,
          name: row.item,
          detail: "Hourly price printed on the public pricing table.",
          group: null,
          outcome: null,
          volume_usd: null,
          end_date: null,
          vram_mb: null,
          place: null,
          offer_id: null,
          memory_gb: null,
          rate_text: row.rateText,
          price_kind: null,
        }),
      );
      continue;
    }
    const perMinute = row.rateText.match(/^\$([0-9]+(?:\.[0-9]+)?)\/min/);
    if (!perMinute) {
      gaps.push({
        source: "SF Compute Autoresearch",
        url: SF_HOME,
        name: row.item,
        reason: "The table row did not include a single posted number.",
      });
      continue;
    }
    records.push(
      record({
        source: "SF Compute Autoresearch",
        url: SF_HOME,
        fetched_at: fetchedAt,
        value: Number(perMinute[1]),
        unit: "USD per minute",
        label: "FACT",
        stale: false,
        stale_age_seconds: null,
        key: `sf|${row.item}|USD per minute`,
        name: row.item,
        detail: "Per-minute price printed on the public pricing table.",
        group: null,
        outcome: null,
        volume_usd: null,
        end_date: null,
        vram_mb: null,
        place: null,
        offer_id: null,
        memory_gb: null,
        rate_text: row.rateText,
        price_kind: null,
      }),
    );
  }
  if (changelog) {
    const next = changelog.statement.match(/to \$([0-9]+(?:\.[0-9]+)?) per GPU-hour/);
    if (next) {
      records.push(
        record({
          source: "SF Compute changelog",
          url: changelog.url,
          fetched_at: fetchedAt,
          value: Number(next[1]),
          unit: "USD per GPU-hour",
          label: "FACT",
          stale: false,
          stale_age_seconds: null,
          key: "sf|changelog|h100",
          name: changelog.title,
          detail: changelog.statement,
          group: null,
          outcome: null,
          volume_usd: null,
          end_date: changelog.iso,
          vram_mb: null,
          place: null,
          offer_id: null,
          memory_gb: null,
          rate_text: null,
          price_kind: null,
        }),
      );
    }
  }
  if (sample) {
    const rate = sample.rateText.match(/^\$([0-9]+(?:\.[0-9]+)?)\/min$/);
    if (rate) {
      records.push(
        record({
          source: "SF Compute homepage sample",
          url: SF_HOME,
          fetched_at: fetchedAt,
          value: Number(rate[1]),
          unit: "USD per minute",
          label: "FACT",
          stale: false,
          stale_age_seconds: null,
          key: "sf|sample|h100",
          name: "Homepage H100 sample",
          detail: sample.context,
          group: null,
          outcome: null,
          volume_usd: null,
          end_date: null,
          vram_mb: null,
          place: null,
          offer_id: null,
          memory_gb: null,
          rate_text: sample.rateText,
          price_kind: null,
        }),
      );
    }
  }
  return { records, gaps };
}

export function markStale(records: DataRecord[], nowIso: string): DataRecord[] {
  const now = Date.parse(nowIso);
  return records.map((row) => ({
    ...row,
    stale: true,
    stale_age_seconds: Number.isNaN(now) ? row.stale_age_seconds : Math.max(0, Math.round((now - Date.parse(row.fetched_at)) / 1000)),
  }));
}

function problemsInRecord(row: DataRecord, index: number): string[] {
  const problems: string[] = [];
  const where = `record ${index}`;
  if (!row.source) problems.push(`${where} missing source`);
  if (!row.url || !/^https:\/\//.test(row.url)) problems.push(`${where} missing https url`);
  if (!ISO_UTC.test(row.fetched_at) || Number.isNaN(Date.parse(row.fetched_at))) problems.push(`${where} bad fetched_at`);
  if (typeof row.value !== "number" || !Number.isFinite(row.value)) problems.push(`${where} value is not a finite number`);
  if (!row.unit) problems.push(`${where} missing unit`);
  if (!LABELS.has(row.label)) problems.push(`${where} bad label`);
  if (typeof row.stale !== "boolean") problems.push(`${where} stale flag missing`);
  if (row.stale) {
    if (typeof row.stale_age_seconds !== "number" || row.stale_age_seconds < 0) problems.push(`${where} stale age missing`);
  } else if (row.stale_age_seconds !== null) {
    problems.push(`${where} fresh row has an age`);
  }
  if (!row.key || !row.name) problems.push(`${where} missing key or name`);
  return problems;
}

export function validateLatest(data: unknown): LatestFile {
  const row = asRecord(data);
  if (!row) throw new Error("latest.json is not an object");
  if (typeof row.fetched_at !== "string" || !ISO_UTC.test(row.fetched_at)) throw new Error("latest.json fetched_at is not UTC ISO");
  if (!Array.isArray(row.records) || !Array.isArray(row.gaps) || !Array.isArray(row.dropped) || !Array.isArray(row.sources)) {
    throw new Error("latest.json is missing records, gaps, dropped, or sources");
  }
  const problems = row.records.flatMap((item, index) => problemsInRecord(item as DataRecord, index));
  if (problems.length) throw new Error(problems.slice(0, 8).join("; "));
  const keys = new Set<string>();
  for (const item of row.records as DataRecord[]) {
    if (keys.has(item.key)) throw new Error(`duplicate record key ${item.key}`);
    keys.add(item.key);
  }
  return data as LatestFile;
}

export function validateHistory(data: unknown): HistoryFile {
  const row = asRecord(data);
  if (!row || typeof row.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(row.date)) throw new Error("history date is invalid");
  if (!Array.isArray(row.runs) || row.runs.length === 0) throw new Error("history has no runs");
  for (const run of row.runs) {
    const item = asRecord(run);
    if (!item || typeof item.fetched_at !== "string" || !item.fetched_at.startsWith(row.date)) {
      throw new Error("history run is outside its file date");
    }
    if (!Array.isArray(item.records)) throw new Error("history run has no records");
    const problems = item.records.flatMap((recordRow, index) => problemsInRecord(recordRow as DataRecord, index));
    if (problems.length) throw new Error(problems.slice(0, 8).join("; "));
  }
  return data as HistoryFile;
}

export function readLatest(data: unknown): LatestFile | null {
  try {
    return validateLatest(data);
  } catch {
    return null;
  }
}

export function snapshotFromLatest(file: LatestFile): ComputeSnapshot {
  const poly = file.records.filter((row) => row.source === "Polymarket");
  const vast = file.records.filter((row) => row.source === "Vast.ai");
  const runpod = file.records.filter((row) => row.source === "RunPod");
  const table = file.records.filter((row) => row.source === "SF Compute Autoresearch");
  const changelog = file.records.find((row) => row.source === "SF Compute changelog") ?? null;
  const sample = file.records.find((row) => row.source === "SF Compute homepage sample") ?? null;
  const asOf = (rows: DataRecord[]) => rows.find((row) => !row.stale)?.fetched_at ?? rows[0]?.fetched_at ?? null;
  const stale = (rows: DataRecord[]) => rows.length > 0 && rows.every((row) => row.stale);
  const h100 = table.find((row) => row.name === "h100-1" && row.unit === "USD per hour");
  const runpodNames = new Map<string, RunpodOffer>();
  for (const row of runpod) {
    const current = runpodNames.get(row.name) ?? {
      id: row.key,
      name: row.name,
      memoryGb: row.memory_gb,
      secureUsdPerHour: null,
      communityUsdPerHour: null,
    };
    if (row.price_kind === "secure") current.secureUsdPerHour = row.value;
    if (row.price_kind === "community") current.communityUsdPerHour = row.value;
    if (row.memory_gb != null) current.memoryGb = row.memory_gb;
    runpodNames.set(row.name, current);
  }
  return {
    fetchedAt: file.fetched_at,
    polymarket: {
      status: poly.length ? "ok" : "error",
      stale: stale(poly),
      asOf: asOf(poly),
      error: poly.length ? null : "No Polymarket rows in latest.json",
      sourceUrl: polymarketKeysetUrl(),
      pageUrl: POLY_PAGE,
      markets: poly.map((row) => ({
        id: row.key,
        eventTitle: row.group || row.name,
        eventSlug: row.url.split("/event/")[1] || "",
        question: row.name,
        outcome: row.outcome || "Yes",
        probability: row.value,
        volumeUsd: row.volume_usd,
        endDate: row.end_date,
        url: row.url,
      })),
    },
    vast: {
      status: vast.length ? "ok" : "error",
      stale: stale(vast),
      asOf: asOf(vast),
      error: vast.length ? null : "No Vast rows in latest.json",
      sourceUrl: VAST_API,
      pageUrl: VAST_PAGE,
      note: "Lowest posted on-demand ask for one whole GPU. Not a cleared trade.",
      rows: [
        ...vast.map((row) => ({
          gpuName: row.name,
          offerId: row.offer_id,
          usdPerHour: row.value,
          vramMb: row.vram_mb,
          place: row.place,
        })),
        ...file.gaps
          .filter((gap) => gap.source === "Vast.ai")
          .map((gap) => ({ gpuName: gap.name, offerId: null, usdPerHour: null, vramMb: null, place: null })),
      ],
    },
    runpod: {
      status: runpod.length ? "ok" : "error",
      stale: stale(runpod),
      asOf: asOf(runpod),
      error: runpod.length ? null : "No RunPod rows in latest.json",
      sourceUrl: RUNPOD_API,
      pageUrl: RUNPOD_PAGE,
      note: "Posted catalog prices. A zero from the feed is omitted.",
      rows: [...runpodNames.values()],
    },
    sfcompute: {
      status: table.length || changelog || sample ? "ok" : "error",
      stale: stale([...table, ...(changelog ? [changelog] : []), ...(sample ? [sample] : [])]),
      asOf: asOf([...table, ...(changelog ? [changelog] : []), ...(sample ? [sample] : [])]),
      error: table.length || changelog || sample ? null : "No Autoresearch rows in latest.json",
      homeUrl: SF_HOME,
      changelogUrl: SF_CHANGELOG,
      note: "Posted list prices from the public Autoresearch pages. Not an order book.",
      conflict: Boolean(h100 && changelog && h100.value !== changelog.value),
      table: table.map((row) => ({
        item: row.name,
        rateText: row.rate_text || `${row.value} ${row.unit}`,
        usdPerHour: row.unit === "USD per hour" ? row.value : null,
        hourSource: row.unit === "USD per hour" ? "stated" : "none",
      })),
      changelog: changelog
        ? {
            title: changelog.name,
            statement: changelog.detail || "",
            iso: changelog.end_date || changelog.fetched_at,
            url: changelog.url,
          }
        : null,
      sample: sample
        ? { rateText: sample.rate_text || `$${sample.value}/min`, context: sample.detail || "" }
        : null,
    },
    dropped: file.dropped.map((item) => ({ name: item.source, url: item.url, reason: item.reason })),
  };
}
