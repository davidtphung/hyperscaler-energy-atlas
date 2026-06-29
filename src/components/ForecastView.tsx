import { useMemo, useState } from "react";
import { COMMITMENTS } from "../data/commitments";
import { prepare } from "../lib/select";
import { formatGW } from "../lib/format";
import { useElementSize } from "../lib/hooks";

// Forecast is a transparent model, not a source-backed projection. It extends
// the observed cumulative committed capacity forward under three compound
// growth scenarios. Assumptions are stated; treat as illustrative.
const PROJ_END = 2031;
const SCENARIOS = [
  { key: "constrained", label: "Constrained", cagr: 0.08, color: "#9aa3ad", note: "Heavy permitting friction, grid limits, and policy pushback." },
  { key: "base", label: "Base", cagr: 0.2, color: "#c8f135", note: "Current momentum continues, bottlenecks ease gradually." },
  { key: "aggressive", label: "Aggressive", cagr: 0.34, color: "#36c5bf", note: "Fast-track permitting, abundant power, full AI buildout." },
] as const;

type Key = (typeof SCENARIOS)[number]["key"] | "all";

export default function ForecastView() {
  const { ref, width } = useElementSize<HTMLDivElement>();
  const [focus, setFocus] = useState<Key>("all");

  const model = useMemo(() => {
    const prep = prepare(COMMITMENTS);
    const startYear = Math.min(...prep.map((c) => c.year));
    const now = 2026;
    const cumAt = (y: number) => prep.filter((c) => c.year <= y).reduce((a, c) => a + (c.capacityMW ?? 0), 0);
    const hist: { year: number; mw: number }[] = [];
    for (let y = startYear; y <= now; y++) hist.push({ year: y, mw: cumAt(y) });
    const base2026 = hist[hist.length - 1].mw;
    const proj = SCENARIOS.map((s) => {
      const pts: { year: number; mw: number }[] = [{ year: now, mw: base2026 }];
      for (let y = now + 1; y <= PROJ_END; y++) pts.push({ year: y, mw: base2026 * Math.pow(1 + s.cagr, y - now) });
      return { ...s, pts, end: base2026 * Math.pow(1 + s.cagr, PROJ_END - now) };
    });
    return { startYear, now, hist, proj, yMax: Math.max(...proj.map((p) => p.end)), base2026 };
  }, []);

  const h = 320;
  const padL = 46, padR = 14, padT = 16, padB = 28;
  const innerW = Math.max(1, width - padL - padR);
  const innerH = h - padT - padB;
  const x = (year: number) => padL + ((year - model.startYear) / (PROJ_END - model.startYear)) * innerW;
  const y = (mw: number) => padT + innerH - (mw / model.yMax) * innerH;
  const line = (pts: { year: number; mw: number }[]) => pts.map((p, i) => `${i ? "L" : "M"}${x(p.year)},${y(p.mw)}`).join(" ");

  const constrained = model.proj.find((p) => p.key === "constrained")!;
  const aggressive = model.proj.find((p) => p.key === "aggressive")!;
  const band = `${aggressive.pts.map((p, i) => `${i ? "L" : "M"}${x(p.year)},${y(p.mw)}`).join(" ")} ${[...constrained.pts].reverse().map((p) => `L${x(p.year)},${y(p.mw)}`).join(" ")} Z`;

  const yTicks = useMemo(() => {
    const step = model.yMax > 600000 ? 200000 : 100000;
    const out: number[] = [];
    for (let v = 0; v <= model.yMax; v += step) out.push(v);
    return out;
  }, [model.yMax]);

  return (
    <div className="page page--forecast">
      <header className="page__head">
        <p className="overview__eyebrow">Forecast</p>
        <h1 className="page__title">Where the buildout could go</h1>
        <p className="page__lead">
          A transparent projection of committed capacity through {PROJ_END}, extending the observed buildout under three
          compound scenarios. This is a model, not a source-backed forecast. The cone shows how policy, power, and
          permitting could widen or pinch the path.
        </p>
      </header>

      <div className="dc-stats">
        <Stat v={formatGW(model.base2026)} u="GW" l="Committed by 2026" />
        {model.proj.map((p) => (
          <Stat key={p.key} v={formatGW(p.end)} u="GW" l={`${p.label} by ${PROJ_END}`} c={p.color} />
        ))}
        <Stat v={`${Math.round((aggressive.end / model.base2026 - 1) * 100)}%`} l="Aggressive upside" />
      </div>

      <div className="fc-chart-card">
        <div className="fc-scenarios" role="group" aria-label="Highlight scenario">
          <button className="chip" aria-pressed={focus === "all"} onClick={() => setFocus("all")}>All</button>
          {SCENARIOS.map((s) => (
            <button key={s.key} className="chip" aria-pressed={focus === s.key} onClick={() => setFocus(s.key)}>
              <span className="chip__dot" style={{ background: s.color }} />
              {s.label}
            </button>
          ))}
        </div>

        <div className="fc-chart" ref={ref} style={{ height: h }}>
          {width > 0 && (
            <svg width={width} height={h} role="img" aria-label={`Forecast fan chart of committed capacity to ${PROJ_END}`}>
              {yTicks.map((v) => (
                <g key={v}>
                  <line x1={padL} y1={y(v)} x2={width - padR} y2={y(v)} className="tl-tick" />
                  <text x={padL - 8} y={y(v) + 3} textAnchor="end" className="tl-tick-label">{formatGW(v)}</text>
                </g>
              ))}
              {[model.startYear, 2023, model.now, 2028, PROJ_END].map((yr) => (
                <text key={yr} x={x(yr)} y={h - 8} textAnchor="middle" className="tl-tick-label">{yr}</text>
              ))}

              {/* uncertainty cone */}
              <path d={band} fill="rgba(200,241,53,0.06)" stroke="none" />

              {/* now divider */}
              <line x1={x(model.now)} y1={padT} x2={x(model.now)} y2={padT + innerH} stroke="var(--line-2)" strokeDasharray="3 3" />
              <text x={x(model.now) + 5} y={padT + 10} className="tl-tick-label">now</text>

              {/* historical */}
              <path d={line(model.hist)} fill="none" stroke="var(--text)" strokeWidth={2} />

              {/* projections */}
              {model.proj.map((p) => {
                const dim = focus !== "all" && focus !== p.key;
                return (
                  <path
                    key={p.key}
                    d={line(p.pts)}
                    fill="none"
                    stroke={p.color}
                    strokeWidth={focus === p.key ? 2.6 : 1.8}
                    strokeDasharray="5 4"
                    opacity={dim ? 0.25 : 1}
                  />
                );
              })}
              {model.proj.map((p) => (
                <circle key={p.key} cx={x(PROJ_END)} cy={y(p.end)} r={focus === p.key || focus === "all" ? 4 : 2.5} fill={p.color} />
              ))}
            </svg>
          )}
        </div>

        <div className="fc-notes">
          {model.proj.map((p) => (
            <div className="fc-note" key={p.key}>
              <span className="fc-note__dot" style={{ background: p.color }} />
              <span>
                <b>{p.label} ({Math.round(p.cagr * 100)}% CAGR).</b> {p.note} Reaches about {formatGW(p.end)} GW by {PROJ_END}.
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="prose" style={{ maxWidth: 760, marginTop: 26 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 8px" }}>Method and limits</h2>
        <p style={{ fontSize: 13.5, lineHeight: 1.65, color: "var(--text-2)" }}>
          The historical line is the cumulative sum of committed electrical capacity across every commitment in the
          atlas, by announcement year. Projections apply a constant compound annual growth rate to the 2026 total under
          each scenario. Real buildout is lumpy and gated by interconnection queues, permitting, supply chains, and the
          policy actions tracked elsewhere in this dashboard, so treat the cone as a planning aid rather than a
          prediction. Constrained roughly corresponds to the friction visible in the Contested and Policy views.
        </p>
      </div>
    </div>
  );
}

function Stat({ v, u, l, c }: { v: string; u?: string; l: string; c?: string }) {
  return (
    <div className="dc-stat">
      <span className="dc-stat__v" style={c ? { color: c } : undefined}>{v}{u && <small> {u}</small>}</span>
      <span className="dc-stat__l">{l}</span>
    </div>
  );
}
