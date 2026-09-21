// Pure formatting helpers. No dependencies, easy to unit test.

import type { NumberKind } from "../types";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** Parse "YYYY-MM-DD" or "YYYY-MM" to a UTC timestamp (ms). */
export function parseDate(s: string): number {
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
  "contracted IT": "contracted IT (critical IT load)",
  "contracted demand": "contracted demand (not COD)",
  "compute target": "compute target",
  DC: "DC capacity",
  "nuclear offtake share (derived)": "nuclear offtake share (derived)",
  storage: "storage (not generation)",
  "portfolio offtake": "portfolio offtake (not incremental)",
  "firm geothermal offtake": "firm geothermal offtake",
  "firm contracted utility offtake": "firm contracted utility offtake",
  "renewable matching": "renewable matching (not campus IT)",
  "renewable matching (up to)": "renewable matching, up to (not campus IT)",
  "BTM generation": "BTM generation (not IT)",
  "facility power": "facility power (not IT, not generation)",
  "AI cluster capacity": "AI cluster capacity (not BTM, not IT)",
  "campus design capacity (up to)": "campus design capacity (up to)",
};

export function formatNumberKind(kind: NumberKind | undefined): string | null {
  return kind ? NUMBER_KIND_LABEL[kind] : null;
}

export function formatNumberKindNote(kind: NumberKind | undefined): string | null {
  if (!kind) return null;
  switch (kind) {
    case "contracted IT":
      return "Figure is contracted IT (critical IT load), not campus COD and not generation.";
    case "contracted demand":
      return "Figure is contracted demand, not COD and not generation.";
    case "compute target":
      return "Figure is a compute target, not generation and not COD.";
    case "DC":
      return "Figure is DC capacity only. Behind-the-meter generation is not on this row.";
    case "nuclear offtake share (derived)":
      return "Figure is a derived nuclear offtake share, not plant nameplate and not Google-owned generation.";
    case "storage":
      return "Figure is storage capacity, not generation.";
    case "portfolio offtake":
      return "Figure is a portfolio offtake total, not a new incremental deal. Delta is empty.";
    case "firm geothermal offtake":
      return "Figure is a firm geothermal PPA offtake, not plant ownership. The option is not firm and is not on this row.";
    case "firm contracted utility offtake":
      return "Figure is firm contracted utility offtake (Contract Quantity), not campus IT, not plant nameplate, and not buyer-owned generation.";
    case "renewable matching":
      return "Figure is renewable matching (VPPA, supply, or RECs), not campus IT and not a generation hero.";
    case "renewable matching (up to)":
      return "Figure is a renewable matching ceiling (up to), not campus IT and not a generation hero. Plants may be unnamed.";
    case "BTM generation":
      return "Figure is behind-the-meter on-site generation, not critical IT load and not a combined campus total. It is not added to campus IT or AI cluster capacity.";
    case "facility power":
      return "Figure is total facility power, not critical IT load and not generation nameplate.";
    case "AI cluster capacity":
      return "Figure is announced AI cluster capacity, not behind-the-meter generation, not IT load, and not COD. Separate generation and nuclear matching rows are not added here.";
    case "campus design capacity (up to)":
      return "Figure is announced campus design capacity (up to), not contracted IT, not a generation floor, and not COD. Do not add it to landlord IT pins or generation heroes.";
  }
}

/** Capacity in MW -> compact human string. 960 -> "960 MW"; 1200 -> "1.2 GW". */
export function formatCapacity(mw: number | null): string {
  if (mw == null) return "Undisclosed";
  if (mw >= 1000) {
    const gw = mw / 1000;
    return `${gw >= 10 ? Math.round(gw) : trim(gw, 1)} GW`;
  }
  return `${Math.round(mw)} MW`;
}

/** Sum of MW rendered as GW with one decimal. */
export function formatGW(mw: number): string {
  const gw = mw / 1000;
  return `${gw >= 10 ? trim(gw, 1) : trim(gw, 2)}`;
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
