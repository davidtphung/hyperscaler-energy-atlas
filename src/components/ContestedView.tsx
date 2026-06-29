import { useMemo, useState } from "react";
import { CONTESTED } from "../data/contested";
import type { ContestedProject, ContestedStatus, ContestationType } from "../types";
import { CONTESTED_STATUS, CONTESTED_STATUS_ORDER, CONTESTATION_LABEL } from "../lib/theme";
import ScatterMap, { type ScatterPoint } from "./ScatterMap";

function toggle<T>(s: Set<T>, v: T): Set<T> {
  const n = new Set(s);
  n.has(v) ? n.delete(v) : n.add(v);
  return n;
}
const fmtUSD = (v: number | null) =>
  v == null ? "n/a" : v >= 1e9 ? `$${(v / 1e9).toFixed(1)}B` : `$${Math.round(v / 1e6)}M`;

const KILLED = new Set<ContestedStatus>(["blocked", "withdrawn", "denied"]);

export default function ContestedView() {
  const [query, setQuery] = useState("");
  const [statuses, setStatuses] = useState<Set<ContestedStatus>>(new Set());
  const [ctypes, setCtypes] = useState<Set<ContestationType>>(new Set());
  const [view, setView] = useState<"world" | "us">("us");
  const [selected, setSelected] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().split(/\s+/).filter(Boolean);
    return CONTESTED.filter((c) => {
      if (statuses.size && !statuses.has(c.status)) return false;
      if (ctypes.size && !c.contestationTypes.some((t) => ctypes.has(t))) return false;
      if (q.length) {
        const hay = `${c.project} ${c.company} ${c.city} ${c.county} ${c.state} ${c.country} ${c.oppositionActors} ${c.summary}`.toLowerCase();
        if (!q.every((t) => hay.includes(t))) return false;
      }
      return true;
    }).sort((a, b) => b.severity - a.severity);
  }, [query, statuses, ctypes]);

  const stats = useMemo(() => {
    const capex = filtered.reduce((a, c) => a + (c.capexUSD ?? 0), 0);
    const mw = filtered.reduce((a, c) => a + (c.capacityMW ?? 0), 0);
    const places = new Set(filtered.map((c) => `${c.city}|${c.state}|${c.country}`));
    return {
      total: filtered.length,
      killed: filtered.filter((c) => KILLED.has(c.status)).length,
      litigation: filtered.filter((c) => c.status === "litigation").length,
      moratorium: filtered.filter((c) => c.status === "moratorium").length,
      capex,
      mw,
      places: places.size,
    };
  }, [filtered]);

  const statusCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const c of CONTESTED) m[c.status] = (m[c.status] ?? 0) + 1;
    return m;
  }, []);
  const typeCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const c of CONTESTED) for (const t of c.contestationTypes) m[t] = (m[t] ?? 0) + 1;
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, []);
  const typeMax = Math.max(1, ...typeCounts.map(([, n]) => n));

  const points: ScatterPoint[] = useMemo(
    () =>
      filtered.map((c) => ({
        id: c.id,
        lat: c.lat,
        lng: c.lng,
        color: CONTESTED_STATUS[c.status].color,
        r: 3.5 + c.severity * 1.4,
        label: c.project,
        sublabel: `${c.company} · ${[c.city, c.state].filter(Boolean).join(", ")} · ${CONTESTED_STATUS[c.status].label}`,
      })),
    [filtered]
  );

  const anyFilter = statuses.size + ctypes.size > 0 || query.length > 0;

  return (
    <div className="page page--contested">
      <header className="page__head">
        <p className="overview__eyebrow">Opposition tracker</p>
        <h1 className="page__title">Contested data centers</h1>
        <p className="page__lead">
          Data center projects that were blocked, stalled, denied, withdrawn, protested, put under moratorium, or
          litigated by NIMBY opposition or local, state, and federal authorities. Protest is distinguished from
          formal denial, and delay from cancellation. Every case links to a primary source.
        </p>
      </header>

      <div className="dc-stats">
        <Stat v={String(stats.total)} l="Contested cases" />
        <Stat v={String(stats.killed)} l="Blocked, withdrawn or denied" />
        <Stat v={String(stats.litigation)} l="In litigation" />
        <Stat v={String(stats.moratorium)} l="Moratoria" />
        <Stat v={fmtUSD(stats.capex)} l="Capex contested" />
        <Stat v={String(stats.places)} l="Localities" />
      </div>

      <div className="dc-maprow">
        <ScatterMap points={points} view={view} selectedId={selected} onSelect={setSelected} height={380} />
        <div className="dc-mapctl">
          <div className="map__viewtoggle" style={{ position: "static" }}>
            <button className="seg" aria-pressed={view === "us"} onClick={() => setView("us")}>US</button>
            <button className="seg" aria-pressed={view === "world"} onClick={() => setView("world")}>Global</button>
          </div>
          <p className="dc-mapnote">Dot size reflects opposition severity, 1 (mild) to 5 (project killed).</p>
          <div className="ct-types">
            <h3 className="sources-h">Contestation themes</h3>
            {typeCounts.slice(0, 8).map(([t, n]) => (
              <div className="ct-type" key={t}>
                <span className="ct-type__l">{CONTESTATION_LABEL[t as ContestationType] ?? t}</span>
                <span className="ct-type__track"><span className="ct-type__fill" style={{ width: `${(n / typeMax) * 100}%` }} /></span>
                <span className="ct-type__n">{n}</span>
              </div>
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
            placeholder="Search project, company, place, opposition"
            aria-label="Search contested projects"
          />
        </div>
        <div className="dc-chips">
          {CONTESTED_STATUS_ORDER.filter((s) => statusCounts[s]).map((s) => (
            <button key={s} className="chip" aria-pressed={statuses.has(s)} onClick={() => setStatuses(toggle(statuses, s))}>
              <span className="chip__dot" style={{ background: CONTESTED_STATUS[s].color }} />
              {CONTESTED_STATUS[s].label}
              <span className="chip__count">{statusCounts[s]}</span>
            </button>
          ))}
          {anyFilter && (
            <button className="chip chip--clear" onClick={() => { setQuery(""); setStatuses(new Set()); setCtypes(new Set()); }}>Clear</button>
          )}
        </div>
      </div>

      <div className="dc-table-wrap">
        <ul className="dc-table" role="list">
          {filtered.map((c) => (
            <Case key={c.id} c={c} open={selected === c.id} onToggle={() => setSelected(selected === c.id ? null : c.id)} />
          ))}
        </ul>
        {filtered.length === 0 && <div className="dc-empty">No cases match. Try clearing a filter.</div>}
      </div>
    </div>
  );
}

function Stat({ v, l }: { v: string; l: string }) {
  return (
    <div className="dc-stat">
      <span className="dc-stat__v">{v}</span>
      <span className="dc-stat__l">{l}</span>
    </div>
  );
}

function Case({ c, open, onToggle }: { c: ContestedProject; open: boolean; onToggle: () => void }) {
  return (
    <li className={`dc-li${open ? " dc-li--open" : ""}`}>
      <button className="ct-row" onClick={onToggle} aria-expanded={open}>
        <span className="ct-sev" aria-label={`Severity ${c.severity} of 5`}>
          {[1, 2, 3, 4, 5].map((i) => (
            <span key={i} className={`ct-sev__d${i <= c.severity ? " on" : ""}`} />
          ))}
        </span>
        <span className="dc-cell-main">
          <span className="dc-fac">{c.project}</span>
          <span className="dc-op">{c.company}</span>
        </span>
        <span className="dc-loc">{[c.city, c.state || c.country].filter(Boolean).join(", ")}</span>
        <span className="dc-status">
          <span className="dc-status__dot" style={{ background: CONTESTED_STATUS[c.status].color }} />
          {CONTESTED_STATUS[c.status].label}
        </span>
      </button>
      {open && (
        <div className="dc-detail">
          <p>{c.summary}</p>
          <div className="ct-tags">
            {c.contestationTypes.map((t) => (
              <span key={t} className="ct-tag">{CONTESTATION_LABEL[t]}</span>
            ))}
          </div>
          <div className="dc-meta">
            {c.oppositionActors && <span>Opposition: {c.oppositionActors}</span>}
            {c.governmentBody && <span>Body: {c.governmentBody}</span>}
            {c.capexUSD && <span>Capex: {fmtUSD(c.capexUSD)}</span>}
            <span>Confidence: {c.confidence}</span>
            <a href={c.sourceUrl} target="_blank" rel="noopener noreferrer">Source: {c.sourceName} ↗</a>
          </div>
        </div>
      )}
    </li>
  );
}
