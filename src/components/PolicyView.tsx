import { useMemo, useState } from "react";
import { POLICY } from "../data/policy";
import type { PolicyRecord, PolicyStance, PolicyLevel } from "../types";
import { POLICY_STANCE, POLICY_LEVEL, POLICY_CATEGORY_LABEL } from "../lib/theme";
import { formatMonthYear } from "../lib/format";
import ScatterMap, { type ScatterPoint } from "./ScatterMap";

function toggle<T>(s: Set<T>, v: T): Set<T> {
  const n = new Set(s);
  n.has(v) ? n.delete(v) : n.add(v);
  return n;
}
const STANCES: PolicyStance[] = ["for", "against", "mixed"];
const LEVELS: PolicyLevel[] = ["local", "state", "national", "supranational"];

export default function PolicyView() {
  const [query, setQuery] = useState("");
  const [stances, setStances] = useState<Set<PolicyStance>>(new Set());
  const [levels, setLevels] = useState<Set<PolicyLevel>>(new Set());
  const [selected, setSelected] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().split(/\s+/).filter(Boolean);
    return POLICY.filter((p) => {
      if (stances.size && !stances.has(p.stance)) return false;
      if (levels.size && !levels.has(p.level)) return false;
      if (q.length) {
        const hay = `${p.title} ${p.jurisdiction} ${p.country} ${p.category} ${p.summary}`.toLowerCase();
        if (!q.every((t) => hay.includes(t))) return false;
      }
      return true;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [query, stances, levels]);

  const stats = useMemo(() => {
    const by = { for: 0, against: 0, mixed: 0 } as Record<PolicyStance, number>;
    for (const p of filtered) by[p.stance] += 1;
    return {
      total: filtered.length,
      ...by,
      countries: new Set(filtered.map((p) => p.country)).size,
      national: filtered.filter((p) => p.level === "national" || p.level === "supranational").length,
    };
  }, [filtered]);

  const points: ScatterPoint[] = useMemo(
    () =>
      filtered.map((p) => ({
        id: p.id,
        lat: p.lat,
        lng: p.lng,
        color: POLICY_STANCE[p.stance].color,
        r: 5,
        label: p.title,
        sublabel: `${p.jurisdiction} · ${POLICY_STANCE[p.stance].label} · ${POLICY_CATEGORY_LABEL[p.category] ?? p.category}`,
      })),
    [filtered]
  );

  const stanceCounts = useMemo(() => {
    const m = { for: 0, against: 0, mixed: 0 } as Record<PolicyStance, number>;
    for (const p of POLICY) m[p.stance] += 1;
    return m;
  }, []);
  const levelCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const p of POLICY) m[p.level] = (m[p.level] ?? 0) + 1;
    return m;
  }, []);
  const stanceTotal = stanceCounts.for + stanceCounts.against + stanceCounts.mixed || 1;
  const anyFilter = stances.size + levels.size > 0 || query.length > 0;

  return (
    <div className="page page--policy">
      <header className="page__head">
        <p className="overview__eyebrow">Policy layer</p>
        <h1 className="page__title">Policy for and against AI data centers</h1>
        <p className="page__lead">
          The rules shaping where AI data centers can be built: incentives and green-power mandates that pull them in,
          moratoria and restrictions that push back, and the contested middle of pending bills and split rulings.
          Tagged by jurisdiction, level of government, and stance, each linked to a source.
        </p>
      </header>

      <div className="dc-stats">
        <Stat v={String(stats.total)} l="Policy actions" />
        <Stat v={String(stats.for)} l="For" c={POLICY_STANCE.for.color} />
        <Stat v={String(stats.against)} l="Against" c={POLICY_STANCE.against.color} />
        <Stat v={String(stats.mixed)} l="Mixed" c={POLICY_STANCE.mixed.color} />
        <Stat v={String(stats.national)} l="National / supra" />
        <Stat v={String(stats.countries)} l="Countries" />
      </div>

      <div className="dc-maprow">
        <ScatterMap points={points} view="world" selectedId={selected} onSelect={setSelected} height={380} />
        <div className="dc-mapctl">
          <h3 className="sources-h">Balance of policy</h3>
          <div className="pol-balance" role="img" aria-label={`For ${stanceCounts.for}, against ${stanceCounts.against}, mixed ${stanceCounts.mixed}`}>
            {STANCES.map((s) => (
              <span key={s} className="pol-balance__seg" style={{ width: `${(stanceCounts[s] / stanceTotal) * 100}%`, background: POLICY_STANCE[s].color }} />
            ))}
          </div>
          <div className="dc-legend">
            {STANCES.map((s) => (
              <span key={s} className="dc-legend__item">
                <span className="dc-legend__dot" style={{ background: POLICY_STANCE[s].color }} />
                {POLICY_STANCE[s].label}
                <b style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", color: "var(--text-3)", fontWeight: 400 }}>{stanceCounts[s]}</b>
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
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search policy, jurisdiction, category" aria-label="Search policy" />
        </div>
        <div className="dc-chips">
          {STANCES.map((s) => (
            <button key={s} className="chip" aria-pressed={stances.has(s)} onClick={() => setStances(toggle(stances, s))}>
              <span className="chip__dot" style={{ background: POLICY_STANCE[s].color }} />
              {POLICY_STANCE[s].label}
              <span className="chip__count">{stanceCounts[s]}</span>
            </button>
          ))}
          {LEVELS.filter((l) => levelCounts[l]).map((l) => (
            <button key={l} className="chip" aria-pressed={levels.has(l)} onClick={() => setLevels(toggle(levels, l))}>
              {POLICY_LEVEL[l]}
              <span className="chip__count">{levelCounts[l]}</span>
            </button>
          ))}
          {anyFilter && <button className="chip chip--clear" onClick={() => { setQuery(""); setStances(new Set()); setLevels(new Set()); }}>Clear</button>}
        </div>
      </div>

      <div className="dc-table-wrap">
        <ul className="dc-table" role="list">
          {filtered.map((p) => (
            <Row key={p.id} p={p} open={selected === p.id} onToggle={() => setSelected(selected === p.id ? null : p.id)} />
          ))}
        </ul>
        {filtered.length === 0 && <div className="dc-empty">No policy actions match. Try clearing a filter.</div>}
      </div>
    </div>
  );
}

function Stat({ v, l, c }: { v: string; l: string; c?: string }) {
  return (
    <div className="dc-stat">
      <span className="dc-stat__v" style={c ? { color: c } : undefined}>{v}</span>
      <span className="dc-stat__l">{l}</span>
    </div>
  );
}

function Row({ p, open, onToggle }: { p: PolicyRecord; open: boolean; onToggle: () => void }) {
  return (
    <li className={`dc-li${open ? " dc-li--open" : ""}`}>
      <button className="pol-row" onClick={onToggle} aria-expanded={open}>
        <span className="pol-stance" style={{ background: POLICY_STANCE[p.stance].color }} aria-label={POLICY_STANCE[p.stance].label} />
        <span className="dc-cell-main">
          <span className="dc-fac">{p.title}</span>
          <span className="dc-op">{p.jurisdiction} · {POLICY_LEVEL[p.level]}</span>
        </span>
        <span className="dc-type">{POLICY_CATEGORY_LABEL[p.category] ?? p.category}</span>
        <span className="dc-mw" style={{ textAlign: "right" }}>{formatMonthYear(p.date)}</span>
      </button>
      {open && (
        <div className="dc-detail">
          <p>{p.summary}</p>
          <div className="dc-meta">
            <span>Stance: {POLICY_STANCE[p.stance].label}</span>
            <span>Level: {POLICY_LEVEL[p.level]}</span>
            <span>Confidence: {p.confidence}</span>
            <a href={p.sourceUrl} target="_blank" rel="noopener noreferrer">Source: {p.sourceName} ↗</a>
          </div>
        </div>
      )}
    </li>
  );
}
