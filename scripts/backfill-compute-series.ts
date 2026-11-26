import fs from "node:fs";
import path from "node:path";
import {
  polymarketKeysetUrl,
  readLatest,
  validateHistory,
  type DataRecord,
} from "../src/lib/computeMarket.ts";
import {
  blankSeries,
  indexEntry,
  mergePoint,
  mergePoints,
  pointForRecord,
  seriesIdForRecord,
  validateIndex,
  validateSeries,
  type SeriesFile,
  type SeriesPoint,
} from "../src/lib/computeSeries.ts";

const ROOT = path.resolve("public/data/compute-market");
const SERIES = path.join(ROOT, "series");
const HISTORY = path.join(ROOT, "history");
const LATEST = path.join(ROOT, "latest.json");
const UA = "hypergrid-atlas/1.0 (+https://hypergrid.davidtphung.com; public price history)";
const CLOB = "https://clob.polymarket.com/prices-history";

interface TokenJob {
  id: string;
  question: string;
  eventTitle: string;
  url: string;
  outcome: string;
  tokenId: string;
}

async function getJson(url: string): Promise<unknown> {
  let wait = 400;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(url, {
      headers: { accept: "application/json", "user-agent": UA },
    });
    if (response.status === 429 || response.status >= 500) {
      await new Promise((resolve) => setTimeout(resolve, wait));
      wait *= 2;
      continue;
    }
    if (!response.ok) throw new Error(`${url} returned ${response.status}`);
    return response.json();
  }
  throw new Error(`${url} stayed busy`);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function parseJsonArray(value: unknown): unknown[] | null {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function listTokens(): Promise<TokenJob[]> {
  const jobs: TokenJob[] = [];
  const seen = new Set<string>();
  let cursor: string | null = null;
  for (let page = 0; page < 8; page += 1) {
    const payload = asRecord(await getJson(polymarketKeysetUrl(cursor)));
    const events = payload && Array.isArray(payload.events) ? payload.events : [];
    for (const eventValue of events) {
      const event = asRecord(eventValue);
      if (!event) continue;
      const eventSlug = typeof event.slug === "string" ? event.slug : "";
      const eventTitle = typeof event.title === "string" ? event.title : eventSlug || "Untitled event";
      const url = eventSlug ? `https://polymarket.com/event/${eventSlug}` : "https://polymarket.com/tech/compute";
      const markets = Array.isArray(event.markets) ? event.markets : [];
      for (const marketValue of markets) {
        const market = asRecord(marketValue);
        if (!market) continue;
        const id = typeof market.id === "string" ? market.id : "";
        const question = typeof market.question === "string" ? market.question : "";
        const outcomes = parseJsonArray(market.outcomes);
        const tokens = parseJsonArray(market.clobTokenIds);
        if (!id || !question || !outcomes || !tokens || outcomes.length !== tokens.length) continue;
        for (let i = 0; i < outcomes.length; i += 1) {
          const outcome = typeof outcomes[i] === "string" ? outcomes[i] : "";
          const tokenId = typeof tokens[i] === "string" ? tokens[i] : "";
          if (!outcome || !tokenId || seen.has(tokenId)) continue;
          seen.add(tokenId);
          jobs.push({ id, question, eventTitle, url, outcome, tokenId });
        }
      }
    }
    const next = payload && typeof payload.next_cursor === "string" ? payload.next_cursor : "";
    if (!next || next === cursor || events.length === 0) break;
    cursor = next;
  }
  return jobs;
}

async function clobPoints(tokenId: string): Promise<SeriesPoint[]> {
  const url = `${CLOB}?market=${encodeURIComponent(tokenId)}&interval=max&fidelity=720`;
  const payload = asRecord(await getJson(url));
  const history = payload && Array.isArray(payload.history) ? payload.history : [];
  const points: SeriesPoint[] = [];
  for (const value of history) {
    const row = asRecord(value);
    if (!row || typeof row.t !== "number" || typeof row.p !== "number") continue;
    if (!Number.isFinite(row.t) || !Number.isFinite(row.p)) continue;
    points.push({ t: row.t * 1000, v: row.p });
  }
  return mergePoints([points]);
}

async function pool<T>(items: T[], width: number, task: (item: T) => Promise<void>) {
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const current = items[index];
      index += 1;
      await task(current);
    }
  }
  await Promise.all(Array.from({ length: width }, () => worker()));
}

function snapshotSeries(fetchedAt: string): SeriesFile[] {
  const grouped = new Map<string, { row: DataRecord; points: SeriesPoint[] }>();
  for (const name of fs.readdirSync(HISTORY)) {
    if (!name.endsWith(".json")) continue;
    const history = validateHistory(JSON.parse(fs.readFileSync(path.join(HISTORY, name), "utf8")));
    for (const run of history.runs) {
      for (const row of run.records) {
        if (row.source === "Polymarket") continue;
        const id = seriesIdForRecord(row);
        const point = pointForRecord(row);
        if (!id || !point) continue;
        const bucket = grouped.get(id) ?? { row, points: [] };
        bucket.points = mergePoint(bucket.points, point);
        if (Date.parse(row.fetched_at) >= Date.parse(bucket.row.fetched_at)) bucket.row = row;
        grouped.set(id, bucket);
      }
    }
  }
  const series: SeriesFile[] = [];
  for (const bucket of grouped.values()) {
    const built = blankSeries(bucket.row, bucket.points, fetchedAt);
    if (built) series.push(validateSeries(built));
  }
  return series;
}

function writeSeries(series: SeriesFile[]) {
  fs.mkdirSync(SERIES, { recursive: true });
  const kept = new Set<string>();
  for (const item of series) {
    const validated = validateSeries(item);
    const file = path.join(SERIES, `${validated.id}.json`);
    const temp = `${file}.tmp`;
    fs.writeFileSync(temp, `${JSON.stringify(validated)}\n`);
    fs.renameSync(temp, file);
    kept.add(path.basename(file));
  }
  for (const name of fs.readdirSync(SERIES)) {
    if (name === "index.json" || !name.endsWith(".json")) continue;
    if (!kept.has(name)) fs.unlinkSync(path.join(SERIES, name));
  }
  const index = validateIndex({
    fetched_at: series[0]?.fetched_at ?? new Date().toISOString(),
    note: "Polymarket lines are CLOB prices-history, interval max, fidelity 720 minutes. Other lines are saved snapshots, or the dated changelog price. No point is filled in.",
    series: series.map(indexEntry).sort((a, b) => a.id.localeCompare(b.id)),
  });
  const indexPath = path.join(SERIES, "index.json");
  const temp = `${indexPath}.tmp`;
  fs.writeFileSync(temp, `${JSON.stringify(index)}\n`);
  fs.renameSync(temp, indexPath);
}

async function main() {
  const fetchedAt = new Date().toISOString();
  const series = snapshotSeries(fetchedAt);
  const jobs = await listTokens();
  if (jobs.length === 0) throw new Error("Polymarket returned no outcome tokens");
  let done = 0;
  let failed = 0;
  await pool(jobs, 4, async (job) => {
    try {
      const points = await clobPoints(job.tokenId);
      if (points.length === 0) {
        failed += 1;
        return;
      }
      const row: DataRecord = {
        source: "Polymarket",
        url: job.url,
        fetched_at: fetchedAt,
        value: points[points.length - 1].v,
        unit: "implied probability",
        label: "CLAIM",
        stale: false,
        stale_age_seconds: null,
        key: `polymarket|${job.id}`,
        name: job.question,
        detail: null,
        group: job.eventTitle,
        outcome: job.outcome,
        volume_usd: null,
        end_date: null,
        vram_mb: null,
        place: null,
        offer_id: null,
        memory_gb: null,
        rate_text: null,
        price_kind: null,
      };
      const built = blankSeries(row, points, fetchedAt);
      if (!built) throw new Error(`could not build ${job.id}`);
      series.push(validateSeries(built));
    } catch (error) {
      failed += 1;
      console.error(`${job.id} ${job.outcome}: ${error instanceof Error ? error.message : error}`);
    } finally {
      done += 1;
      if (done % 100 === 0) console.log(`clob ${done}/${jobs.length}`);
    }
  });
  const latest = fs.existsSync(LATEST) ? readLatest(JSON.parse(fs.readFileSync(LATEST, "utf8"))) : null;
  if (latest) {
    for (const row of latest.records) {
      if (row.source !== "Polymarket") continue;
      const id = seriesIdForRecord(row);
      const point = pointForRecord(row);
      if (!id || !point) continue;
      const existing = series.find((item) => item.id === id);
      if (!existing) continue;
      existing.points = mergePoint(existing.points, point);
      existing.fetched_at = fetchedAt;
      validateSeries(existing);
    }
  }
  const clob = series.filter((item) => item.history === "clob");
  if (clob.length === 0) throw new Error("CLOB history produced no series");
  writeSeries(series);
  console.log(`series ${series.length}, clob ${clob.length}, token failures ${failed}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
