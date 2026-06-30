// Pure formatting helpers. No dependencies, easy to unit test.

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
