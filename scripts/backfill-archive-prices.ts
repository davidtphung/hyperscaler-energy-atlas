import fs from "node:fs";
import path from "node:path";
import { parseCoreweavePricing, parseLambdaGpuCloud, parseSfFromPrice, type ArchivedPrice } from "../src/lib/archivePrices.ts";
import { indexEntry, slug, validateIndex, validateSeries, type SeriesFile, type SeriesPoint } from "../src/lib/computeSeries.ts";

const DIR = path.resolve("public/data/compute-market/series");
const UA = "hypergrid-atlas/1.0 (+https://hypergrid.davidtphung.com; public price archive)";
const DATASET_URL = "https://github.com/rahilmittal1/gpu-price-history";
const DATASET_FILE = "https://raw.githubusercontent.com/rahilmittal1/gpu-price-history/main/data/rent/rent_panel_monthly.csv";
const PANEL_URL = "https://github.com/rahilmittal1/gpu-price-history/blob/main/data/rent/rent_panel_monthly.csv";

interface Capture {
  timestamp: string;
  original: string;
}

interface PageJob {
  source: string;
  pageUrl: string;
  idPrefix: string;
  note: string;
  parse: (html: string) => ArchivedPrice[];
}

const PAGES: PageJob[] = [
  {
    source: "Lambda",
    pageUrl: "https://lambdalabs.com/service/gpu-cloud",
    idPrefix: "lambda",
    note: "Posted price as archived. Each point is the on-demand dollars per GPU per hour printed on that Wayback snapshot. Snapshots without that table are omitted. No price was filled in.",
    parse: parseLambdaGpuCloud,
  },
  {
    source: "CoreWeave",
    pageUrl: "https://www.coreweave.com/pricing",
    idPrefix: "coreweave",
    note: "Posted price as archived. Each point is the printed instance price per hour for that GPU count. The page prices the whole instance, so the number is not split into a per-GPU price. Snapshots without that table are omitted. No other price was filled in.",
    parse: parseCoreweavePricing,
  },
  {
    source: "SF Compute",
    pageUrl: "https://sfcompute.com/",
    idPrefix: "sf-archive",
    note: "Posted price as archived. Each point is the from price printed on that snapshot, the advertised floor for that chip. Snapshots without that sentence are omitted. It is not joined to the Autoresearch node table.",
    parse: parseSfFromPrice,
  },
];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stampMs(timestamp: string): number {
  const year = Number(timestamp.slice(0, 4));
  const month = Number(timestamp.slice(4, 6));
  const day = Number(timestamp.slice(6, 8));
  const hour = Number(timestamp.slice(8, 10));
  const minute = Number(timestamp.slice(10, 12));
  const second = Number(timestamp.slice(12, 14));
  return Date.UTC(year, month - 1, day, hour, minute, second);
}

function weekBucket(timestamp: string): number {
  return Math.floor(stampMs(timestamp) / (7 * 24 * 60 * 60 * 1000));
}

async function getText(url: string): Promise<string> {
  let wait = 800;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(url, { headers: { "user-agent": UA, accept: "text/html,application/json;q=0.9" } });
    if (response.status === 429 || response.status >= 500) {
      await sleep(wait);
      wait *= 2;
      continue;
    }
    if (!response.ok) throw new Error(`${url} returned ${response.status}`);
    return response.text();
  }
  throw new Error(`${url} stayed busy`);
}

async function captures(pageUrl: string): Promise<Capture[]> {
  const query = new URL("https://web.archive.org/cdx/search/cdx");
  query.searchParams.set("url", pageUrl);
  query.searchParams.set("output", "json");
  query.searchParams.set("fl", "timestamp,original");
  query.searchParams.set("filter", "statuscode:200");
  query.searchParams.append("filter", "mimetype:text/html");
  query.searchParams.set("collapse", "timestamp:8");
  query.searchParams.set("from", "20230101");
  const payload = JSON.parse(await getText(query.toString())) as string[][];
  const rows = payload.slice(1).filter((row) => row.length >= 2 && row[0].length >= 14);
  const seen = new Set<number>();
  const picked: Capture[] = [];
  for (const row of rows) {
    const bucket = weekBucket(row[0]);
    if (seen.has(bucket)) continue;
    seen.add(bucket);
    picked.push({ timestamp: row[0], original: row[1].startsWith("http") ? row[1] : pageUrl });
  }
  return picked;
}

function archiveUrl(capture: Capture): string {
  return `https://web.archive.org/web/${capture.timestamp}/${capture.original}`;
}

function rawUrl(capture: Capture): string {
  return `https://web.archive.org/web/${capture.timestamp}id_/${capture.original}`;
}

async function scrapePage(job: PageJob): Promise<Map<string, { price: ArchivedPrice; points: SeriesPoint[] }>> {
  const found = new Map<string, { price: ArchivedPrice; points: SeriesPoint[] }>();
  const list = await captures(job.pageUrl);
  console.log(`${job.source} weekly snapshots ${list.length}`);
  let parsed = 0;
  for (const capture of list) {
    await sleep(1000);
    let html = "";
    try {
      html = await getText(rawUrl(capture));
    } catch (error) {
      console.warn(`${job.source} ${capture.timestamp} skipped: ${error instanceof Error ? error.message : error}`);
      continue;
    }
    const prices = job.parse(html);
    if (prices.length === 0) continue;
    parsed += 1;
    const t = stampMs(capture.timestamp);
    const url = archiveUrl(capture);
    for (const price of prices) {
      const current = found.get(price.sku) ?? { price, points: [] };
      current.points.push({ t, v: price.usdPerGpuHour, url, origin: "archive" });
      found.set(price.sku, current);
    }
  }
  console.log(`${job.source} snapshots with a price ${parsed}`);
  return found;
}

function writeSeries(series: SeriesFile) {
  const clean = validateSeries({
    ...series,
    points: series.points
      .slice()
      .sort((a, b) => a.t - b.t)
      .filter((point, index, all) => all.findIndex((item) => item.t === point.t) === index),
  });
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(path.join(DIR, `${clean.id}.json`), `${JSON.stringify(clean)}\n`);
}

function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else quoted = false;
      } else cell += char;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") cell += char;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  const header = rows[0] ?? [];
  return rows.slice(1).filter((item) => item.length === header.length).map((item) => {
    const record: Record<string, string> = {};
    header.forEach((key, index) => {
      record[key] = item[index];
    });
    return record;
  });
}

function importDataset(providers: string[]) {
  return getText(DATASET_FILE).then((csv) => {
    const rows = parseCsv(csv);
    const chips = ["H100", "H200", "B200", "B300"];
    let written = 0;
    for (const provider of providers) {
      for (const gpu of chips) {
        const usable = rows.filter((row) => {
          if (row.provider !== provider || row.gpu !== gpu || row.segment !== "neocloud_on_demand") return false;
          if (row.flag) return false;
          if (row.n_quotes !== "1") return false;
          if (row.min_usd_per_gpu_hour !== row.max_usd_per_gpu_hour) return false;
          if (row.min_usd_per_gpu_hour !== row.usd_per_gpu_hour) return false;
          return /^\d{4}-\d{2}-\d{2}$/.test(row.snapshot_date);
        });
        const groups = new Map<string, typeof usable>();
        for (const row of usable) {
          const key = `${row.form_factor}|${row.region}`;
          const list = groups.get(key) ?? [];
          list.push(row);
          groups.set(key, list);
        }
        const formRank: Record<string, number> = { SXM: 0, PCIe: 1, NVL: 2 };
        const ranked = [...groups.entries()].sort((a, b) => {
          if (b[1].length !== a[1].length) return b[1].length - a[1].length;
          const [formA, regionA] = a[0].split("|");
          const [formB, regionB] = b[0].split("|");
          const formDelta = (formRank[formA] ?? 9) - (formRank[formB] ?? 9);
          if (formDelta !== 0) return formDelta;
          return regionA.localeCompare(regionB);
        });
        const best = ranked[0];
        if (!best) continue;
        const [form, region] = best[0].split("|");
        const points: SeriesPoint[] = [];
        const seen = new Map<number, number>();
        for (const row of best[1]) {
          const t = Date.parse(`${row.snapshot_date}T00:00:00Z`);
          const v = Number(row.usd_per_gpu_hour);
          if (!Number.isFinite(t) || !Number.isFinite(v) || v <= 0) continue;
          const prior = seen.get(t);
          if (prior != null && prior !== v) {
            seen.delete(t);
            continue;
          }
          seen.set(t, v);
        }
        for (const [t, v] of [...seen.entries()].sort((a, b) => a[0] - b[0])) {
          points.push({ t, v, url: PANEL_URL, origin: "dataset" });
        }
        if (points.length === 0) continue;
        const label = provider[0].toUpperCase() + provider.slice(1);
        const id = `dataset-${provider}-${gpu.toLowerCase()}-${slug(form)}-${slug(region)}`;
        const series: SeriesFile = {
          source: "gpu-price-history",
          url: DATASET_URL,
          unit: "USD per GPU-hour",
          label: "FACT",
          points,
          id,
          name: `${label} ${gpu} ${form} on-demand, ${region}`,
          layer: "gpu-hours",
          history: "dataset",
          history_note: `CC BY 4.0 gpu-price-history panel (R. Mittal, 2026). ${label} ${gpu} ${form} on-demand in ${region}. The time is the panel snapshot date. Flagged, stale, and multi-quote rows are left out. Regions are not averaged. This is the region with the most remaining observations.`,
          fetched_at: new Date().toISOString(),
          outcome: null,
          group: provider,
          archive_end: null,
          live_start: null,
        };
        writeSeries(series);
        written += 1;
        console.log(`dataset ${id} points ${points.length}`);
      }
    }
    return written;
  });
}

function rebuildIndex(fetchedAt: string) {
  const entries = fs
    .readdirSync(DIR)
    .filter((name) => name.endsWith(".json") && name !== "index.json")
    .map((name) => indexEntry(validateSeries(JSON.parse(fs.readFileSync(path.join(DIR, name), "utf8")))))
    .sort((a, b) => a.id.localeCompare(b.id));
  const index = validateIndex({
    fetched_at: fetchedAt,
    note: "Polymarket lines are CLOB prices-history, interval max, fidelity 720 minutes. Archived lines are posted prices read from Wayback snapshots, at most one snapshot a week. Dataset lines are the CC BY 4.0 gpu-price-history panel. No point is filled in.",
    series: entries,
  });
  fs.writeFileSync(path.join(DIR, "index.json"), `${JSON.stringify(index)}\n`);
  console.log(`index series ${index.series.length}`);
}

async function main() {
  const fetchedAt = new Date().toISOString();
  let archiveSeries = 0;
  let coreweaveSeries = 0;
  for (const job of PAGES) {
    const found = await scrapePage(job);
    for (const [sku, bundle] of found) {
      const points = bundle.points.slice().sort((a, b) => a.t - b.t);
      const series: SeriesFile = {
        source: job.source,
        url: job.pageUrl,
        unit: bundle.price.unit,
        label: "FACT",
        points,
        id: `${job.idPrefix}-${sku}`,
        name: bundle.price.name,
        layer: "gpu-hours",
        history: "archive",
        history_note: job.note,
        fetched_at: fetchedAt,
        outcome: null,
        group: bundle.price.chip,
        archive_end: points[points.length - 1]?.t ?? null,
        live_start: null,
      };
      writeSeries(series);
      archiveSeries += 1;
      if (job.source === "CoreWeave") coreweaveSeries += 1;
      console.log(`wrote ${series.id} points ${points.length}`);
    }
  }
  const providers = coreweaveSeries > 0 ? ["runpod", "lambda"] : ["runpod", "lambda", "coreweave"];
  const datasetSeries = await importDataset(providers);
  rebuildIndex(fetchedAt);
  console.log(`archive series ${archiveSeries}, dataset series ${datasetSeries}`);
  if (archiveSeries + datasetSeries === 0) throw new Error("no historical price was parsed");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
