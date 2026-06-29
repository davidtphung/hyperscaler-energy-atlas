import { useMemo, useState } from "react";
import { geoAlbersUsa, geoNaturalEarth1, geoPath, geoGraticule10 } from "d3-geo";
import type { GeoProjection } from "d3-geo";
import { usStates, usStateBorders, worldCountries, worldBorders } from "../lib/geo";
import { useElementSize } from "../lib/hooks";

export interface ScatterPoint {
  id: string;
  lat: number | null;
  lng: number | null;
  color: string;
  r: number;
  label: string;
  sublabel?: string;
}

interface Props {
  points: ScatterPoint[];
  view: "world" | "us";
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  height?: number;
}

export default function ScatterMap({ points, view, selectedId, onSelect, height = 360 }: Props) {
  const { ref, width } = useElementSize<HTMLDivElement>();
  const [hoverId, setHoverId] = useState<string | null>(null);
  const h = height;

  const projection = useMemo<GeoProjection | null>(() => {
    if (width < 10) return null;
    const pad = 8;
    const extent: [[number, number], [number, number]] = [
      [pad, pad],
      [width - pad, h - pad],
    ];
    return view === "us"
      ? geoAlbersUsa().fitExtent(extent, usStates as never)
      : geoNaturalEarth1().fitExtent(extent, { type: "Sphere" } as never);
  }, [view, width, h]);

  const geo = useMemo(() => {
    if (!projection) return null;
    const path = geoPath(projection);
    if (view === "us") {
      return {
        land: usStates.features.map((f) => path(f) ?? ""),
        border: path(usStateBorders) ?? "",
        sphere: "",
        graticule: "",
      };
    }
    return {
      land: worldCountries.features.map((f) => path(f) ?? ""),
      border: path(worldBorders) ?? "",
      sphere: path({ type: "Sphere" }) ?? "",
      graticule: path(geoGraticule10()) ?? "",
    };
  }, [projection, view]);

  const plotted = useMemo(() => {
    if (!projection) return [];
    const out: { p: ScatterPoint; x: number; y: number }[] = [];
    for (const p of points) {
      if (p.lat == null || p.lng == null) continue;
      const xy = projection([p.lng, p.lat]);
      if (!xy) continue;
      out.push({ p, x: xy[0], y: xy[1] });
    }
    out.sort((a, b) => {
      if (a.p.id === selectedId) return 1;
      if (b.p.id === selectedId) return -1;
      return b.p.r - a.p.r;
    });
    return out;
  }, [points, projection, selectedId]);

  const hover = hoverId ? plotted.find((m) => m.p.id === hoverId) : null;

  return (
    <div className="scatter" ref={ref} style={{ height: h }}>
      <svg className="scatter__svg" width={width} height={h} role="img" aria-label={`Map of ${plotted.length} locations`}>
        {geo && (
          <>
            {view === "world" && <path className="geo-sphere" d={geo.sphere} />}
            {view === "world" && <path className="geo-graticule" d={geo.graticule} />}
            {geo.land.map((d, i) => (
              <path key={i} className="geo-land" d={d} />
            ))}
            <path className="geo-border" d={geo.border} />
            {plotted.map((m) => {
              const sel = m.p.id === selectedId;
              return (
                <g
                  key={m.p.id}
                  className={`marker${sel ? " marker--selected" : ""}`}
                  transform={`translate(${m.x},${m.y})`}
                  role={onSelect ? "button" : undefined}
                  tabIndex={onSelect ? 0 : undefined}
                  aria-label={`${m.p.label}. ${m.p.sublabel ?? ""}`}
                  onPointerEnter={() => setHoverId(m.p.id)}
                  onPointerLeave={() => setHoverId((x) => (x === m.p.id ? null : x))}
                  onFocus={() => setHoverId(m.p.id)}
                  onBlur={() => setHoverId((x) => (x === m.p.id ? null : x))}
                  onClick={() => onSelect?.(m.p.id)}
                  onKeyDown={(e) => {
                    if (onSelect && (e.key === "Enter" || e.key === " ")) {
                      e.preventDefault();
                      onSelect(m.p.id);
                    }
                  }}
                >
                  <circle className="marker__halo2" r={m.p.r + 3} fill={m.p.color} opacity={0.26} />
                  <circle className="marker__core" r={m.p.r} fill={m.p.color} fillOpacity={0.95} />
                  <circle className="marker__gloss" r={m.p.r * 0.6} cx={-m.p.r * 0.26} cy={-m.p.r * 0.3} fill="#fff" opacity={0.24} />
                  {sel && <circle className="marker__ring" r={m.p.r + 5} />}
                  <circle className="marker__hit" r={Math.max(m.p.r + 7, 16)} />
                </g>
              );
            })}
          </>
        )}
      </svg>

      {hover && (
        <div className="tooltip" style={{ left: hover.x, top: hover.y }} role="status">
          <div className="tooltip__title">{hover.p.label}</div>
          {hover.p.sublabel && <div className="tooltip__meta">{hover.p.sublabel}</div>}
        </div>
      )}
    </div>
  );
}
