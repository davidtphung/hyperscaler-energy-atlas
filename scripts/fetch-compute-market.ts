import fs from "node:fs";
import path from "node:path";
import {
  DROPPED_SOURCES,
  POLY_PAGE,
  RUNPOD_API,
  RUNPOD_PAGE,
  SF_CHANGELOG,
  SF_HOME,
  VAST_API,
  VAST_PAGE,
  listedPrice,
  markStale,
  parsePolymarketPayload,
  parseSfChangelog,
  parseSfSample,
  parseSfTable,
  polymarketKeysetUrl,
  polymarketRecords,
  readLatest,
  robotsAllows,
  runpodRecords,
  sfConflict,
  sfRecords,
  snapshotFromLatest,
  validateHistory,
  validateLatest,
  vastRecords,
  type ComputeSnapshot,
  type DataRecord,
  type LatestFile,
  type PolyMarket,
  type RunpodOffer,
  type VastOffer,
} from "../src/lib/computeMarket.ts";
import {
  blankSeries,
  historyKind,
  indexEntry,
  mergePoint,
  pointForRecord,
  seriesIdForRecord,
  validateIndex,
  validateSeries,
  type SeriesFile,
} from "../src/lib/computeSeries.ts";

const LATEST = path.resolve("public/data/compute-market/latest.json");
const HISTORY = path.resolve("public/data/compute-market/history");
const UA = "hypergrid-atlas/1.0 (+https://hypergrid.davidtphung.com; public price snapshot)";
const VAST_NAMES = [
  "H100 PCIE",
  "H100 NVL",
  "H100 SXM",
  "H100",
  "H200 NVL",
  "H200 SXM",
  "H200",
  "A100 PCIE",
  "A100 SXM4",
  "B200",
  "B300",
  "GB300",
  "GB200",
  "GH200",
  "L40S",
  "RTX 4090",
];
const RUNPOD_WANTED = ["H100", "H200", "A100", "B200", "B300", "GB200", "GB300", "GH200", "L40S"];

function previousSnapshot(): ComputeSnapshot | null {
  if (!fs.existsSync(LATEST)) return null;
  try {
    return snapshotFromLatest(readLatest(JSON.parse(fs.readFileSync(LATEST, "utf8"))) ?? failRead());
  } catch {
    return null;
  }
}

function failRead(): never {
  throw new Error("latest.json could not be read");
}

function previousRecords(): DataRecord[] {
  if (!fs.existsSync(LATEST)) return [];
  try {
    return readLatest(JSON.parse(fs.readFileSync(LATEST, "utf8")))?.records ?? [];
  } catch {
    return [];
  }
}

async function getText(url: string, init?: RequestInit): Promise<string> {
  const response = await fetch(url, {
    ...init,
    headers: {
      accept: "application/json, text/html;q=0.9",
      "user-agent": UA,
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.text();
}

async function fetchPolymarket(): Promise<PolyMarket[]> {
  const markets: PolyMarket[] = [];
  const seen = new Set<string>();
  let cursor: string | null = null;
  for (let page = 0; page < 4; page += 1) {
    const payload = JSON.parse(await getText(polymarketKeysetUrl(cursor))) as unknown;
    const parsed = parsePolymarketPayload(payload);
    for (const market of parsed.markets) {
      if (seen.has(market.id)) continue;
      seen.add(market.id);
      markets.push(market);
    }
    if (!parsed.nextCursor || parsed.nextCursor === cursor || parsed.markets.length === 0) break;
    cursor = parsed.nextCursor;
  }
  if (markets.length === 0) throw new Error("Polymarket returned no priced markets");
  return markets;
}

async function fetchVast(): Promise<VastOffer[]> {
  const rows: VastOffer[] = [];
  for (const gpuName of VAST_NAMES) {
    const query = {
      rentable: { eq: true },
      num_gpus: { eq: 1 },
      gpu_frac: { eq: 1 },
      type: "ondemand",
      gpu_name: { eq: gpuName },
      order: [["dph_total", "asc"]],
      limit: 1,
    };
    const url = `${VAST_API}?q=${encodeURIComponent(JSON.stringify(query))}`;
    const payload = JSON.parse(await getText(url)) as { offers?: Record<string, unknown>[] };
    const offer = payload.offers?.[0];
    if (!offer) {
      rows.push({ gpuName, offerId: null, usdPerHour: null, vramMb: null, place: null });
    } else {
      rows.push({
        gpuName,
        offerId: typeof offer.id === "number" ? offer.id : null,
        usdPerHour: listedPrice(offer.dph_total),
        vramMb: typeof offer.gpu_ram === "number" ? offer.gpu_ram : null,
        place: typeof offer.geolocation === "string" ? offer.geolocation : null,
      });
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  if (!rows.some((row) => row.usdPerHour != null)) throw new Error("Vast returned no priced offers");
  return rows;
}

async function fetchRunpod(): Promise<RunpodOffer[]> {
  const body = JSON.stringify({
    query: "query { gpuTypes { id displayName memoryInGb securePrice communityPrice } }",
  });
  const payload = JSON.parse(
    await getText(RUNPOD_API, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body,
    }),
  ) as { data?: { gpuTypes?: Record<string, unknown>[] } };
  const types = payload.data?.gpuTypes ?? [];
  const rows: RunpodOffer[] = [];
  for (const item of types) {
    const name = typeof item.displayName === "string" ? item.displayName : "";
    if (!RUNPOD_WANTED.some((wanted) => name.toLowerCase().includes(wanted.toLowerCase()))) continue;
    rows.push({
      id: typeof item.id === "string" ? item.id : name,
      name,
      memoryGb: typeof item.memoryInGb === "number" ? item.memoryInGb : null,
      secureUsdPerHour: listedPrice(item.securePrice),
      communityUsdPerHour: listedPrice(item.communityPrice),
    });
  }
  for (const wanted of RUNPOD_WANTED) {
    if (rows.some((row) => row.name.toLowerCase().includes(wanted.toLowerCase()))) continue;
    rows.push({
      id: `missing-${wanted}`,
      name: wanted,
      memoryGb: null,
      secureUsdPerHour: null,
      communityUsdPerHour: null,
    });
  }
  if (!rows.some((row) => row.secureUsdPerHour != null || row.communityUsdPerHour != null)) {
    throw new Error("RunPod returned no listed prices");
  }
  return rows;
}

async function assertRobots(pageUrl: string) {
  const robotsUrl = new URL("/robots.txt", pageUrl).toString();
  const response = await fetch(robotsUrl, { headers: { "user-agent": UA, accept: "text/plain" } });
  if (response.status === 404) return;
  if (!response.ok) throw new Error(`robots: ${robotsUrl} returned ${response.status}`);
  const body = await response.text();
  if (!robotsAllows(body, new URL(pageUrl).pathname || "/")) throw new Error(`robots: ${pageUrl} is disallowed`);
}

async function fetchSf(now: string): Promise<ComputeSnapshot["sfcompute"]> {
  await assertRobots(SF_HOME);
  await assertRobots(SF_CHANGELOG);
  const home = await getText(SF_HOME, { headers: { accept: "text/html" } });
  const log = await getText(SF_CHANGELOG, { headers: { accept: "text/html" } });
  const table = parseSfTable(home);
  if (table.length === 0) throw new Error("Autoresearch pricing table was empty");
  const changelog = parseSfChangelog(log);
  return {
    status: "ok",
    stale: false,
    asOf: now,
    error: changelog ? null : "The changelog sentence was not found. No old sentence was copied in.",
    homeUrl: SF_HOME,
    changelogUrl: SF_CHANGELOG,
    note: "Posted list prices from the public Autoresearch pages. Not an order book.",
    conflict: sfConflict(table, changelog),
    table,
    changelog,
    sample: parseSfSample(home),
  };
}

function failed<T extends { status: "ok" | "error"; stale: boolean; error: string | null }>(
  prior: T | undefined,
  message: string,
  empty: T,
): T {
  if (prior && prior.status === "ok") return { ...prior, stale: true, error: message };
  return { ...empty, status: "error", stale: false, error: message };
}

async function main() {
  const prior = previousSnapshot();
  const now = new Date().toISOString();
  const snapshot: ComputeSnapshot = {
    fetchedAt: now,
    polymarket: prior?.polymarket ?? {
      status: "error",
      stale: false,
      asOf: null,
      error: "No snapshot yet",
      sourceUrl: polymarketKeysetUrl(),
      pageUrl: POLY_PAGE,
      markets: [],
    },
    vast: prior?.vast ?? {
      status: "error",
      stale: false,
      asOf: null,
      error: "No snapshot yet",
      sourceUrl: VAST_API,
      pageUrl: VAST_PAGE,
      note: "Lowest posted on-demand ask for one whole GPU.",
      rows: [],
    },
    runpod: prior?.runpod ?? {
      status: "error",
      stale: false,
      asOf: null,
      error: "No snapshot yet",
      sourceUrl: RUNPOD_API,
      pageUrl: RUNPOD_PAGE,
      note: "Posted catalog prices. A zero from the feed is omitted.",
      rows: [],
    },
    sfcompute: prior?.sfcompute ?? {
      status: "error",
      stale: false,
      asOf: null,
      error: "No snapshot yet",
      homeUrl: SF_HOME,
      changelogUrl: SF_CHANGELOG,
      note: "Posted list prices from the public Autoresearch pages.",
      conflict: false,
      table: [],
      changelog: null,
      sample: null,
    },
    dropped: DROPPED_SOURCES,
  };

  try {
    snapshot.polymarket = {
      status: "ok",
      stale: false,
      asOf: now,
      error: null,
      sourceUrl: polymarketKeysetUrl(),
      pageUrl: POLY_PAGE,
      markets: await fetchPolymarket(),
    };
    console.log(`polymarket ${snapshot.polymarket.markets.length}`);
  } catch (error) {
    snapshot.polymarket = failed(prior?.polymarket, error instanceof Error ? error.message : "Polymarket failed", snapshot.polymarket);
    console.warn(`polymarket kept previous: ${snapshot.polymarket.error}`);
  }

  try {
    snapshot.vast = {
      status: "ok",
      stale: false,
      asOf: now,
      error: null,
      sourceUrl: VAST_API,
      pageUrl: VAST_PAGE,
      note: "Lowest posted on-demand ask for one whole GPU. Not a cleared trade.",
      rows: await fetchVast(),
    };
    console.log(`vast ${snapshot.vast.rows.filter((row) => row.usdPerHour != null).length} priced`);
  } catch (error) {
    snapshot.vast = failed(prior?.vast, error instanceof Error ? error.message : "Vast failed", snapshot.vast);
    console.warn(`vast kept previous: ${snapshot.vast.error}`);
  }

  try {
    snapshot.runpod = {
      status: "ok",
      stale: false,
      asOf: now,
      error: null,
      sourceUrl: RUNPOD_API,
      pageUrl: RUNPOD_PAGE,
      note: "Posted catalog prices. A zero from the feed is omitted.",
      rows: await fetchRunpod(),
    };
    console.log(`runpod ${snapshot.runpod.rows.length}`);
  } catch (error) {
    snapshot.runpod = failed(prior?.runpod, error instanceof Error ? error.message : "RunPod failed", snapshot.runpod);
    console.warn(`runpod kept previous: ${snapshot.runpod.error}`);
  }

  try {
    snapshot.sfcompute = await fetchSf(now);
    console.log(`sf table ${snapshot.sfcompute.table.length} conflict ${snapshot.sfcompute.conflict}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Autoresearch failed";
    if (message.startsWith("robots:")) {
      snapshot.sfcompute = { ...snapshot.sfcompute, status: "error", stale: false, error: message, table: [], changelog: null, sample: null };
      snapshot.dropped = [
        ...snapshot.dropped,
        { name: "SF Compute Autoresearch", url: SF_HOME, reason: message },
      ];
      console.warn(message);
    } else {
      snapshot.sfcompute = failed(prior?.sfcompute, message, snapshot.sfcompute);
      console.warn(`sf kept previous: ${snapshot.sfcompute.error}`);
    }
  }

  const priorRecords = previousRecords();
  const built: DataRecord[] = [];
  const gaps = [];
  if (snapshot.polymarket.status === "ok" && !snapshot.polymarket.stale) {
    built.push(...polymarketRecords(snapshot.polymarket.markets, now));
  } else {
    built.push(...markStale(priorRecords.filter((row) => row.source === "Polymarket"), now));
  }
  if (snapshot.vast.status === "ok" && !snapshot.vast.stale) {
    const vast = vastRecords(snapshot.vast.rows, now);
    built.push(...vast.records);
    gaps.push(...vast.gaps);
  } else {
    built.push(...markStale(priorRecords.filter((row) => row.source === "Vast.ai"), now));
    gaps.push(...(priorLatestGaps("Vast.ai")));
  }
  if (snapshot.runpod.status === "ok" && !snapshot.runpod.stale) {
    const runpod = runpodRecords(snapshot.runpod.rows, now);
    built.push(...runpod.records);
    gaps.push(...runpod.gaps);
  } else {
    built.push(...markStale(priorRecords.filter((row) => row.source === "RunPod"), now));
  }
  if (snapshot.sfcompute.status === "ok" && !snapshot.sfcompute.stale) {
    const sf = sfRecords(snapshot.sfcompute.table, snapshot.sfcompute.changelog, snapshot.sfcompute.sample, now);
    built.push(...sf.records);
    gaps.push(...sf.gaps);
    if (!snapshot.sfcompute.changelog) {
      built.push(...markStale(priorRecords.filter((row) => row.source === "SF Compute changelog"), now));
    }
    if (!snapshot.sfcompute.sample) {
      built.push(...markStale(priorRecords.filter((row) => row.source === "SF Compute homepage sample"), now));
    }
  } else if (snapshot.sfcompute.stale) {
    built.push(
      ...markStale(
        priorRecords.filter((row) => row.source.startsWith("SF Compute")),
        now,
      ),
    );
  }

  const records: DataRecord[] = [];
  const seen = new Set<string>();
  for (const row of built) {
    if (seen.has(row.key)) continue;
    seen.add(row.key);
    records.push(row);
  }

  const latest: LatestFile = {
    fetched_at: now,
    records,
    gaps,
    dropped: snapshot.dropped.map((item) => ({ source: item.name, url: item.url, reason: item.reason })),
    sources: [
      { source: "Polymarket", mode: "api", url: POLY_PAGE, note: "Live Gamma API in the browser, and this scheduled snapshot." },
      { source: "Vast.ai", mode: "api", url: VAST_PAGE, note: "Public bundles API. One filtered request per chip name, with a short pause. No CORS, so the page uses this file." },
      { source: "RunPod", mode: "api", url: RUNPOD_PAGE, note: "One public GraphQL request. No CORS, so the page uses this file." },
      { source: "SF Compute Autoresearch", mode: snapshot.sfcompute.status === "error" && (snapshot.sfcompute.error ?? "").startsWith("robots:") ? "dropped" : "scrape", url: SF_HOME, note: "Public pricing page. robots.txt allows /. One page request per run." },
      { source: "SF Compute changelog", mode: "scrape", url: SF_CHANGELOG, note: "Public changelog. robots.txt allows /. One page request per run." },
      ...DROPPED_SOURCES.map((item) => ({ source: item.name, mode: "dropped" as const, url: item.url, note: item.reason })),
    ],
  };
  if (!latest.records.some((row) => !row.stale)) {
    console.error("compute market fetch produced no fresh record");
    process.exit(1);
  }
  const validated = validateLatest(latest);
  const day = validated.fetched_at.slice(0, 10);
  const historyPath = path.join(HISTORY, `${day}.json`);
  const history = fs.existsSync(historyPath)
    ? validateHistory(JSON.parse(fs.readFileSync(historyPath, "utf8")))
    : { date: day, runs: [] };
  if (history.date !== day) throw new Error("history file date does not match");
  history.runs.push({ fetched_at: validated.fetched_at, records: validated.records });
  validateHistory(history);
  fs.mkdirSync(HISTORY, { recursive: true });
  atomicWrite(LATEST, validated);
  atomicWrite(historyPath, history);
  appendSeries(validated.records, validated.fetched_at);
  const oldFlat = path.resolve("public/data/compute-market.json");
  if (fs.existsSync(oldFlat)) fs.unlinkSync(oldFlat);
  console.log(`wrote ${LATEST} and ${historyPath}`);
}

function priorLatestGaps(source: string) {
  if (!fs.existsSync(LATEST)) return [];
  try {
    return readLatest(JSON.parse(fs.readFileSync(LATEST, "utf8")))?.gaps.filter((gap) => gap.source === source) ?? [];
  } catch {
    return [];
  }
}

function appendSeries(records: DataRecord[], fetchedAt: string) {
  const dir = path.resolve("public/data/compute-market/series");
  if (!fs.existsSync(path.join(dir, "index.json"))) return;
  let changed = false;
  for (const row of records) {
    const id = seriesIdForRecord(row);
    const point = pointForRecord(row);
    if (!id || !point || !historyKind(row.source)) continue;
    const file = path.join(dir, `${id}.json`);
    if (!fs.existsSync(file)) {
      if (row.source === "Polymarket") continue;
      const created = blankSeries(row, [point], fetchedAt);
      if (!created) continue;
      writeCompact(file, validateSeries(created));
      changed = true;
      continue;
    }
    const existing = validateSeries(JSON.parse(fs.readFileSync(file, "utf8")));
    const last = existing.points[existing.points.length - 1];
    const points = mergePoint(existing.points, point);
    const same = points.length === existing.points.length && last.t === point.t && last.v === point.v;
    if (same) continue;
    const next: SeriesFile = { ...existing, points, fetched_at: fetchedAt };
    writeCompact(file, validateSeries(next));
    changed = true;
  }
  if (!changed) return;
  const entries = fs
    .readdirSync(dir)
    .filter((name) => name.endsWith(".json") && name !== "index.json")
    .map((name) => indexEntry(validateSeries(JSON.parse(fs.readFileSync(path.join(dir, name), "utf8")))))
    .sort((a, b) => a.id.localeCompare(b.id));
  const index = validateIndex({
    fetched_at: fetchedAt,
    note: "Polymarket lines are CLOB prices-history, interval max, fidelity 720 minutes. Other lines are saved snapshots, or the dated changelog price. No point is filled in.",
    series: entries,
  });
  writeCompact(path.join(dir, "index.json"), index);
}

function writeCompact(file: string, data: unknown) {
  const temp = `${file}.tmp`;
  fs.writeFileSync(temp, `${JSON.stringify(data)}\n`);
  fs.renameSync(temp, file);
}

function atomicWrite(file: string, data: unknown) {
  const temp = `${file}.tmp`;
  fs.writeFileSync(temp, `${JSON.stringify(data, null, 2)}\n`);
  fs.renameSync(temp, file);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
