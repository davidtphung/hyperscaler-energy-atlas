import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { geoAlbersUsa, geoNaturalEarth1, geoMercator, geoPath, geoGraticule10 } from "d3-geo";
import type { GeoProjection } from "d3-geo";
import type { PreparedCommitment } from "../types";
import { techColor, TECH } from "../lib/theme";
import { radiusForCapacity } from "../lib/scales";
import { formatCapacity, formatLocation } from "../lib/format";
import { useElementSize } from "../lib/hooks";
import { usStates, usStateBorders, worldCountries, worldBorders } from "../lib/geo";

export type MapView = "us" | "world" | "china";

// Corner points framing mainland China. A MultiPoint avoids the polygon winding
// ambiguity that makes d3-geo fit to the spherical complement (whole globe).
const CHINA_BOX = {
  type: "MultiPoint" as const,
  coordinates: [[73, 18], [135, 18], [135, 53], [73, 53]],
};

interface Props {
  /** Facet-filtered candidates (visible on the map). */
  commitments: PreparedCommitment[];
  /** Ids within the current timeline range (bright); others render as "future". */
  inRange: Set<string>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  view: MapView;
  onViewChange: (v: MapView) => void;
}

interface Transform {
  k: number;
  tx: number;
  ty: number;
}

const IDENTITY: Transform = { k: 1, tx: 0, ty: 0 };

function clampTransform(t: Transform, w: number, h: number): Transform {
  const slack = 100;
  const k = Math.max(1, Math.min(8, t.k));
  const txMin = w - w * k - slack;
  const tyMin = h - h * k - slack;
  return {
    k,
    tx: Math.max(txMin, Math.min(slack, t.tx)),
    ty: Math.max(tyMin, Math.min(slack, t.ty)),
  };
}

export default function MapCanvas({
  commitments,
  inRange,
  selectedId,
  onSelect,
  view,
  onViewChange,
}: Props) {
  const { ref: sizeRef, width, height } = useElementSize<HTMLDivElement>();
  const [wheelNode, setWheelNode] = useState<HTMLDivElement | null>(null);
  const setRefs = useCallback(
    (n: HTMLDivElement | null) => {
      sizeRef(n);
      setWheelNode(n);
    },
    [sizeRef]
  );
  const [transform, setTransform] = useState<Transform>(IDENTITY);
  const [hoverId, setHoverId] = useState<string | null>(null);

  // Native, non-passive wheel listener so we can preventDefault. Without this,
  // a trackpad pinch (ctrl+wheel) also triggers the browser's page zoom, which
  // is what made the map appear to jump or pan to another location.
  useEffect(() => {
    const el = wheelNode;
    if (!el) return;
    const onWheelNative = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const fx = e.clientX - rect.left;
      const fy = e.clientY - rect.top;
      const factor = Math.exp(-e.deltaY * 0.0016);
      setTransform((t) => {
        const k = t.k * factor;
        const wx = (fx - t.tx) / t.k;
        const wy = (fy - t.ty) / t.k;
        return clampTransform({ k, tx: fx - wx * k, ty: fy - wy * k }, rect.width, rect.height);
      });
    };
    el.addEventListener("wheel", onWheelNative, { passive: false });
    return () => el.removeEventListener("wheel", onWheelNative);
  }, [wheelNode]);

  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pan = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const pinch = useRef<{ dist: number; cx: number; cy: number; t: Transform } | null>(null);
  const moved = useRef(false);

  // Projection fitted to the container for the active view.
  const projection = useMemo<GeoProjection | null>(() => {
    if (width < 10 || height < 10) return null;
    const pad = 24;
    const extent: [[number, number], [number, number]] = [
      [pad, pad],
      [width - pad, height - pad],
    ];
    if (view === "us") {
      return geoAlbersUsa().fitExtent(extent, usStates as never);
    }
    if (view === "china") {
      return geoMercator().fitExtent(extent, CHINA_BOX as never);
    }
    return geoNaturalEarth1().fitExtent(extent, { type: "Sphere" } as never);
  }, [view, width, height]);

  // Sphere + graticule for the world view (US view uses neither).
  const frame = useMemo(() => {
    if (!projection || view !== "world") return null;
    const path = geoPath(projection);
    return { sphere: path({ type: "Sphere" }) ?? "", graticule: path(geoGraticule10()) ?? "" };
  }, [projection, view]);

  const project = useCallback(
    (c: PreparedCommitment): [number, number] | null => {
      if (!projection || c.lng == null || c.lat == null) return null;
      const p = projection([c.lng, c.lat]);
      if (!p) return null;
      return [transform.tx + transform.k * p[0], transform.ty + transform.k * p[1]];
    },
    [projection, transform]
  );

  // ---- pointer interaction: pan + pinch ----
  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    moved.current = false;
    if (pointers.current.size === 1) {
      pan.current = { x: e.clientX, y: e.clientY, tx: transform.tx, ty: transform.ty };
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, t: transform };
      pan.current = null;
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();

    if (pinch.current && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const ratio = dist / (pinch.current.dist || 1);
      const base = pinch.current.t;
      const k = base.k * ratio;
      const fx = pinch.current.cx - rect.left;
      const fy = pinch.current.cy - rect.top;
      const wx = (fx - base.tx) / base.k;
      const wy = (fy - base.ty) / base.k;
      setTransform(clampTransform({ k, tx: fx - wx * k, ty: fy - wy * k }, width, height));
      moved.current = true;
      return;
    }

    if (pan.current) {
      const dx = e.clientX - pan.current.x;
      const dy = e.clientY - pan.current.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) moved.current = true;
      const start = pan.current;
      setTransform((t) => clampTransform({ ...t, tx: start.tx + dx, ty: start.ty + dy }, width, height));
    }
  };

  const endPointer = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (pointers.current.size === 0) pan.current = null;
  };

  const zoomAround = (factor: number, fx: number, fy: number) => {
    setTransform((t) => {
      const k = t.k * factor;
      const wx = (fx - t.tx) / t.k;
      const wy = (fy - t.ty) / t.k;
      return clampTransform({ k, tx: fx - wx * k, ty: fy - wy * k }, width, height);
    });
  };

  const zoomBy = (factor: number) => zoomAround(factor, width / 2, height / 2);
  const reset = () => setTransform(IDENTITY);

  // Markers projected to screen space, culled to the viewport, ordered so the
  // selected and smaller markers paint last (on top).
  const markers = useMemo(() => {
    const out: { c: PreparedCommitment; x: number; y: number; r: number; future: boolean }[] = [];
    for (const c of commitments) {
      const p = project(c);
      if (!p) continue;
      const [x, y] = p;
      if (x < -60 || x > width + 60 || y < -60 || y > height + 60) continue;
      out.push({ c, x, y, r: radiusForCapacity(c.capacityMW), future: !inRange.has(c.id) });
    }
    out.sort((a, b) => {
      if (a.c.id === selectedId) return 1;
      if (b.c.id === selectedId) return -1;
      return b.r - a.r;
    });
    return out;
  }, [commitments, project, width, height, inRange, selectedId]);

  const hover = hoverId ? markers.find((m) => m.c.id === hoverId) : null;
  const onMapCount = markers.filter((m) => !m.future).length;

  return (
    <main className="map" aria-label="Commitment map" id="map">
      <div
        ref={setRefs}
        style={{ position: "absolute", inset: 0 }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onClick={() => {
          if (!moved.current) onSelect(null);
        }}
        onDoubleClick={(e) => {
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          zoomAround(1.6, e.clientX - rect.left, e.clientY - rect.top);
        }}
      >
        <svg
          className="map__svg"
          width={width}
          height={height}
          role="img"
          aria-label={`Map of ${commitments.length} hyperscaler energy and datacenter commitments. A screen-reader-friendly list is available in the overview panel.`}
        >
          {projection && (
            <>
              <g transform={`translate(${transform.tx},${transform.ty}) scale(${transform.k})`}>
                {view === "world" && <path className="geo-sphere" d={frame?.sphere} />}
                {view === "world" && <path className="geo-graticule" d={frame?.graticule} />}
                <GeographyPaths view={view} projection={projection} />
              </g>

              {markers.map((m) => {
                const color = techColor(m.c.techType);
                const isSel = m.c.id === selectedId;
                const operational = m.c.status === "operational" && !m.future;
                return (
                  <g
                    key={m.c.id}
                    className={`marker${isSel ? " marker--selected" : ""}${m.future ? " marker--future" : ""}`}
                    transform={`translate(${m.x},${m.y})`}
                    role="button"
                    tabIndex={m.future ? -1 : 0}
                    aria-label={`${m.c.buyer}, ${m.c.project}. ${formatCapacity(m.c.capacityMW)} ${TECH[m.c.techType].label}. ${formatLocation(m.c.city, m.c.state, m.c.country)}.`}
                    aria-pressed={isSel}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!moved.current) onSelect(isSel ? null : m.c.id);
                    }}
                    onPointerEnter={() => setHoverId(m.c.id)}
                    onPointerLeave={() => setHoverId((h) => (h === m.c.id ? null : h))}
                    onFocus={() => setHoverId(m.c.id)}
                    onBlur={() => setHoverId((h) => (h === m.c.id ? null : h))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelect(isSel ? null : m.c.id);
                      }
                    }}
                  >
                    {operational && (
                      <circle className="marker__pulse" r={m.r} fill="none" stroke={color} strokeWidth={1.4} />
                    )}
                    <circle className="marker__halo" r={m.r + 9} fill={color} opacity={0.15} />
                    <circle className="marker__halo2" r={m.r + 3} fill={color} opacity={0.28} />
                    <circle className="marker__core" r={m.r} fill={color} fillOpacity={0.96} />
                    <circle
                      className="marker__gloss"
                      r={m.r * 0.62}
                      cx={-m.r * 0.26}
                      cy={-m.r * 0.3}
                      fill="#ffffff"
                      opacity={0.24}
                    />
                    {isSel && <circle className="marker__ring" r={m.r + 5} />}
                    <circle className="marker__hit" r={Math.max(m.r + 8, 22)} />
                  </g>
                );
              })}
            </>
          )}
        </svg>

        {hover && (
          <div className="tooltip" style={{ left: hover.x, top: hover.y }} role="status">
            <div className="tooltip__top">
              <span className="tooltip__tech" style={{ background: techColor(hover.c.techType) }} />
              <span className="tooltip__buyer">{hover.c.buyer}</span>
            </div>
            <div className="tooltip__title">{hover.c.project}</div>
            <div className="tooltip__meta">
              <span className="tooltip__cap">{formatCapacity(hover.c.capacityMW)}</span>
              <span>{TECH[hover.c.techType].short}</span>
              <span>{formatLocation(hover.c.city, hover.c.state, hover.c.country)}</span>
            </div>
          </div>
        )}
      </div>

      <div className="map__viewtoggle" role="group" aria-label="Map view">
        <button className="seg" aria-pressed={view === "us"} onClick={() => onViewChange("us")}>
          United States
        </button>
        <button className="seg" aria-pressed={view === "china"} onClick={() => onViewChange("china")}>
          China
        </button>
        <button className="seg" aria-pressed={view === "world"} onClick={() => onViewChange("world")}>
          Global
        </button>
      </div>

      <div className="map__controls">
        <button className="zoom-btn" onClick={() => zoomBy(1.5)} aria-label="Zoom in">
          +
        </button>
        <button className="zoom-btn" onClick={() => zoomBy(1 / 1.5)} aria-label="Zoom out">
          −
        </button>
        <button className="zoom-btn" onClick={reset} aria-label="Reset view to fit" title="Fit to view">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9V5a2 2 0 0 1 2-2h4M21 9V5a2 2 0 0 0-2-2h-4M3 15v4a2 2 0 0 0 2 2h4M21 15v4a2 2 0 0 1-2 2h-4" />
          </svg>
        </button>
      </div>

      <div className="map__count" aria-hidden="true">
        <b>{onMapCount}</b> of {commitments.length} on map
      </div>

      {commitments.length === 0 && (
        <div className="map__empty" role="status">
          <h3>No commitments match</h3>
          <p>Try clearing a filter or widening the timeline to bring sites back onto the map.</p>
        </div>
      )}
    </main>
  );
}

// Geography paths are memoized on (view, projection) only, so pan/zoom (a
// transform on the parent group) never triggers re-projection.
function GeographyPaths({ view, projection }: { view: MapView; projection: GeoProjection }) {
  const d = useMemo(() => {
    const path = geoPath(projection);
    if (view === "us") {
      return { land: usStates.features.map((f) => path(f) ?? ""), border: path(usStateBorders) ?? "" };
    }
    return { land: worldCountries.features.map((f) => path(f) ?? ""), border: path(worldBorders) ?? "" };
  }, [view, projection]);

  return (
    <g>
      {d.land.map((p, i) => (
        <path key={i} className="geo-land" d={p} />
      ))}
      <path className="geo-border" d={d.border} />
    </g>
  );
}
