import { scaleSqrt } from "d3-scale";

// Marker radius scales with the square root of committed capacity so that the
// AREA of a marker is proportional to megawatts (perceptually honest). The
// domain is clamped so a 12 GW supply alliance does not visually swallow a
// 50 MW fusion pilot. Capacity-less rows (many datacenter campuses) get a small
// fixed footprint.
const r = scaleSqrt().domain([10, 2000]).range([4, 19]).clamp(true);

export function radiusForCapacity(mw: number | null): number {
  if (mw == null) return 5;
  return r(mw);
}

export const UNKNOWN_RADIUS = 5;
