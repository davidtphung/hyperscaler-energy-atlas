import { useMemo, useState, type CSSProperties } from "react";
import { HISTORY } from "../data/history";
import { HISTORY_ERA, HISTORY_ERA_ORDER } from "../lib/theme";
import type { HistoryEra } from "../types";

function toggle<T>(s: Set<T>, v: T): Set<T> {
  const n = new Set(s);
  n.has(v) ? n.delete(v) : n.add(v);
  return n;
}

export default function HistoryView() {
  const [eras, setEras] = useState<Set<HistoryEra>>(new Set());

  const byEra = useMemo(() => {
    const m = new Map<HistoryEra, typeof HISTORY>();
    for (const h of HISTORY) {
      if (!m.has(h.era)) m.set(h.era, []);
      m.get(h.era)!.push(h);
    }
    for (const list of m.values()) list.sort((a, b) => a.year - b.year);
    return m;
  }, []);

  const span = useMemo(() => {
    if (!HISTORY.length) return { min: 1945, max: 2026 };
    const ys = HISTORY.map((h) => h.year);
    return { min: Math.min(...ys), max: Math.max(...ys) };
  }, []);

  const activeEras = HISTORY_ERA_ORDER.filter((e) => byEra.has(e) && (eras.size === 0 || eras.has(e)));

  return (
    <div className="page page--history">
      <header className="page__head">
        <p className="overview__eyebrow">History</p>
        <h1 className="page__title">From mainframe rooms to AI factories</h1>
        <p className="page__lead">
          {HISTORY.length} milestones tracing how the data center evolved, from the first computer rooms of the 1940s
          through carrier hotels, colocation, and cloud, to the gigawatt AI factories of today. {span.min} to {span.max}.
        </p>
      </header>

      <div className="dc-chips" style={{ marginBottom: 24 }}>
        {HISTORY_ERA_ORDER.filter((e) => byEra.has(e)).map((e) => (
          <button key={e} className="chip" aria-pressed={eras.has(e)} onClick={() => setEras(toggle(eras, e))}>
            <span className="chip__dot" style={{ background: HISTORY_ERA[e].color }} />
            {HISTORY_ERA[e].label}
            <span className="chip__count">{byEra.get(e)!.length}</span>
          </button>
        ))}
        {eras.size > 0 && <button className="chip chip--clear" onClick={() => setEras(new Set())}>All eras</button>}
      </div>

      <div className="hist">
        {activeEras.map((e) => (
          <section className="hist-era" key={e} style={{ "--era": HISTORY_ERA[e].color } as CSSProperties}>
            <div className="hist-era__head">
              <span className="hist-era__dot" />
              <h2 className="hist-era__name">{HISTORY_ERA[e].label}</h2>
              <span className="hist-era__span">{HISTORY_ERA[e].span}</span>
            </div>
            <div className="hist-items">
              {byEra.get(e)!.map((h) => (
                <article className="hist-item" key={h.id}>
                  <div className="hist-item__year" style={{ color: HISTORY_ERA[e].color }}>{h.year}</div>
                  <div className="hist-item__body">
                    <h3 className="hist-item__title">{h.title}</h3>
                    <p className="hist-item__desc">{h.description}</p>
                    <a className="hist-item__src" href={h.sourceUrl} target="_blank" rel="noopener noreferrer">
                      {h.sourceName} ↗
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
        {HISTORY.length === 0 && <div className="dc-empty">History timeline loading.</div>}
      </div>
    </div>
  );
}
