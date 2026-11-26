import type { DataRecord, EvidenceLabel } from "./computeMarket.ts";

export const SERIES_LAYERS = ["power", "it-mw", "chips", "gpu-hours", "tokens", "land", "unplaced"] as const;
export type SeriesLayer = (typeof SERIES_LAYERS)[number];
export type SeriesHistory = "clob" | "snapshot" | "changelog";

export const RANGE_IDS = ["1W", "1M", "3M", "1Y", "Max"] as const;
export type RangeId = (typeof RANGE_IDS)[number];

const RANGE_MS: Record<Exclude<RangeId, "Max">, number> = {
  "1W": 7 * 24 * 60 * 60 * 1000,
  "1M": 30 * 24 * 60 * 60 * 1000,
  "3M": 90 * 24 * 60 * 60 * 1000,
  "1Y": 365 * 24 * 60 * 60 * 1000,
};

const LABELS = new Set<EvidenceLabel>(["FACT", "ESTIMATE", "CLAIM"]);
const LAYERS = new Set<string>(SERIES_LAYERS);
const HISTORIES = new Set<SeriesHistory>(["clob", "snapshot", "changelog"]);
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface SeriesPoint {
  t: number;
  v: number;
}

export interface SeriesFile {
  source: string;
  url: string;
  unit: string;
  label: EvidenceLabel;
  points: SeriesPoint[];
  id: string;
  name: string;
  layer: SeriesLayer;
  history: SeriesHistory;
  history_note: string | null;
  fetched_at: string;
  outcome: string | null;
  group: string | null;
}

export interface SeriesIndexEntry {
  id: string;
  file: string;
  source: string;
  url: string;
  unit: string;
  label: EvidenceLabel;
  name: string;
  layer: SeriesLayer;
  history: SeriesHistory;
  history_note: string | null;
  points: number;
  start: number;
  end: number;
  fetched_at: string;
  outcome: string | null;
  group: string | null;
}

export interface SeriesIndex {
  fetched_at: string;
  note: string;
  series: SeriesIndexEntry[];
}

export function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 72);
}

export function seriesIdForRecord(row: DataRecord): string | null {
  if (row.source === "Vast.ai") return `vast-${slug(row.name)}`;
  if (row.source === "RunPod") return `runpod-${slug(row.name)}-${slug(row.price_kind || "price")}`;
  if (row.source === "SF Compute Autoresearch") return `sf-${slug(row.name)}`;
  if (row.source === "SF Compute changelog") return "sf-changelog-h100";
  if (row.source === "SF Compute homepage sample") return "sf-sample-h100";
  if (row.source === "Polymarket" && row.key.startsWith("polymarket|")) {
    return `polymarket-${row.key.slice("polymarket|".length)}-${slug(row.outcome || "yes")}`;
  }
  return null;
}

export function pointForRecord(row: DataRecord): SeriesPoint | null {
  if (row.stale || !Number.isFinite(row.value)) return null;
  if (row.source === "SF Compute changelog") {
    const t = Date.parse(row.end_date || "");
    if (!Number.isFinite(t)) return null;
    return { t, v: row.value };
  }
  const t = Date.parse(row.fetched_at);
  if (!Number.isFinite(t)) return null;
  return { t, v: row.value };
}

export function historyKind(source: string): SeriesHistory | null {
  if (source === "Polymarket") return "clob";
  if (source === "SF Compute changelog") return "changelog";
  if (
    source === "Vast.ai" ||
    source === "RunPod" ||
    source === "SF Compute Autoresearch" ||
    source === "SF Compute homepage sample"
  ) {
    return "snapshot";
  }
  return null;
}

export function layerForUnit(unit: string): SeriesLayer {
  if (/hour|minute/i.test(unit)) return "gpu-hours";
  return "unplaced";
}

export function layerForQuestion(question: string): SeriesLayer {
  const text = question.toLowerCase();
  if (/\btoken\b|inference/.test(text)) return "tokens";
  if (/gpu-hour|per hour|\$\/hr|rental price/.test(text)) return "gpu-hours";
  if (/\bh100\b|\bh200\b|\bb200\b|\bb300\b|\bgpu\b|\bchip\b|nvidia|blackwell|hopper/.test(text)) return "chips";
  if (/\bmw\b|megawatt|it load|it capacity/.test(text)) return "it-mw";
  if (/electric|power plant|nuclear|utility|substation|\bgrid\b|\bpower\b/.test(text)) return "power";
  if (/\bland\b|acre|zoning|parcel/.test(text)) return "land";
  return "unplaced";
}

const CHIP_ORDER = ["GB300", "GB200", "B300", "B200", "H200", "H100", "GH200", "A100", "L40S", "RTX 4090"];

export function chipFamily(name: string): string {
  const upper = name.toUpperCase();
  for (const chip of CHIP_ORDER) {
    if (upper.includes(chip.toUpperCase())) return chip;
  }
  return "Other";
}

export function pacificDay(ms: number): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(ms));
}

export function snapshotNote(firstMs: number): string {
  return `History starts on ${pacificDay(firstMs)}, the first saved snapshot. No earlier public history was found.`;
}

export function mergePoint(points: SeriesPoint[], point: SeriesPoint): SeriesPoint[] {
  const next = points.filter((item) => item.t !== point.t);
  next.push({ t: point.t, v: point.v });
  next.sort((a, b) => a.t - b.t);
  return next;
}

export function mergePoints(groups: SeriesPoint[][]): SeriesPoint[] {
  const byTime = new Map<number, number>();
  for (const group of groups) {
    for (const point of group) byTime.set(point.t, point.v);
  }
  return [...byTime.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([t, v]) => ({ t, v }));
}

export function filterRange(points: SeriesPoint[], range: RangeId, now = Date.now()): SeriesPoint[] {
  if (range === "Max") return points;
  const start = now - RANGE_MS[range];
  return points.filter((point) => point.t >= start);
}

export function splitGaps(points: SeriesPoint[]): SeriesPoint[][] {
  if (points.length === 0) return [];
  if (points.length === 1) return [points];
  const deltas: number[] = [];
  for (let i = 1; i < points.length; i += 1) deltas.push(points[i].t - points[i - 1].t);
  const sorted = [...deltas].sort((a, b) => a - b);
  const median = sorted[Math.floor((sorted.length - 1) / 2)];
  const limit = points.length === 2 ? 36 * 60 * 60 * 1000 : Math.max(median * 2.5, 36 * 60 * 60 * 1000);
  const groups: SeriesPoint[][] = [[points[0]]];
  for (let i = 1; i < points.length; i += 1) {
    if (points[i].t - points[i - 1].t > limit) groups.push([]);
    groups[groups.length - 1].push(points[i]);
  }
  return groups;
}

export function indexEntry(series: SeriesFile): SeriesIndexEntry {
  const first = series.points[0];
  const last = series.points[series.points.length - 1];
  return {
    id: series.id,
    file: `${series.id}.json`,
    source: series.source,
    url: series.url,
    unit: series.unit,
    label: series.label,
    name: series.name,
    layer: series.layer,
    history: series.history,
    history_note: series.history_note,
    points: series.points.length,
    start: first.t,
    end: last.t,
    fetched_at: series.fetched_at,
    outcome: series.outcome,
    group: series.group,
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

export function validateSeries(data: unknown): SeriesFile {
  const row = asRecord(data);
  if (!row) throw new Error("series is not an object");
  const id = row.id;
  const points = row.points;
  if (typeof id !== "string" || !id) throw new Error("series id missing");
  if (typeof row.source !== "string" || !row.source) throw new Error(`${id} missing source`);
  if (typeof row.url !== "string" || !row.url.startsWith("https://")) throw new Error(`${id} missing https url`);
  if (typeof row.unit !== "string" || !row.unit) throw new Error(`${id} missing unit`);
  if (!LABELS.has(row.label as EvidenceLabel)) throw new Error(`${id} bad label`);
  if (!LAYERS.has(String(row.layer))) throw new Error(`${id} bad layer`);
  if (!HISTORIES.has(row.history as SeriesHistory)) throw new Error(`${id} bad history kind`);
  if (row.history_note != null && typeof row.history_note !== "string") throw new Error(`${id} bad history note`);
  if (typeof row.fetched_at !== "string" || !ISO_UTC.test(row.fetched_at)) throw new Error(`${id} bad fetched_at`);
  if (typeof row.name !== "string" || !row.name) throw new Error(`${id} missing name`);
  if (row.outcome != null && typeof row.outcome !== "string") throw new Error(`${id} bad outcome`);
  if (row.group != null && typeof row.group !== "string") throw new Error(`${id} bad group`);
  if (!Array.isArray(points) || points.length === 0) throw new Error(`${id} has no points`);
  let last = -Infinity;
  const parsed: SeriesPoint[] = [];
  for (const point of points) {
    const item = asRecord(point);
    if (!item || typeof item.t !== "number" || typeof item.v !== "number") throw new Error(`${id} has a bad point`);
    if (!Number.isFinite(item.t) || !Number.isFinite(item.v)) throw new Error(`${id} has a non-finite point`);
    if (item.t <= last) throw new Error(`${id} points are not in time order`);
    last = item.t;
    parsed.push({ t: item.t, v: item.v });
  }
  if (row.history === "snapshot") {
    const note = row.history_note;
    if (typeof note !== "string" || !note.includes("first saved snapshot")) {
      throw new Error(`${id} snapshot is missing its start note`);
    }
  }
  if (row.history === "clob" && row.label !== "CLAIM") throw new Error(`${id} CLOB series must be CLAIM`);
  if ((row.history === "snapshot" || row.history === "changelog") && row.label !== "FACT") {
    throw new Error(`${id} saved price must be FACT`);
  }
  const span = parsed[parsed.length - 1].t - parsed[0].t;
  if (span < 0 || span > 20 * 365 * DAY_MS) throw new Error(`${id} time span is not credible`);
  return {
    source: row.source,
    url: row.url,
    unit: row.unit,
    label: row.label as EvidenceLabel,
    points: parsed,
    id,
    name: row.name,
    layer: row.layer as SeriesLayer,
    history: row.history as SeriesHistory,
    history_note: (row.history_note as string | null) ?? null,
    fetched_at: row.fetched_at,
    outcome: (row.outcome as string | null) ?? null,
    group: (row.group as string | null) ?? null,
  };
}

export function validateIndex(data: unknown): SeriesIndex {
  const row = asRecord(data);
  if (!row) throw new Error("series index is not an object");
  if (typeof row.fetched_at !== "string" || !ISO_UTC.test(row.fetched_at)) throw new Error("series index bad fetched_at");
  if (typeof row.note !== "string" || !row.note) throw new Error("series index missing note");
  if (!Array.isArray(row.series) || row.series.length === 0) throw new Error("series index is empty");
  const seen = new Set<string>();
  const series: SeriesIndexEntry[] = [];
  for (const value of row.series) {
    const item = asRecord(value);
    if (!item || typeof item.id !== "string") throw new Error("series index has a bad row");
    if (seen.has(item.id)) throw new Error(`duplicate series ${item.id}`);
    seen.add(item.id);
    if (item.file !== `${item.id}.json`) throw new Error(`${item.id} file name mismatch`);
    if (typeof item.points !== "number" || item.points < 1) throw new Error(`${item.id} bad point count`);
    if (typeof item.start !== "number" || typeof item.end !== "number" || item.end < item.start) {
      throw new Error(`${item.id} bad start or end`);
    }
    series.push(value as SeriesIndexEntry);
  }
  return { fetched_at: row.fetched_at, note: row.note, series };
}

export function blankSeries(row: DataRecord, points: SeriesPoint[], fetchedAt: string): SeriesFile | null {
  const id = seriesIdForRecord(row);
  const history = historyKind(row.source);
  if (!id || !history || points.length === 0) return null;
  const first = points[0].t;
  const layer = history === "clob" ? layerForQuestion(row.name) : layerForUnit(row.unit);
  let history_note: string | null = null;
  if (history === "snapshot") history_note = snapshotNote(first);
  if (history === "changelog") {
    history_note = "This point is the price the changelog states at that time. The page does not give the earlier price a time, so it is not plotted.";
  }
  return {
    source: row.source,
    url: row.url,
    unit: row.unit,
    label: row.label,
    points,
    id,
    name: row.name,
    layer,
    history,
    history_note,
    fetched_at: fetchedAt,
    outcome: row.outcome,
    group: row.group,
  };
}
