export interface MapTransform {
  k: number;
  tx: number;
  ty: number;
}

export const IDENTITY_TRANSFORM: MapTransform = { k: 1, tx: 0, ty: 0 };

/**
 * k = 1 is the fitted view (the US on first load). 64x that fit reaches a
 * county or city. There is no tile zoom level; this is the scale cap.
 */
export const MAP_MIN_SCALE = 1;
export const MAP_MAX_SCALE = 64;

const PAN_SLACK = 100;

export function clampTransform(t: MapTransform, w: number, h: number): MapTransform {
  const k = Math.max(MAP_MIN_SCALE, Math.min(MAP_MAX_SCALE, t.k));
  const txMin = w - w * k - PAN_SLACK;
  const tyMin = h - h * k - PAN_SLACK;
  return {
    k,
    tx: Math.max(txMin, Math.min(PAN_SLACK, t.tx)),
    ty: Math.max(tyMin, Math.min(PAN_SLACK, t.ty)),
  };
}

/** Zoom by `factor` around the screen point (fx, fy). At the cap, the camera stays put. */
export function zoomAt(
  t: MapTransform,
  factor: number,
  fx: number,
  fy: number,
  w: number,
  h: number,
): MapTransform {
  const k = Math.max(MAP_MIN_SCALE, Math.min(MAP_MAX_SCALE, t.k * factor));
  if (k === t.k) return t;
  const wx = (fx - t.tx) / t.k;
  const wy = (fy - t.ty) / t.k;
  return clampTransform({ k, tx: fx - wx * k, ty: fy - wy * k }, w, h);
}
