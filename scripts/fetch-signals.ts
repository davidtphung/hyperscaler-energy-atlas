/**
 * Build-time Census C30 pull for the Signals layer.
 * Writes src/data/signals.json and public/signals.json.
 * On any failure, keeps the last committed JSON and exits 0.
 * Does not invent values.
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const OUT_SRC = path.resolve("src/data/signals.json");
const OUT_PUBLIC = path.resolve("public/signals.json");

const URLS = {
  privateSa: "https://www.census.gov/construction/c30/xlsx/privsatime.xlsx",
  privateNsa: "https://www.census.gov/construction/c30/xlsx/privtime.xlsx",
  totalNsa: "https://www.census.gov/construction/c30/xlsx/tottime.xlsx",
  release: "https://www.census.gov/construction/c30/xlsx/release.xlsx",
  definitions: "https://www.census.gov/construction/c30/definitions.html",
  historical: "https://www.census.gov/construction/c30/historical_data.html",
  current: "https://www.census.gov/construction/c30/current/index.html",
};

const FRED = {
  PROFCONS: "https://fred.stlouisfed.org/series/PROFCONS",
  TLOFCON: "https://fred.stlouisfed.org/series/TLOFCON",
  search: "https://fred.stlouisfed.org/searchresults/?st=%22data+center%22&t=census",
};

const DATA_CENTER_DEF =
  "Includes buildings that contain the hardware needed for storing, processing, and transmitting digital information.";
const GENERAL_DEF =
  "Includes administration buildings, computer centers, office buildings, and professional buildings.";
const OFFICE_DEF =
  "In addition to the types of offices listed below, it also includes motion picture, television, and radio offices.";
const SERVERS_DEF = "racks or servers in data centers";

const MONTHS: Record<string, string> = {
  Jan: "01",
  Feb: "02",
  Mar: "03",
  Apr: "04",
  May: "05",
  Jun: "06",
  Jul: "07",
  Aug: "08",
  Sep: "09",
  Oct: "10",
  Nov: "11",
  Dec: "12",
};

function keep(reason: string): never {
  console.warn(`fetch-signals: ${reason}. Keeping the last committed JSON.`);
  process.exit(0);
}

async function download(url: string, ms: number): Promise<Buffer> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(ms),
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; HypergridSignals/1.0; +https://hypergrid.davidtphung.com)",
      accept: "*/*",
    },
  });
  if (!res.ok) throw new Error(`${url} status ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

function unzip(buf: Buffer): Map<string, Buffer> {
  if (buf.length < 4 || buf.readUInt32LE(0) !== 0x04034b50) {
    throw new Error("not a zip workbook");
  }
  const files = new Map<string, Buffer>();
  let i = 0;
  while (i + 30 < buf.length) {
    if (buf.readUInt32LE(i) !== 0x04034b50) break;
    const method = buf.readUInt16LE(i + 8);
    const flag = buf.readUInt16LE(i + 6);
    const compSize = buf.readUInt32LE(i + 18);
    const nameLen = buf.readUInt16LE(i + 26);
    const extraLen = buf.readUInt16LE(i + 28);
    const name = buf.subarray(i + 30, i + 30 + nameLen).toString("utf8");
    const start = i + 30 + nameLen + extraLen;
    if (flag & 0x8 || compSize === 0) throw new Error(`zip data descriptor on ${name}`);
    const comp = buf.subarray(start, start + compSize);
    const data = method === 0 ? comp : method === 8 ? zlib.inflateRawSync(comp) : null;
    if (!data) throw new Error(`zip method ${method}`);
    files.set(name, data);
    i = start + compSize;
  }
  return files;
}

function decodeXml(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function sharedStrings(xml: string): string[] {
  const out: string[] = [];
  for (const part of xml.split("<si>").slice(1)) {
    const body = part.split("</si>")[0] ?? "";
    const texts = [...body.matchAll(/<t[^>]*>([^<]*)<\/t>/g)].map((m) => decodeXml(m[1] ?? ""));
    out.push(texts.join(""));
  }
  return out;
}

function normHeader(s: string): string {
  return s.replace(/_x000D_/g, " ").replace(/\s+/g, " ").trim();
}

interface Cell {
  col: number;
  value: string;
}

function sheetRows(xml: string, strings: string[]): Map<number, Cell[]> {
  const rows = new Map<number, Cell[]>();
  const re = /<c r="([A-Z]+)(\d+)"([^>/]*)>([\s\S]*?)<\/c>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    const col = colIndex(m[1] ?? "");
    const row = Number(m[2]);
    const attrs = m[3] ?? "";
    const inner = m[4] ?? "";
    const raw = inner.match(/<v>([^<]*)<\/v>/)?.[1] ?? inner.match(/<t[^>]*>([^<]*)<\/t>/)?.[1] ?? "";
    let value = decodeXml(raw);
    if (/\bt="s"/.test(attrs)) value = strings[Number(value)] ?? "";
    const list = rows.get(row) ?? [];
    list.push({ col, value });
    rows.set(row, list);
  }
  return rows;
}

function colIndex(letters: string): number {
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n;
}

function workbookSheets(buf: Buffer): Map<number, Cell[]>[] {
  const files = unzip(buf);
  const shared = sharedStrings(files.get("xl/sharedStrings.xml")?.toString("utf8") ?? "");
  const names = [...files.keys()].filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n)).sort();
  return names.map((name) => sheetRows(files.get(name)?.toString("utf8") ?? "", shared));
}

function cell(rows: Map<number, Cell[]>, row: number, col: number): string {
  return rows.get(row)?.find((c) => c.col === col)?.value ?? "";
}

interface Point {
  month: string;
  value: number;
  flag: string;
}

function parseMonth(raw: string): { month: string; flag: string } | null {
  const m = raw.trim().match(/^([A-Za-z]{3})-(\d{2})([pr])?$/i);
  if (!m) return null;
  const mm = MONTHS[`${m[1]!.slice(0, 1).toUpperCase()}${m[1]!.slice(1, 3).toLowerCase()}`];
  if (!mm) return null;
  const yy = Number(m[2]);
  const year = yy >= 90 ? 1900 + yy : 2000 + yy;
  return { month: `${year}-${mm}`, flag: (m[3] ?? "").toLowerCase() };
}

function columnSeries(rows: Map<number, Cell[]>, header: string): Point[] {
  let headerRow = 0;
  let col = 0;
  for (const [row, cells] of rows) {
    for (const c of cells) {
      if (normHeader(c.value) === header) {
        headerRow = row;
        col = c.col;
      }
    }
    if (headerRow) break;
  }
  if (!headerRow) throw new Error(`missing column ${header}`);
  const points: Point[] = [];
  const rowNums = [...rows.keys()].filter((r) => r > headerRow).sort((a, b) => a - b);
  for (const row of rowNums) {
    const parsed = parseMonth(cell(rows, row, 1));
    if (!parsed) continue;
    if (parsed.month < "2014-01") continue;
    const raw = cell(rows, row, col).replace(/,/g, "").trim();
    if (!raw) continue;
    const numeric = Number(raw);
    if (!Number.isFinite(numeric)) throw new Error(`non numeric ${header} ${parsed.month}: ${raw}`);
    const value = Math.abs(numeric - Math.round(numeric)) < 1e-6 ? Math.round(numeric) : numeric;
    points.push({ month: parsed.month, value, flag: parsed.flag });
  }
  points.sort((a, b) => a.month.localeCompare(b.month));
  if (points.length < 24) throw new Error(`${header} has ${points.length} points`);
  return points;
}

function allText(sheets: Map<number, Cell[]>[]): string {
  const bits: string[] = [];
  for (const rows of sheets) {
    for (const cells of rows.values()) {
      for (const c of cells) if (c.value) bits.push(c.value);
    }
  }
  return bits.join("\n");
}

function releaseDate(text: string): string {
  const m = text.match(/Construction Spending,\s+([A-Z][a-z]+ \d{1,2}, \d{4})/);
  if (!m) throw new Error("release date not in workbook");
  const parsed = new Date(`${m[1]} UTC`);
  if (Number.isNaN(parsed.getTime())) throw new Error(`bad release date ${m[1]}`);
  const y = parsed.getUTCFullYear();
  const mo = String(parsed.getUTCMonth() + 1).padStart(2, "0");
  const d = String(parsed.getUTCDate()).padStart(2, "0");
  return `${y}-${mo}-${d}`;
}

interface SeriesOut {
  id: string;
  fredId: string | null;
  fredPage: string | null;
  fredVerifiedOpen: boolean;
  label: string;
  category: string;
  ownership: string;
  units: string;
  adjustment: string;
  frequency: "monthly";
  priceBasis: "nominal";
  priceNote: string;
  releaseDate: string;
  vintage: string;
  vintageNote: string;
  sourceUrl: string;
  sourceName: string;
  retrieved: string;
  evidence: "FACT";
  valueTag: "MEASUREMENT";
  points: Point[];
}

function series(partial: Omit<SeriesOut, "frequency" | "priceBasis" | "evidence" | "valueTag" | "releaseDate" | "vintage" | "vintageNote" | "retrieved" | "priceNote"> & {
  priceNote: string;
  releaseDate: string;
  retrieved: string;
}): SeriesOut {
  return {
    ...partial,
    frequency: "monthly",
    priceBasis: "nominal",
    vintage: `as revised through ${partial.releaseDate}`,
    vintageNote:
      "The historical workbook is the revised series in this release. Months marked r were revised. A month marked p is preliminary. This is not as first published.",
    evidence: "FACT",
    valueTag: "MEASUREMENT",
  };
}

async function fredLatest(id: string): Promise<{ month: string; value: number } | null> {
  try {
    const buf = await download(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${id}`, 12000);
    const lines = buf.toString("utf8").trim().split(/\r?\n/).slice(1).filter(Boolean);
    const last = lines[lines.length - 1];
    if (!last) return null;
    const [date, raw] = last.split(",");
    const value = Number(raw);
    if (!date || !Number.isFinite(value)) return null;
    return { month: date.slice(0, 7), value };
  } catch (err) {
    console.warn(`fetch-signals: FRED CSV ${id} not retrieved (${err instanceof Error ? err.message : err}).`);
    return null;
  }
}

async function main() {
  const retrieved = new Date().toISOString().slice(0, 10);
  let privateSa: Buffer;
  let privateNsa: Buffer;
  let totalNsa: Buffer;
  let release: Buffer;
  let definitions = "";
  try {
    [privateSa, privateNsa, totalNsa, release] = await Promise.all([
      download(URLS.privateSa, 25000),
      download(URLS.privateNsa, 25000),
      download(URLS.totalNsa, 25000),
      download(URLS.release, 25000),
    ]);
    try {
      definitions = (await download(URLS.definitions, 20000)).toString("utf8");
    } catch (err) {
      console.warn(`fetch-signals: definitions page not retrieved (${err instanceof Error ? err.message : err}).`);
    }
  } catch (err) {
    keep(err instanceof Error ? err.message : String(err));
  }

  let parsed;
  try {
    const saSheets = workbookSheets(privateSa);
    const nsaSheets = workbookSheets(privateNsa);
    const totalSheets = workbookSheets(totalNsa);
    const releaseSheets = workbookSheets(release);
    const releaseText = allText(releaseSheets);
    const dated = releaseDate(releaseText);
    if (!/not price changes/i.test(releaseText)) {
      throw new Error("release workbook does not say the figures are not adjusted for price changes");
    }
    const priceNote =
      "Nominal dollars. Table 1 of the release says the figures are adjusted for seasonality but not price changes. NSA values are monthly millions of dollars from the same release, not a price-adjusted series.";
    const sa = saSheets[0];
    const nsa = nsaSheets[0];
    const tot = totalSheets[0];
    if (!sa || !nsa || !tot) throw new Error("missing worksheet");
    if (definitions) {
      for (const quote of [DATA_CENTER_DEF, GENERAL_DEF, SERVERS_DEF]) {
        if (!definitions.includes(quote)) throw new Error("definitions page no longer contains a checked sentence");
      }
    } else if (!fs.existsSync(OUT_SRC)) {
      throw new Error("definitions page unavailable and no prior JSON");
    }

    const built: SeriesOut[] = [
      series({
        id: "C30-PRIVATE-DATA-CENTER-SAAR",
        fredId: null,
        fredPage: null,
        fredVerifiedOpen: false,
        label: "Private data center construction spending",
        category: "Data center",
        ownership: "private",
        units: "Millions of dollars, seasonally adjusted annual rate",
        adjustment: "seasonally adjusted annual rate",
        priceNote,
        releaseDate: dated,
        sourceUrl: URLS.privateSa,
        sourceName: "U.S. Census Bureau, Value of Private Construction Put in Place, seasonally adjusted annual rate",
        retrieved,
        points: columnSeries(sa, "Data center"),
      }),
      series({
        id: "C30-PRIVATE-DATA-CENTER-NSA",
        fredId: null,
        fredPage: null,
        fredVerifiedOpen: false,
        label: "Private data center construction spending, monthly not seasonally adjusted",
        category: "Data center",
        ownership: "private",
        units: "Millions of dollars, monthly not seasonally adjusted",
        adjustment: "monthly not seasonally adjusted",
        priceNote,
        releaseDate: dated,
        sourceUrl: URLS.privateNsa,
        sourceName: "U.S. Census Bureau, Value of Private Construction Put in Place, monthly not seasonally adjusted",
        retrieved,
        points: columnSeries(nsa, "Data center"),
      }),
      series({
        id: "C30-PRIVATE-OFFICE-GENERAL-SAAR",
        fredId: null,
        fredPage: null,
        fredVerifiedOpen: false,
        label: "Private general office construction spending",
        category: "General",
        ownership: "private",
        units: "Millions of dollars, seasonally adjusted annual rate",
        adjustment: "seasonally adjusted annual rate",
        priceNote,
        releaseDate: dated,
        sourceUrl: URLS.privateSa,
        sourceName: "U.S. Census Bureau, Value of Private Construction Put in Place, seasonally adjusted annual rate",
        retrieved,
        points: columnSeries(sa, "General"),
      }),
      series({
        id: "C30-PRIVATE-OFFICE-GENERAL-NSA",
        fredId: null,
        fredPage: null,
        fredVerifiedOpen: false,
        label: "Private general office construction spending, monthly not seasonally adjusted",
        category: "General",
        ownership: "private",
        units: "Millions of dollars, monthly not seasonally adjusted",
        adjustment: "monthly not seasonally adjusted",
        priceNote,
        releaseDate: dated,
        sourceUrl: URLS.privateNsa,
        sourceName: "U.S. Census Bureau, Value of Private Construction Put in Place, monthly not seasonally adjusted",
        retrieved,
        points: columnSeries(nsa, "General"),
      }),
      series({
        id: "PROFCONS",
        fredId: "PROFCONS",
        fredPage: FRED.PROFCONS,
        fredVerifiedOpen: true,
        label: "Private Census Office construction spending",
        category: "Office",
        ownership: "private",
        units: "Millions of dollars, seasonally adjusted annual rate",
        adjustment: "seasonally adjusted annual rate",
        priceNote,
        releaseDate: dated,
        sourceUrl: URLS.privateSa,
        sourceName: "U.S. Census Bureau, Value of Private Construction Put in Place, seasonally adjusted annual rate",
        retrieved,
        points: columnSeries(sa, "Office"),
      }),
      series({
        id: "C30-PRIVATE-OFFICE-NSA",
        fredId: null,
        fredPage: null,
        fredVerifiedOpen: false,
        label: "Private Census Office construction spending, monthly not seasonally adjusted",
        category: "Office",
        ownership: "private",
        units: "Millions of dollars, monthly not seasonally adjusted",
        adjustment: "monthly not seasonally adjusted",
        priceNote,
        releaseDate: dated,
        sourceUrl: URLS.privateNsa,
        sourceName: "U.S. Census Bureau, Value of Private Construction Put in Place, monthly not seasonally adjusted",
        retrieved,
        points: columnSeries(nsa, "Office"),
      }),
      series({
        id: "TLOFCON",
        fredId: "TLOFCON",
        fredPage: FRED.TLOFCON,
        fredVerifiedOpen: true,
        label: "Total Census Office construction spending, monthly not seasonally adjusted",
        category: "Office",
        ownership: "total, private plus public",
        units: "Millions of dollars, monthly not seasonally adjusted",
        adjustment: "monthly not seasonally adjusted",
        priceNote,
        releaseDate: dated,
        sourceUrl: URLS.totalNsa,
        sourceName: "U.S. Census Bureau, Value of Construction Put in Place, monthly not seasonally adjusted",
        retrieved,
        points: columnSeries(tot, "Total Office"),
      }),
    ];

    const fredChecks = [];
    for (const id of ["PROFCONS", "TLOFCON"] as const) {
      const row = built.find((s) => s.id === id);
      const latest = row?.points[row.points.length - 1];
      const fred = await fredLatest(id);
      fredChecks.push({
        id,
        page: FRED[id],
        verifiedOpen: true,
        openedOn: "2026-10-04",
        csv: fred,
        censusMonth: latest?.month ?? null,
        censusValue: latest?.value ?? null,
        matchesCensus: Boolean(fred && latest && fred.month === latest.month && fred.value === latest.value),
      });
    }

    const payload = {
      note: "Dollars of construction put in place. Not megawatts. Not added to a counted kind. Does not change counted IT load.",
      retrieved,
      releaseDate: built[0]?.releaseDate ?? null,
      vintage: built[0]?.vintage ?? null,
      definitions: {
        sourceUrl: URLS.definitions,
        checked: definitions ? retrieved : "2026-10-04",
        confirmedThisRun: Boolean(definitions),
        dataCenter: DATA_CENTER_DEF,
        general: GENERAL_DEF,
        office: OFFICE_DEF,
        racksOrServers: SERVERS_DEF,
      },
      fred: {
        officeSaar: { id: "PROFCONS", page: FRED.PROFCONS, verifiedOpen: true },
        officeNsaTotal: { id: "TLOFCON", page: FRED.TLOFCON, verifiedOpen: true },
        dataCenterSearch: {
          url: FRED.search,
          openedOn: "2026-10-04",
          verifiedOpen: true,
          result:
            "No Census construction spending series for data centers. The Census-tagged hits were discontinued purchased computer services series, not value of construction put in place.",
        },
        csvChecks: fredChecks,
      },
      links: {
        release: URLS.current,
        releaseWorkbook: URLS.release,
        historical: URLS.historical,
        definitions: URLS.definitions,
      },
      series: built,
    };

    const json = `${JSON.stringify(payload, null, 2)}\n`;
    fs.mkdirSync(path.dirname(OUT_SRC), { recursive: true });
    fs.writeFileSync(OUT_SRC, json);
    fs.writeFileSync(OUT_PUBLIC, json);
    const dc = built[0]?.points.at(-1);
    console.log(`fetch-signals: wrote ${built.length} series, latest data center ${dc?.month} ${dc?.value}`);
  } catch (err) {
    keep(err instanceof Error ? err.message : String(err));
  }
}

await main();
