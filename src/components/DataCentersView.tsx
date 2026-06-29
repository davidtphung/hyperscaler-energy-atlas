import { useMemo, useState } from "react";
import { DATACENTERS } from "../data/datacenters";
import type { DataCenter, DCStatus, FacilityType } from "../types";
import { DC_STATUS, DC_STATUS_ORDER, FACILITY_TYPE, FACILITY_TYPE_ORDER } from "../lib/theme";
import { formatGW, formatCapacity } from "../lib/format";
import ScatterMap, { type ScatterPoint } from "./ScatterMap";

function toggle<T>(s: Set<T>, v: T): Set<T> {
  const n = new Set(s);
  n.has(v) ? n.delete(v) : n.add(v);
  return n;
}

export default function DataCentersView() {
  const [query, setQuery] = useState("");
  const [statuses, setStatuses] = useState<Set<DCStatus>>(new Set());
  const [types, setTypes] = useState<Set<FacilityType>>(new Set());
  const [aiOnly, setAiOnly] = useState(false);
  const [view, setView] = useState<"world" | "us">("world");
  const [selected, setSelected] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().split(/\s+/).filter(Boolean);
    return DATACENTERS.filter((d) => {
      if (statuses.size && !statuses.has(d.status)) return false;
      if (types.size && !types.has(d.facilityType)) return false;
      if (aiOnly && !d.aiOriented) return false;
      if (q.length) {
        const hay = `${d.facility} ${d.operator} ${d.parentCompany} ${d.country} ${d.region} ${d.city} ${d.summary}`.toLowerCase();
        if (!q.every((t) => hay.includes(t))) return false;
      }
      return true;
    });
  }, [query, statuses, types, aiOnly]);

  const stats = useMemo(() => {
    const operators = new Set(filtered.map((d) => d.operator));
    const countries = new Set(filtered.map((d) => d.country));
    const mw = filtered.reduce((a, d) => a + (d.capacityMW ?? 0), 0);
    return {
      facilities: filtered.length,
      operators: operators.size,
      countries: countries.size,
      mw,
      hyperscale: filtered.filter((d) => d.facilityType === "hyperscale").length,
      ai: filtered.filter((d) => d.aiOriented).length,
      china: filtered.filter((d) => d.country === "China").length,
    };
  }, [filtered]);

  const points: ScatterPoint[] = useMemo(
    () =>
      filtered.map((d) => ({
        id: d.id,
        lat: d.lat,
        lng: d.lng,
        color: DC_STATUS[d.status].color,
        r: d.capacityMW ? Math.max(3.5, Math.min(10, 3 + Math.sqrt(d.capacityMW) / 9)) : 3.5,
        label: d.facility,
        sublabel: `${d.operator} · ${d.city}, ${d.country} · ${formatCapacity(d.capacityMW)}`,
      })),
    [filtered]
  );

  const counts = useMemo(() => {
    const st: Record<string, number> = {};
    const ty: Record<string, number> = {};
    for (const d of DATACENTERS) {
      st[d.status] = (st[d.status] ?? 0) + 1;
      ty[d.facilityType] = (ty[d.facilityType] ?? 0) + 1;
    }
    return { st, ty };
  }, []);

  const anyFilter = statuses.size + types.size > 0 || aiOnly || query.length > 0;

  return (
    <div className="page page--dc">
      <header className="page__head">
        <p className="overview__eyebrow">Global directory</p>
        <h1 className="page__title">Data centers, mapped and searchable</h1>
        <p className="page__lead">
          A source-backed directory of operating, under-construction, and proposed data centers worldwide, with a
          China focus across the East Data West Compute hubs. Search and filter the full set, then read each site to
          its source.
        </p>
      </header>

      <div className="dc-stats">
        <Stat v={String(stats.facilities)} l="Facilities" />
        <Stat v={`${formatGW(stats.mw)}`} u="GW" l="Mapped capacity" />
        <Stat v={String(stats.countries)} l="Countries" />
        <Stat v={String(stats.operators)} l="Operators" />
        <Stat v={String(stats.hyperscale)} l="Hyperscale" />
        <Stat v={String(stats.china)} l="In China" />
      </div>

      <div className="dc-maprow">
        <ScatterMap points={points} view={view} selectedId={selected} onSelect={setSelected} height={380} />
        <div className="dc-mapctl">
          <div className="map__viewtoggle" style={{ position: "static" }}>
            <button className="seg" aria-pressed={view === "world"} onClick={() => setView("world")}>Global</button>
            <button className="seg" aria-pressed={view === "us"} onClick={() => setView("us")}>US</button>
          </div>
          <div className="dc-legend">
            {DC_STATUS_ORDER.map((s) => (
              <span key={s} className="dc-legend__item">
                <span className="dc-legend__dot" style={{ background: DC_STATUS[s].color }} />
                {DC_STATUS[s].label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="dc-toolbar">
        <div className="dc-search" role="search">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.5" y2="16.5" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search facility, operator, province, city, country"
            aria-label="Search data centers"
          />
        </div>
        <div className="dc-chips">
          {DC_STATUS_ORDER.map((s) => (
            <button key={s} className="chip" aria-pressed={statuses.has(s)} onClick={() => setStatuses(toggle(statuses, s))}>
              <span className="chip__dot" style={{ background: DC_STATUS[s].color }} />
              {DC_STATUS[s].label}
              <span className="chip__count">{counts.st[s] ?? 0}</span>
            </button>
          ))}
          {FACILITY_TYPE_ORDER.map((t) => (
            <button key={t} className="chip" aria-pressed={types.has(t)} onClick={() => setTypes(toggle(types, t))}>
              {FACILITY_TYPE[t]}
              <span className="chip__count">{counts.ty[t] ?? 0}</span>
            </button>
          ))}
          <button className="chip" aria-pressed={aiOnly} onClick={() => setAiOnly((v) => !v)}>AI oriented</button>
          {anyFilter && (
            <button className="chip chip--clear" onClick={() => { setQuery(""); setStatuses(new Set()); setTypes(new Set()); setAiOnly(false); }}>
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="dc-table-wrap">
        <div className="dc-row dc-row--head" aria-hidden="true">
          <span>Facility</span><span>Location</span><span>Type</span><span>Status</span><span className="dc-num">MW</span>
        </div>
        <ul className="dc-table" role="list">
          {filtered.map((d) => (
            <Row key={d.id} d={d} open={selected === d.id} onToggle={() => setSelected(selected === d.id ? null : d.id)} />
          ))}
        </ul>
        {filtered.length === 0 && <div className="dc-empty">No facilities match. Try clearing a filter.</div>}
      </div>
    </div>
  );
}

function Stat({ v, u, l }: { v: string; u?: string; l: string }) {
  return (
    <div className="dc-stat">
      <span className="dc-stat__v">{v}{u && <small> {u}</small>}</span>
      <span className="dc-stat__l">{l}</span>
    </div>
  );
}

function Row({ d, open, onToggle }: { d: DataCenter; open: boolean; onToggle: () => void }) {
  return (
    <li className={`dc-li${open ? " dc-li--open" : ""}`}>
      <button className="dc-row" onClick={onToggle} aria-expanded={open}>
        <span className="dc-cell-main">
          <span className="dc-fac">{d.facility}</span>
          <span className="dc-op">{d.operator}{d.aiOriented && <span className="dc-ai">AI</span>}</span>
        </span>
        <span className="dc-loc">{[d.city, d.region, d.country].filter(Boolean).join(", ")}</span>
        <span className="dc-type">{FACILITY_TYPE[d.facilityType]}</span>
        <span className="dc-status">
          <span className="dc-status__dot" style={{ background: DC_STATUS[d.status].color }} />
          {DC_STATUS[d.status].label}
        </span>
        <span className="dc-num dc-mw">{d.capacityMW ? formatCapacity(d.capacityMW) : "n/a"}</span>
      </button>
      {open && (
        <div className="dc-detail">
          <p>{d.summary}</p>
          <div className="dc-meta">
            {d.powerSource && <span>Power: {d.powerSource}</span>}
            {d.yearOperational && <span>Online: {d.yearOperational}</span>}
            <span>Confidence: {d.confidence}</span>
            <a href={d.sourceUrl} target="_blank" rel="noopener noreferrer">Source: {d.sourceName} ↗</a>
          </div>
        </div>
      )}
    </li>
  );
}
