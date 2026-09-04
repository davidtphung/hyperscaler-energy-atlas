import rawCsv from "./forecast-electricity.csv?raw";

// Forecast Lab pins. Every TWh row is parsed from the embedded CSV with no
// invented intermediates. Peak GW cards are listed separately and never share
// the TWh axis. Bottleneck ranges are Energy Desk estimates, not measurements.

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

export interface BottleneckRange {
  id: string;
  label: string;
  short: string;
  lowMonths: number;
  highMonths: number;
  highOpen: boolean;
  provenance: "desk-estimate";
  provenanceLabel: string;
  numberKind: NumberKind;
  notes: string;
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

export const FORECAST_CSV_ROW_COUNT = 20;

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

export const BOTTLENECKS: BottleneckRange[] = [
  {
    id: "xfmr",
    label: "Large power transformers",
    short: "XFMR lead time",
    lowMonths: 18,
    highMonths: 36,
    highOpen: false,
    provenance: "desk-estimate",
    provenanceLabel: "desk estimate, not a measurement",
    numberKind: "assumed",
    notes: "Typical lead. Energy Desk range. Not a measurement.",
  },
  {
    id: "interconnect",
    label: "Interconnect / restudy queues",
    short: "Interconnect restudy",
    lowMonths: 24,
    highMonths: 84,
    highOpen: false,
    provenance: "desk-estimate",
    provenanceLabel: "desk estimate, not a measurement",
    numberKind: "assumed",
    notes: "Common for large loads. Energy Desk range. Not a measurement.",
  },
  {
    id: "btm",
    label: "BTM gas / solar + BESS COD",
    short: "BTM COD",
    lowMonths: 12,
    highMonths: 36,
    highOpen: false,
    provenance: "desk-estimate",
    provenanceLabel: "desk estimate, not a measurement",
    numberKind: "assumed",
    notes: "Behind-the-meter gas or solar plus battery commercial operation. Energy Desk range. Not a measurement.",
  },
  {
    id: "nuclear",
    label: "New nuclear COD",
    short: "Nuclear",
    lowMonths: 96,
    highMonths: 180,
    highOpen: true,
    provenance: "desk-estimate",
    provenanceLabel: "desk estimate, not a measurement",
    numberKind: "assumed",
    notes: "8 to 15+ years to commercial operation. Energy Desk range. Not a measurement.",
  },
];

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

export function pinFromBottleneck(b: BottleneckRange): InspectablePin {
  const high = b.highOpen ? `${b.highMonths / 12}+ years` : `${b.highMonths} months`;
  return {
    id: b.id,
    title: b.label,
    value: `${b.lowMonths} to ${b.highMonths}${b.highOpen ? "+" : ""}`,
    unit: "months (desk range)",
    year: "range",
    geography: "desk",
    status: b.provenance,
    scenario: "desk",
    source: "Energy Desk",
    sourceUrl: "",
    notes: `${b.provenanceLabel}. ${b.notes} Low ${b.lowMonths} months. High ${high}.`,
    numberKind: b.numberKind,
  };
}
