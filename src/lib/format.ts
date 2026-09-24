// Pure formatting helpers. No dependencies, easy to unit test.

import type { NumberKind } from "../types";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** Parse "YYYY-MM-DD" or "YYYY-MM" to a UTC timestamp (ms). Empty stays unset. */
export function parseDate(s: string): number {
  if (!s || !s.trim()) return Number.NaN;
  const [y, m = "1", d = "1"] = s.split("-");
  return Date.UTC(Number(y), Number(m) - 1, Number(d));
}

/** "2024-09-20" -> "Sep 2024"; "2025-01" -> "Jan 2025". */
export function formatMonthYear(s: string): string {
  const [y, m] = s.split("-");
  const mi = Number(m) - 1;
  if (Number.isNaN(mi) || mi < 0 || mi > 11) return y;
  return `${MONTHS[mi]} ${y}`;
}

export function formatFullDate(s: string): string {
  if (!s || !s.trim()) return "empty";
  const parts = s.split("-");
  if (parts.length < 3) return formatMonthYear(s);
  const [y, m, d] = parts;
  return `${MONTHS[Number(m) - 1]} ${Number(d)}, ${y}`;
}

/**
 * A calendar date from a primary source, or "empty" when that source did not
 * state one. Never derive a stand-in from status, daysToCod, or energizedMW.
 */
export function formatSourcedDate(s: string | null | undefined): string {
  if (s == null || s.trim() === "") return "empty";
  return formatFullDate(s);
}

const NUMBER_KIND_LABEL: Record<NumberKind, string> = {
  it_capacity: "Data center IT",
  grid_gen_for_dc: "Grid generation being built for a data center",
  btm_gen: "On-site generation",
  offtake_new: "Contracts with new plants",
  offtake_existing: "Contracts with existing plants",
  utility_load: "Utility load",
  program: "Program",
  equipment_supply: "Equipment supply",
  storage: "Storage",
  unresolved: "Unresolved",
};

export function formatNumberKind(kind: NumberKind | undefined): string | null {
  return kind ? NUMBER_KIND_LABEL[kind] : null;
}

export function formatNumberKindNote(kind: NumberKind | undefined): string | null {
  if (!kind) return null;
  switch (kind) {
    case "it_capacity":
      return "Figure is data center IT (contracted or leased). It is not added to generation or offtake.";
    case "grid_gen_for_dc":
      return "Figure is grid generation being built for a data center. It is not added to IT or on-site generation.";
    case "btm_gen":
      return "Figure is on-site generation for a campus. It is not added to IT or grid generation.";
    case "offtake_new":
      return "Figure is offtake from a plant that was not yet operating when the contract was signed.";
    case "offtake_existing":
      return "Figure is offtake from an existing plant. These are not new watts.";
    case "utility_load":
      return "Figure is a utility load or delivery agreement. It is not IT and it does not count in a firm total.";
    case "program":
      return "Figure is a program or framework. It does not count.";
    case "equipment_supply":
      return "Figure is an equipment supply deal. It does not count.";
    case "storage":
      return "Figure is storage. It does not count.";
    case "unresolved":
      return "Kind is unresolved. It does not count.";
  }
}

/**
 * Display power. Conversion happens after any sum.
 * At least 1,000 MW becomes GW with up to two decimals, trailing zeros trimmed,
 * and at least one decimal kept from 10 GW up. Below 1,000 MW stays exact MW.
 */
export function formatPower(mw: number | null | undefined, approx = false): string {
  if (mw == null || !Number.isFinite(mw)) return "Undisclosed";
  const text = mw < 1000 ? formatExactMW(mw) : `${formatGwMagnitude(mw / 1000)} GW`;
  return approx ? `~${text}` : text;
}

/** Tilde prefix when a public filing states the figure as approximate. */
export function formatBoundPower(mw: number | null | undefined, bound: string | undefined): string {
  return formatPower(mw, bound === "approx_filing");
}

/** Exact stored MW with thousands separators. Used beside a GW headline. */
export function formatExactMW(mw: number): string {
  const negative = mw < 0;
  const raw = String(Math.abs(mw));
  const [whole, frac] = raw.split(".");
  const withCommas = Number(whole).toLocaleString("en-US");
  const body = frac ? `${withCommas}.${frac}` : withCommas;
  return `${negative ? "-" : ""}${body} MW`;
}

/** GW headline plus the exact MW when the headline is in GW. */
export function formatKindTotal(mw: number): string {
  const headline = formatPower(mw);
  if (mw < 1000) return headline;
  return `${headline} (${formatExactMW(mw)})`;
}

function formatGwMagnitude(gw: number): string {
  const negative = gw < 0;
  const fixed = Math.abs(gw).toFixed(2);
  const rounded = Number(fixed);
  const [whole, frac] = fixed.split(".");
  let tail = frac;
  if (tail[1] === "0") tail = tail[0];
  if (rounded < 10 && tail === "0") tail = "";
  const sign = negative ? "-" : "";
  return tail ? `${sign}${whole}.${tail}` : `${sign}${whole}`;
}

/** USD compact: 9.6e9 -> "$9.6B"; 7.5e8 -> "$750M". */
export function formatUSD(v: number | null): string {
  if (v == null) return "n/a";
  if (v >= 1e9) return `$${trim(v / 1e9, 1)}B`;
  if (v >= 1e6) return `$${Math.round(v / 1e6)}M`;
  if (v >= 1e3) return `$${Math.round(v / 1e3)}K`;
  return `$${Math.round(v)}`;
}

export function formatSqft(v: number | null): string {
  if (v == null) return "n/a";
  if (v >= 1e6) return `${trim(v / 1e6, 1)}M sqft`;
  if (v >= 1e3) return `${Math.round(v / 1e3)}K sqft`;
  return `${Math.round(v)} sqft`;
}

export function formatLocation(city: string, state: string, country: string): string {
  return [city, state, country === "United States" ? "" : country]
    .filter(Boolean)
    .join(", ");
}

function trim(n: number, dp: number): string {
  return Number(n.toFixed(dp)).toString();
}
