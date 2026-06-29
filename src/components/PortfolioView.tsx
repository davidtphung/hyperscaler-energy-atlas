import { useMemo } from "react";
import type { PreparedCommitment } from "../types";
import { SOURCE_GROUP_ORDER, SOURCE_GROUP_COLOR, sourceGroup, type SourceGroup } from "../lib/theme";
import { ERA, ERA_ORDER } from "../lib/era";
import { formatGW } from "../lib/format";
import { sumMW } from "../lib/select";
import LiveGrid from "./LiveGrid";

interface Props {
  commitments: PreparedCommitment[];
}

export default function PortfolioView({ commitments }: Props) {
  const data = useMemo(() => {
    const energy = commitments.filter((c) => c.category === "energy");
    const datacenter = commitments.filter((c) => c.category === "datacenter");

    // Generation portfolio by source group (supply only).
    const byGroup = new Map<SourceGroup, number>();
    for (const c of energy) {
      const g = sourceGroup(c.techType);
      byGroup.set(g, (byGroup.get(g) ?? 0) + (c.capacityMW ?? 0));
    }
    const groups = SOURCE_GROUP_ORDER.filter((g) => g !== "Datacenter load")
      .map((g) => ({ g, mw: byGroup.get(g) ?? 0 }))
      .filter((d) => d.mw > 0);
    const supplyTotal = groups.reduce((a, d) => a + d.mw, 0);

    // Firm vs speculative (energy supply).
    const firmSet = new Set(["operational", "construction", "ppa-signed"]);
    const firm = sumMW(energy.filter((c) => firmSet.has(c.status)));
    const spec = sumMW(energy.filter((c) => !firmSet.has(c.status)));

    // Evidence strength.
    const evid = { high: 0, medium: 0, low: 0 };
    for (const c of commitments) evid[c.confidence] += 1;

    // Era comparison (all categories, MW).
    const eras = ERA_ORDER.map((e) => {
      const rows = commitments.filter((c) => c.era === e);
      return { e, mw: sumMW(rows), n: rows.length };
    }).filter((d) => d.n > 0);
    const eraMax = Math.max(1, ...eras.map((d) => d.mw));

    return {
      groups,
      supplyTotal,
      firm,
      spec,
      evid,
      eras,
      eraMax,
      datacenterLoad: sumMW(datacenter),
      datacenterCount: datacenter.length,
      energyCount: energy.length,
    };
  }, [commitments]);

  const firmPct = data.firm + data.spec > 0 ? Math.round((data.firm / (data.firm + data.spec)) * 100) : 0;
  const evidTotal = data.evid.high + data.evid.medium + data.evid.low || 1;

  return (
    <div className="page page--portfolio">
      <header className="page__head">
        <p className="overview__eyebrow">Energy source portfolio</p>
        <h1 className="page__title">What the AI build is buying, by source</h1>
        <p className="page__lead">
          Committed generation across every mapped commitment, grouped by energy source, then read against
          firmness, evidence strength, era, and a live national grid for scale.
        </p>
      </header>

      <div className="portfolio-grid">
        <section className="card card--span2" aria-label="Generation mix by source">
          <h3 className="card__title">Generation portfolio</h3>
          <p className="card__sub">{formatGW(data.supplyTotal)} GW of supply across {data.energyCount} energy commitments</p>
          <div className="donut-wrap">
            <Donut groups={data.groups} total={data.supplyTotal} />
            <ul className="donut-legend">
              {data.groups.map((d) => (
                <li key={d.g}>
                  <span className="donut-legend__sw" style={{ background: SOURCE_GROUP_COLOR[d.g] }} />
                  <span className="donut-legend__name">{d.g}</span>
                  <span className="donut-legend__val">{formatGW(d.mw)} GW</span>
                  <span className="donut-legend__pct">{Math.round((d.mw / (data.supplyTotal || 1)) * 100)}%</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="card" aria-label="Firmness">
          <h3 className="card__title">Firm vs speculative</h3>
          <p className="card__sub">Energy supply by contract maturity</p>
          <div className="firm-meter" role="img" aria-label={`${firmPct} percent firm`}>
            <span className="firm-meter__fill" style={{ width: `${firmPct}%` }} />
          </div>
          <div className="firm-split">
            <div>
              <span className="firm-split__val">{formatGW(data.firm)} GW</span>
              <span className="firm-split__lab">Firm (operational, building, PPA)</span>
            </div>
            <div className="firm-split--muted">
              <span className="firm-split__val">{formatGW(data.spec)} GW</span>
              <span className="firm-split__lab">Speculative (announced, exploratory)</span>
            </div>
          </div>
        </section>

        <section className="card" aria-label="Evidence strength">
          <h3 className="card__title">Evidence strength</h3>
          <p className="card__sub">How well each record is sourced</p>
          <div className="evid">
            {(["high", "medium", "low"] as const).map((k) => (
              <div className="evid__row" key={k}>
                <span className="evid__k">{k === "high" ? "High confidence" : k === "medium" ? "Medium" : "Low / early"}</span>
                <span className="evid__track">
                  <span
                    className={`evid__fill evid__fill--${k}`}
                    style={{ width: `${(data.evid[k] / evidTotal) * 100}%` }}
                  />
                </span>
                <span className="evid__n">{data.evid[k]}</span>
              </div>
            ))}
          </div>
          <p className="card__foot">
            Every record links to a primary source. Confidence reflects how firm the reported figures are, not whether the deal is real.
          </p>
        </section>

        <section className="card card--span2" aria-label="Commitments by era">
          <h3 className="card__title">Before and after the AI boom</h3>
          <p className="card__sub">Committed capacity by era, anchored to late 2022</p>
          <div className="era-bars">
            {data.eras.map((d) => (
              <div className="era-bar" key={d.e}>
                <span className="era-bar__name">{ERA[d.e].label}</span>
                <span className="era-bar__track">
                  <span
                    className="era-bar__fill"
                    style={{ width: `${(d.mw / data.eraMax) * 100}%`, background: ERA[d.e].color }}
                  />
                </span>
                <span className="era-bar__val">{formatGW(d.mw)} GW</span>
                <span className="era-bar__n">{d.n}</span>
              </div>
            ))}
          </div>
          <div className="era-notes">
            {data.eras.map((d) => (
              <p key={d.e}>
                <span className="era-notes__dot" style={{ background: ERA[d.e].color }} />
                <b>{ERA[d.e].label}.</b> {ERA[d.e].blurb}
              </p>
            ))}
          </div>
        </section>

        <section className="card" aria-label="Datacenter load">
          <h3 className="card__title">Datacenter load mapped</h3>
          <p className="card__sub">Demand behind the buildout</p>
          <div className="bigstat">
            <span className="bigstat__val">{formatGW(data.datacenterLoad)}<small> GW</small></span>
            <span className="bigstat__lab">{data.datacenterCount} datacenter campuses with disclosed or estimated draw</span>
          </div>
          <p className="card__foot">
            Campus figures are headline build size, not instantaneous draw. Demand is tracked separately from generation supply.
          </p>
        </section>

        <LiveGrid />
      </div>
    </div>
  );
}

function Donut({ groups, total }: { groups: { g: SourceGroup; mw: number }[]; total: number }) {
  const r = 58;
  const C = 2 * Math.PI * r;
  let acc = 0;
  return (
    <svg className="donut" viewBox="0 0 160 160" role="img" aria-label="Generation mix donut chart">
      <g transform="rotate(-90 80 80)">
        <circle cx="80" cy="80" r={r} fill="none" stroke="var(--ink-700)" strokeWidth="22" />
        {groups.map((d) => {
          const frac = total > 0 ? d.mw / total : 0;
          const len = frac * C;
          const seg = (
            <circle
              key={d.g}
              cx="80"
              cy="80"
              r={r}
              fill="none"
              stroke={SOURCE_GROUP_COLOR[d.g]}
              strokeWidth="22"
              strokeDasharray={`${len} ${C - len}`}
              strokeDashoffset={-acc * C}
            />
          );
          acc += frac;
          return seg;
        })}
      </g>
      <text x="80" y="74" textAnchor="middle" className="donut__big">
        {formatGW(total)}
      </text>
      <text x="80" y="92" textAnchor="middle" className="donut__unit">
        GW supply
      </text>
    </svg>
  );
}
