import rawCsv from "./forecast-electricity.csv?raw";

// Forecast Lab pins. Every TWh row is parsed from the embedded CSV with no
// invented intermediates. Peak GW cards are listed separately and never share
// the TWh axis. Bottleneck pins are sourced ranges and durations only.

export type ForecastGeo = "world" | "US";
export type ForecastStatus = "historical" | "estimate" | "scenario";
export type FanCase = "bear" | "base" | "bull";
export type NumberKind = "sourced" | "assumed";

export interface ForecastTwhPoint {
  id: string;
  geography: ForecastGeo;
  year: number;
  twh: number;
  unit: "TWh";
  status: ForecastStatus;
  scenario: string;
  source: string;
  sourceUrl: string;
  notes: string;
  numberKind: NumberKind;
}

export interface ForecastPeakCard {
  id: string;
  label: string;
  gw: number;
  year: number;
  geography: string;
  unit: "GW peak" | "GW incremental";
  source: string;
  sourceUrl: string;
  status: string;
  scenario: string;
  notes: string;
  numberKind: NumberKind;
}

export type BottleneckUnit = "years" | "months" | "days";
export type BottleneckKind = "range" | "open" | "duration";

/** Sourced bottleneck pin. Display-scale days are derived, never a midpoint. */
export interface BottleneckPin {
  id: string;
  label: string;
  short: string;
  kind: BottleneckKind;
  valueLow: number;
  valueHigh: number | null;
  unit: BottleneckUnit;
  approx: boolean;
  openHigh: boolean;
  displayLabel: string;
  source: string;
  sourceUrl: string;
  year: string;
  geography: string;
  notes: string;
  numberKind: "sourced";
}

export interface BottleneckChip {
  id: string;
  label: string;
  value: string;
  unit: string;
  source: string;
  sourceUrl: string;
  year: string;
  geography: string;
  notes: string;
  numberKind: "sourced";
}

export interface InspectablePin {
  id: string;
  title: string;
  value: string;
  unit: string;
  year: string;
  geography: string;
  status: string;
  scenario: string;
  source: string;
  sourceUrl: string;
  notes: string;
  numberKind: NumberKind;
}

export const FORECAST_CSV_ROW_COUNT = 21;

const EXPECTED_STATUSES = new Set<ForecastStatus>(["historical", "estimate", "scenario"]);

function parseCsv(text: string): ForecastTwhPoint[] {
  const lines = text.replace(/^\uFEFF/, "").trim().split(/\r?\n/);
  const header = lines[0]?.split(",") ?? [];
  const expected = ["geography", "year", "twh", "status", "scenario", "source", "sourceUrl", "notes"];
  if (header.length !== expected.length || expected.some((h, i) => header[i] !== h)) {
    throw new Error(`forecast CSV header mismatch: ${header.join(",")}`);
  }
  const rows: ForecastTwhPoint[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const cols = splitCsvLine(line);
    if (cols.length !== 8) throw new Error(`forecast CSV row ${i + 1} has ${cols.length} fields`);
    const geography = cols[0];
    if (geography !== "world" && geography !== "US") {
      throw new Error(`forecast CSV row ${i + 1} bad geography: ${geography}`);
    }
    const year = Number(cols[1]);
    const twh = Number(cols[2]);
    const status = cols[3] as ForecastStatus;
    if (!EXPECTED_STATUSES.has(status)) throw new Error(`forecast CSV row ${i + 1} bad status: ${status}`);
    if (!Number.isFinite(year) || !Number.isFinite(twh)) {
      throw new Error(`forecast CSV row ${i + 1} non-numeric year or twh`);
    }
    rows.push({
      id: `twh-${geography}-${year}-${cols[5]}-${cols[4] || status}`,
      geography,
      year,
      twh,
      unit: "TWh",
      status,
      scenario: cols[4],
      source: cols[5],
      sourceUrl: cols[6],
      notes: cols[7],
      numberKind: "sourced",
    });
  }
  return rows;
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

export const FORECAST_TWH: ForecastTwhPoint[] = parseCsv(rawCsv);

if (FORECAST_TWH.length !== FORECAST_CSV_ROW_COUNT) {
  throw new Error(`forecast CSV must have ${FORECAST_CSV_ROW_COUNT} data rows, got ${FORECAST_TWH.length}`);
}

const LBNL_US_YEARS = FORECAST_TWH.filter((p) => p.geography === "US" && p.source.startsWith("LBNL")).map((p) => p.year);
if (LBNL_US_YEARS.includes(2017) || [2019, 2020, 2021, 2022].some((y) => LBNL_US_YEARS.includes(y))) {
  throw new Error("Do not invent LBNL 2017 or 2019-2022 yearly intermediates");
}

const IEA_AI_PDF =
  "https://iea.blob.core.windows.net/assets/3179f7f8-01f6-4dd6-bffa-c9f7b73f1dc9/KeyQuestionsonEnergyandAI.pdf";
const UTILITY_DIVE_GT =
  "https://www.utilitydive.com/news/5-year-waits-and-rising-costs-how-demand-is-redefining-the-gas-turbine-mar/813385/";
const IEA_BESS =
  "https://www.iea.org/commentaries/battery-storage-is-scaling-up-and-taking-on-a-larger-system-role";
const VOGTLE_URL = "https://www.southernnuclear.com/our-plants/plant-vogtle.html";

/** Calendar conversion for strip scale only. Not a sourced midpoint. */
export function bottleneckToDays(value: number, unit: BottleneckUnit): number {
  if (unit === "years") return value * 365;
  if (unit === "months") return (value * 365) / 12;
  return value;
}

export const BOTTLENECK_SCALE_DAYS = 10 * 365;

export const BOTTLENECKS: BottleneckPin[] = [
  {
    id: "xfmr",
    label: "Large power transformers",
    short: "XFMR",
    kind: "range",
    valueLow: 2,
    valueHigh: 3,
    unit: "years",
    approx: false,
    openHigh: false,
    displayLabel: "2 to 3 years",
    source: "IEA",
    sourceUrl: IEA_AI_PDF,
    year: "2026",
    geography: "world",
    notes: "Transformers average 2 to 3 years. Key Questions on Energy and AI §1.3.",
    numberKind: "sourced",
  },
  {
    id: "interconnect",
    label: "Grid connection wait",
    short: "Interconnect",
    kind: "range",
    valueLow: 5,
    valueHigh: 10,
    unit: "years",
    approx: false,
    openHigh: false,
    displayLabel: "5 to 10 years",
    source: "IEA",
    sourceUrl: IEA_AI_PDF,
    year: "2026",
    geography: "many jurisdictions",
    notes: "Grid connection waits 5 to 10 years in many jurisdictions. Key Questions on Energy and AI §1.3. Not a restudy-months figure.",
    numberKind: "sourced",
  },
  {
    id: "gt-large",
    label: "BTM large gas turbine",
    short: "Large GT",
    kind: "open",
    valueLow: 5,
    valueHigh: null,
    unit: "years",
    approx: false,
    openHigh: true,
    displayLabel: ">5 years",
    source: "EPRI / Utility Dive",
    sourceUrl: UTILITY_DIVE_GT,
    year: "2026",
    geography: "US",
    notes: "Noble via EPRI: large GT order to delivery greater than 5 years. No sourced high. Not a midpoint.",
    numberKind: "sourced",
  },
  {
    id: "gt-small",
    label: "BTM small gas turbine",
    short: "Small GT",
    kind: "range",
    valueLow: 18,
    valueHigh: 36,
    unit: "months",
    approx: false,
    openHigh: false,
    displayLabel: "18 to 36 months",
    source: "EPRI / Utility Dive",
    sourceUrl: UTILITY_DIVE_GT,
    year: "2026",
    geography: "US",
    notes: "Noble via EPRI: small GT order to delivery 18 to 36 months. Separate from large GT.",
    numberKind: "sourced",
  },
  {
    id: "solar-build",
    label: "BTM solar construction",
    short: "Solar build",
    kind: "duration",
    valueLow: 220,
    valueHigh: null,
    unit: "days",
    approx: true,
    openHigh: false,
    displayLabel: "~220 days",
    source: "IEA",
    sourceUrl: IEA_BESS,
    year: "",
    geography: "world",
    notes: "IEA: solar median construction about 220 days. Duration, not a low-high range. Year not stated on the pin list.",
    numberKind: "sourced",
  },
  {
    id: "bess-build",
    label: "BTM BESS construction",
    short: "BESS build",
    kind: "duration",
    valueLow: 275,
    valueHigh: null,
    unit: "days",
    approx: true,
    openHigh: false,
    displayLabel: "~275 days",
    source: "IEA",
    sourceUrl: IEA_BESS,
    year: "",
    geography: "world",
    notes: "IEA: BESS median construction about 275 days. Duration, not a low-high range. Year not stated on the pin list.",
    numberKind: "sourced",
  },
  {
    id: "solar-bess-ttm",
    label: "BTM solar + BESS time to market",
    short: "Solar+BESS TTM",
    kind: "range",
    valueLow: 2,
    valueHigh: 2.5,
    unit: "years",
    approx: true,
    openHigh: false,
    displayLabel: "~2 to 2.5 years",
    source: "IEA",
    sourceUrl: IEA_BESS,
    year: "",
    geography: "US / EU / JP",
    notes: "IEA: US, EU, and Japan time-to-market often about 2 to 2.5 years. Not merged with the 220-day or 275-day construction medians.",
    numberKind: "sourced",
  },
  {
    id: "nuclear",
    label: "New nuclear construction",
    short: "Nuclear",
    kind: "open",
    valueLow: 6,
    valueHigh: null,
    unit: "years",
    approx: false,
    openHigh: true,
    displayLabel: ">6 years",
    source: "IEA",
    sourceUrl: IEA_AI_PDF,
    year: "2026",
    geography: "world",
    notes: "IEA: construction greater than 6 years. No sourced high. Vogtle CODs are chips, not a duration bar.",
    numberKind: "sourced",
  },
];

if (BOTTLENECKS.some((b) => b.numberKind !== "sourced")) {
  throw new Error("Default bottleneck strip may not carry assumed desk estimates");
}

export const BOTTLENECK_CHIPS: BottleneckChip[] = [
  {
    id: "iea-gt-5y",
    label: "IEA GT deliveries",
    value: "~5",
    unit: "years",
    source: "IEA",
    sourceUrl: IEA_AI_PDF,
    year: "2026",
    geography: "world",
    notes: "IEA: gas turbine deliveries about 5 years. Point figure, not a range. Not averaged with the EPRI >5 year large-GT pin.",
    numberKind: "sourced",
  },
  {
    id: "vogtle-3",
    label: "Vogtle Unit 3 COD",
    value: "31 Jul 2023",
    unit: "COD date",
    source: "Southern Nuclear",
    sourceUrl: VOGTLE_URL,
    year: "2023",
    geography: "US",
    notes: "Plant Vogtle Unit 3 commercial operation 31 Jul 2023. Date chip, not a lead-time bar.",
    numberKind: "sourced",
  },
  {
    id: "vogtle-4",
    label: "Vogtle Unit 4 COD",
    value: "29 Apr 2024",
    unit: "COD date",
    source: "Southern Nuclear",
    sourceUrl: VOGTLE_URL,
    year: "2024",
    geography: "US",
    notes: "Plant Vogtle Unit 4 commercial operation 29 Apr 2024. Date chip, not a lead-time bar.",
    numberKind: "sourced",
  },
];

export const ERCOT_QUEUE_NOTE =
  "ERCOT large-load queue grew from about 63 GW in Dec 2024 to 230+ GW in Jan 2026. Queue size, not months to interconnection agreement. Not plotted as a lead-time bar.";

export const GT_FAST_PATH_CALLOUT =
  "Large GT is not the fast path. Solar plus BESS scaffolding is often faster.";

export const PEAK_GW_CARDS: ForecastPeakCard[] = [
  {
    id: "epri-2030-low",
    label: "EPRI 2030 peak Low",
    gw: 45,
    year: 2030,
    geography: "US",
    unit: "GW peak",
    source: "EPRI",
    sourceUrl: "https://powering-intelligence.epri.com/executive-summary.html",
    status: "scenario",
    scenario: "Low",
    notes: "Peak demand, not annual TWh. Separate from the electricity chart.",
    numberKind: "sourced",
  },
  {
    id: "epri-2030-med",
    label: "EPRI 2030 peak Med",
    gw: 71,
    year: 2030,
    geography: "US",
    unit: "GW peak",
    source: "EPRI",
    sourceUrl: "https://powering-intelligence.epri.com/executive-summary.html",
    status: "scenario",
    scenario: "Med",
    notes: "Peak demand, not annual TWh. Separate from the electricity chart.",
    numberKind: "sourced",
  },
  {
    id: "epri-2030-high",
    label: "EPRI 2030 peak High",
    gw: 94,
    year: 2030,
    geography: "US",
    unit: "GW peak",
    source: "EPRI",
    sourceUrl: "https://powering-intelligence.epri.com/executive-summary.html",
    status: "scenario",
    scenario: "High",
    notes: "Peak demand, not annual TWh. Separate from the electricity chart.",
    numberKind: "sourced",
  },
  {
    id: "doe-2030-midpoint",
    label: "DOE midpoint incremental",
    gw: 50,
    year: 2030,
    geography: "US",
    unit: "GW incremental",
    source: "DOE",
    sourceUrl: "https://www.energy.gov/sites/default/files/2025-07/DOE%20Final%20EO%20Report%20(FINAL%20JULY%207)_0.pdf",
    status: "estimate",
    scenario: "Midpoint",
    notes: "Plus 50 GW incremental by 2030. Not a stock total. Not annual TWh.",
    numberKind: "sourced",
  },
];

export const FAN_CASE_META: Record<
  FanCase,
  {
    label: string;
    color: string;
    us: { source: string; scenario: string; twh: number; year: number };
    world: { source: string; scenario: string; twh: number; year: number };
    note: string;
  }
> = {
  bear: {
    label: "Bear",
    color: "#9aa3ad",
    us: { source: "LBNL-2025", scenario: "Compounded-Low", twh: 521, year: 2030 },
    world: { source: "IEA", scenario: "Headwinds", twh: 833, year: 2030 },
    note: "LBNL Compounded-Low 521 TWh US 2030. IEA Headwinds 833 TWh world.",
  },
  base: {
    label: "Base",
    color: "#f5d547",
    us: { source: "LBNL-2025", scenario: "Reference", twh: 649, year: 2030 },
    world: { source: "IEA", scenario: "Base", twh: 945, year: 2030 },
    note: "LBNL Reference 649 TWh US. IEA Base 945 TWh world / 426 TWh US.",
  },
  bull: {
    label: "Bull",
    color: "#36c5bf",
    us: { source: "LBNL-2025", scenario: "Compounded-High", twh: 843, year: 2030 },
    world: { source: "IEA", scenario: "Lift-Off", twh: 1008, year: 2030 },
    note: "LBNL Compounded-High 843 TWh US. IEA Lift-Off 1008 TWh world.",
  },
};

export const SOURCE_SERIES_COLOR: Record<string, string> = {
  IEA: "#7fc4ec",
  "LBNL-2024": "#c8f135",
  "LBNL-2025": "#c8f135",
  EPRI: "#f2a93b",
  DOE: "#ef6f53",
};

export const CONFLICT_CALLOUT = {
  title: "Two US models, not one series",
  body: "LBNL US 2023-24 (176 / 192 TWh) sits above IEA US (154 / 183 TWh). Two models. Show both. Never average silently.",
};

export function twhForGeo(geo: ForecastGeo): ForecastTwhPoint[] {
  return FORECAST_TWH.filter((p) => p.geography === geo);
}

export function historyPoints(geo: ForecastGeo, sourcePrefix?: string): ForecastTwhPoint[] {
  return twhForGeo(geo)
    .filter((p) => p.status === "historical" || p.status === "estimate")
    .filter((p) => (sourcePrefix ? p.source.startsWith(sourcePrefix) : true))
    .sort((a, b) => a.year - b.year || a.source.localeCompare(b.source));
}

export function scenarioPoints(geo: ForecastGeo): ForecastTwhPoint[] {
  return twhForGeo(geo).filter((p) => p.status === "scenario");
}

export function fanAnchor(geo: ForecastGeo, caseKey: FanCase): ForecastTwhPoint {
  const spec = FAN_CASE_META[caseKey][geo === "US" ? "us" : "world"];
  const hit = FORECAST_TWH.find(
    (p) =>
      p.geography === geo &&
      p.year === spec.year &&
      p.twh === spec.twh &&
      p.source === spec.source &&
      p.scenario === spec.scenario
  );
  if (!hit) {
    throw new Error(`Missing sourced fan pin ${caseKey} ${geo} ${spec.twh}`);
  }
  return hit;
}

export function ieaUsBase2030(): ForecastTwhPoint {
  const hit = FORECAST_TWH.find(
    (p) => p.geography === "US" && p.source === "IEA" && p.scenario === "Base" && p.year === 2030 && p.twh === 426
  );
  if (!hit) throw new Error("Missing IEA US Base 426 TWh 2030");
  return hit;
}

export function lastHistoryOrEstimate(points: ForecastTwhPoint[]): ForecastTwhPoint | undefined {
  const sorted = [...points].sort((a, b) => a.year - b.year);
  return sorted[sorted.length - 1];
}

export function pinFromTwh(p: ForecastTwhPoint): InspectablePin {
  return {
    id: p.id,
    title: `${p.source}${p.scenario ? ` ${p.scenario}` : ""} ${p.geography} ${p.year}`,
    value: String(p.twh),
    unit: p.unit,
    year: String(p.year),
    geography: p.geography,
    status: p.status,
    scenario: p.scenario || "none",
    source: p.source,
    sourceUrl: p.sourceUrl,
    notes: p.notes,
    numberKind: p.numberKind,
  };
}

export function pinFromPeak(p: ForecastPeakCard): InspectablePin {
  return {
    id: p.id,
    title: p.label,
    value: String(p.gw),
    unit: p.unit,
    year: String(p.year),
    geography: p.geography,
    status: p.status,
    scenario: p.scenario,
    source: p.source,
    sourceUrl: p.sourceUrl,
    notes: p.notes,
    numberKind: p.numberKind,
  };
}

export function pinFromBottleneck(b: BottleneckPin): InspectablePin {
  return {
    id: b.id,
    title: b.label,
    value: b.displayLabel,
    unit: b.unit,
    year: b.year || "not stated",
    geography: b.geography,
    status: "sourced",
    scenario: b.kind,
    source: b.source,
    sourceUrl: b.sourceUrl,
    notes: b.notes,
    numberKind: b.numberKind,
  };
}

export function pinFromBottleneckChip(c: BottleneckChip): InspectablePin {
  return {
    id: c.id,
    title: c.label,
    value: c.value,
    unit: c.unit,
    year: c.year || "not stated",
    geography: c.geography,
    status: "sourced",
    scenario: "chip",
    source: c.source,
    sourceUrl: c.sourceUrl,
    notes: c.notes,
    numberKind: c.numberKind,
  };
}
