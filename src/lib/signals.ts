import file from "../data/signals.json" with { type: "json" };
import { formatFullDate, formatMonthYear } from "./format.ts";

export interface SignalPoint {
  month: string;
  value: number;
  flag: string;
}

export interface SignalSeries {
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
  points: SignalPoint[];
}

export interface SignalFile {
  note: string;
  retrieved: string;
  releaseDate: string;
  vintage: string;
  definitions: {
    sourceUrl: string;
    checked: string;
    confirmedThisRun: boolean;
    dataCenter: string;
    general: string;
    office: string;
    racksOrServers: string;
  };
  fred: {
    officeSaar: { id: string; page: string; verifiedOpen: boolean };
    officeNsaTotal: { id: string; page: string; verifiedOpen: boolean };
    dataCenterSearch: { url: string; openedOn: string; verifiedOpen: boolean; result: string };
    csvChecks: {
      id: string;
      page: string;
      verifiedOpen: boolean;
      openedOn: string;
      csv: { month: string; value: number } | null;
      censusMonth: string | null;
      censusValue: number | null;
      matchesCensus: boolean;
    }[];
  };
  links: {
    release: string;
    releaseWorkbook: string;
    historical: string;
    definitions: string;
  };
  series: SignalSeries[];
}

export const SIGNALS = file as SignalFile;

export const DC_SA = "C30-PRIVATE-DATA-CENTER-SAAR";
export const GEN_SA = "C30-PRIVATE-OFFICE-GENERAL-SAAR";

const YOY_WORDS = "latest month minus the same month a year earlier, divided by that earlier month";
const SINCE_WORDS = "latest month minus January 2021";
const SINCE_PCT_WORDS = "(latest month minus January 2021) / January 2021";
const GAP_WORDS =
  "private data center SAAR minus private general office SAAR. This subtracts two different categories. It is a comparison, not a total.";

export function seriesById(id: string): SignalSeries {
  const found = SIGNALS.series.find((series) => series.id === id);
  if (!found) throw new Error(`missing series ${id}`);
  return found;
}

export function latestPoint(series: SignalSeries): SignalPoint {
  const point = series.points[series.points.length - 1];
  if (!point) throw new Error(`empty series ${series.id}`);
  return point;
}

export function pointAt(series: SignalSeries, month: string): SignalPoint | null {
  return series.points.find((point) => point.month === month) ?? null;
}

export function shiftMonth(month: string, delta: number): string {
  const [year, mon] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, (mon ?? 1) - 1 + delta, 1));
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function formatBillions(millions: number): string {
  const sign = millions < 0 ? "-" : "";
  return `${sign}$${Math.abs(millions / 1000).toFixed(2)}B`;
}

export function formatSignedBillions(millions: number): string {
  const sign = millions > 0 ? "+" : millions < 0 ? "-" : "";
  return `${sign}$${Math.abs(millions / 1000).toFixed(2)}B`;
}

export function formatPercent(ratio: number): string {
  const pct = ratio * 100;
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

export function formatMillions(millions: number): string {
  const sign = millions < 0 ? "-" : "";
  return `${sign}${Math.abs(Math.round(millions)).toLocaleString("en-US")}`;
}

export function flagLabel(flag: string): string {
  if (flag === "p") return "preliminary";
  if (flag === "r") return "revised";
  return "no preliminary or revised mark";
}

export function basisLine(series: SignalSeries, point: SignalPoint): string {
  const monthlyNsa = series.adjustment.toLowerCase().includes("not seasonally");
  const adjustment = monthlyNsa ? "Monthly not seasonally adjusted" : "Seasonally adjusted annual rate";
  const release = formatFullDate(series.releaseDate);
  return `Base month ${formatMonthYear(point.month)}, ${flagLabel(point.flag)}. ${adjustment}. Nominal dollars, not real. Vintage as revised through ${release}. Release date ${release}.`;
}

export interface Change {
  latest: SignalPoint;
  prior: SignalPoint;
  change: number;
  ratio: number;
}

export function yearOverYear(series: SignalSeries, month: string): Change | null {
  const latest = pointAt(series, month);
  const prior = pointAt(series, shiftMonth(month, -12));
  if (!latest || !prior || prior.value === 0) return null;
  return { latest, prior, change: latest.value - prior.value, ratio: (latest.value - prior.value) / prior.value };
}

export function changeSince(series: SignalSeries, month: string, baseMonth: string): Change | null {
  const latest = pointAt(series, month);
  const prior = pointAt(series, baseMonth);
  if (!latest || !prior || prior.value === 0) return null;
  return { latest, prior, change: latest.value - prior.value, ratio: (latest.value - prior.value) / prior.value };
}

export function roundsToBillion(millions: number, claimBillions: number): boolean {
  return Math.round(millions / 1000) === claimBillions;
}

export function roundsToPercent(ratio: number, claimPercent: number): boolean {
  return Math.round(ratio * 100) === claimPercent;
}

export interface ChartRow {
  month: string;
  dataCenter: number;
  general: number;
}

export function chartRows(): ChartRow[] {
  const dataCenter = seriesById(DC_SA);
  const general = seriesById(GEN_SA);
  const rows: ChartRow[] = [];
  for (const point of dataCenter.points) {
    if (point.month < "2021-01") continue;
    const other = pointAt(general, point.month);
    if (!other) continue;
    rows.push({ month: point.month, dataCenter: point.value, general: other.value });
  }
  return rows;
}

export interface ClaimCheck {
  id: string;
  claim: string;
  census: string;
  formula: string;
  basis: string;
  matched: boolean;
}

export function claimChecks(): ClaimCheck[] {
  const dataCenter = seriesById(DC_SA);
  const general = seriesById(GEN_SA);
  const end = latestPoint(dataCenter);
  const yoy = yearOverYear(dataCenter, end.month);
  const june = yearOverYear(dataCenter, "2026-06");
  const since = changeSince(dataCenter, end.month, "2021-01");
  const genYoy = yearOverYear(general, end.month);
  const genNow = pointAt(general, end.month);
  const gap = genNow ? end.value - genNow.value : null;
  const dcBasis = basisLine(dataCenter, end);
  const genBasis = genNow ? basisLine(general, genNow) : "General office value for this month is not in the file.";
  const junePoint = pointAt(dataCenter, "2026-06");
  const juneBasis = junePoint ? basisLine(dataCenter, junePoint) : "June 2026 is not in the file.";

  const rows: ClaimCheck[] = [];
  if (yoy) {
    rows.push({
      id: "dc-aug-yoy",
      claim: "+73% year over year in Aug 2026",
      census: formatPercent(yoy.ratio),
      formula: `(${formatMillions(yoy.latest.value)} - ${formatMillions(yoy.prior.value)}) / ${formatMillions(yoy.prior.value)} = ${formatPercent(yoy.ratio)}. ${YOY_WORDS}.`,
      basis: dcBasis,
      matched: roundsToPercent(yoy.ratio, 73),
    });
  }
  rows.push({
    id: "dc-aug-level",
    claim: "record annualized $85B in Aug 2026",
    census: formatBillions(end.value),
    formula: `${formatMillions(end.value)} million dollars is ${formatBillions(end.value)}. The stored value is the seasonally adjusted annual rate, not a monthly amount times 12.`,
    basis: dcBasis,
    matched: roundsToBillion(end.value, 85),
  });
  if (june) {
    rows.push({
      id: "dc-jun-yoy",
      claim: "+65% year over year in June",
      census: formatPercent(june.ratio),
      formula: `(${formatMillions(june.latest.value)} - ${formatMillions(june.prior.value)}) / ${formatMillions(june.prior.value)} = ${formatPercent(june.ratio)}. ${YOY_WORDS}. June 2026 against June 2025.`,
      basis: juneBasis,
      matched: roundsToPercent(june.ratio, 65),
    });
  }
  if (since) {
    rows.push({
      id: "dc-since-level",
      claim: "+$76B since the start of 2021",
      census: formatSignedBillions(since.change),
      formula: `${formatMillions(since.latest.value)} - ${formatMillions(since.prior.value)} = ${formatSignedBillions(since.change)}. ${SINCE_WORDS}. Start of 2021 is January 2021 in this file.`,
      basis: dcBasis,
      matched: roundsToBillion(since.change, 76),
    });
    rows.push({
      id: "dc-since-pct",
      claim: "+823% since the start of 2021",
      census: formatPercent(since.ratio),
      formula: `(${formatMillions(since.latest.value)} - ${formatMillions(since.prior.value)}) / ${formatMillions(since.prior.value)} = ${formatPercent(since.ratio)}. ${SINCE_PCT_WORDS}.`,
      basis: dcBasis,
      matched: roundsToPercent(since.ratio, 823),
    });
  }
  if (genYoy && genNow) {
    rows.push({
      id: "gen-yoy",
      claim: "general office -10% year over year",
      census: formatPercent(genYoy.ratio),
      formula: `(${formatMillions(genYoy.latest.value)} - ${formatMillions(genYoy.prior.value)}) / ${formatMillions(genYoy.prior.value)} = ${formatPercent(genYoy.ratio)}. ${YOY_WORDS}.`,
      basis: genBasis,
      matched: roundsToPercent(genYoy.ratio, -10),
    });
    rows.push({
      id: "gen-level",
      claim: "general office $46B",
      census: formatBillions(genNow.value),
      formula: `${formatMillions(genNow.value)} million dollars is ${formatBillions(genNow.value)}. General is the Census office subcategory, not the Office total.`,
      basis: genBasis,
      matched: roundsToBillion(genNow.value, 46),
    });
  }
  if (gap != null && genNow) {
    rows.push({
      id: "gap",
      claim: "gap $39B",
      census: formatBillions(gap),
      formula: `${formatMillions(end.value)} - ${formatMillions(genNow.value)} = ${formatBillions(gap)}. ${GAP_WORDS}`,
      basis: `${dcBasis} Compared with ${genBasis}`,
      matched: roundsToBillion(gap, 39),
    });
  }
  return rows;
}

export const FORMULAS = {
  yoy: YOY_WORDS,
  since: SINCE_WORDS,
  sincePct: SINCE_PCT_WORDS,
  gap: GAP_WORDS,
};
