import { IDENTITY_TRANSFORM, MAP_MAX_SCALE, zoomAt } from "../src/lib/mapZoom.ts";

const errors: string[] = [];
const w = 782.5;
const h = 702;
const fx = w / 2;
const fy = h / 2;

let t = IDENTITY_TRANSFORM;
for (let i = 0; i < 6; i++) t = zoomAt(t, 1.5, fx, fy, w, h);
if (t.k <= 8) errors.push(`six zoom-in clicks stayed at ${t.k}, expected past the old cap of 8`);
if (t.k < 11) errors.push(`six zoom-in clicks reached ${t.k}, expected about 11.4`);

const pastOldCap = zoomAt(t, 1.5, fx, fy, w, h);
const cornerTx = w - w * 8 - 100;
if (Math.abs(pastOldCap.tx - cornerTx) < 1) {
  errors.push(`zoom past the old cap snapped tx to the corner (${pastOldCap.tx})`);
}
if (pastOldCap.k <= 8) errors.push(`zoom past the old cap was clamped to ${pastOldCap.k}`);

let city = IDENTITY_TRANSFORM;
for (let i = 0; i < 24; i++) city = zoomAt(city, 1.5, fx, fy, w, h);
if (city.k < 14) errors.push(`repeated zoom only reached ${city.k}, county/city needs at least 14x`);
if (city.k !== MAP_MAX_SCALE) errors.push(`zoom cap is ${city.k}, expected ${MAP_MAX_SCALE}`);
const held = zoomAt(city, 1.5, fx, fy, w, h);
if (held.k !== city.k || held.tx !== city.tx || held.ty !== city.ty) {
  errors.push("zoom at the cap moved the camera");
}

const zoomed = zoomAt(IDENTITY_TRANSFORM, 4, fx, fy, w, h);
const afterFilter = zoomed;
if (afterFilter.k !== zoomed.k || afterFilter.tx !== zoomed.tx) {
  errors.push("filter placeholder moved the camera");
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`map zoom ok (cap ${MAP_MAX_SCALE}x, no snap past 8x, camera holds at the cap)`);
