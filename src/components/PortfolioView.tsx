import { useMemo } from "react";
import type { PreparedCommitment } from "../types";
import { ERA, ERA_ORDER } from "../lib/era";
import { formatFirmMW, formatNumberKind } from "../lib/format";
import { firmKindTotals } from "../lib/select";
import LiveGrid from "./LiveGrid";

interface Props {
  commitments: PreparedCommitment[];
}

export default function PortfolioView({ commitments }: Props) {
  const data = useMemo(() => {
    const evid = { high: 0, medium: 0, low: 0 };
    for (const c of commitments) evid[c.confidence] += 1;

    const eras = ERA_ORDER.map((e) => {
      const rows = commitments.filter((c) => c.era === e);
      return { e, n: rows.length };
    }).filter((d) => d.n > 0);
    const eraMax = Math.max(1, ...eras.map((d) => d.n));

    return {
      kinds: firmKindTotals(commitments),
      evid,
      eras,
      eraMax,
    };
  }, [commitments]);

  const evidTotal = data.evid.high + data.evid.medium + data.evid.low || 1;

  return (
    <div className="page page--portfolio">
      <header className="page__head">
        <p className="overview__eyebrow">Energy source portfolio</p>
        <h1 className="page__title">What the AI build is buying, by source</h1>
        <p className="page__lead">
          Firm totals for each kind of commitment. The kinds are listed separately and are not added together.
        </p>
      </header>

      <div className="portfolio-grid">
        <section className="card card--span2" aria-label="Firm totals by kind">
          <h3 className="card__title">Firm totals by kind</h3>
          <p className="card__sub">Counted rows only. Each line is its own total.</p>
          <ul className="donut-legend">
            {data.kinds.map((k) => (
              <li key={k.kind}>
                <span className="donut-legend__name">{formatNumberKind(k.kind)}</span>
                <span className="donut-legend__val">{formatFirmMW(k.mw)}</span>
                <span className="donut-legend__pct">{k.rows} rows</span>
              </li>
            ))}
          </ul>
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
          <p className="card__sub">Commitment count by era, anchored to late 2022. Megawatts are not added across kinds.</p>
          <div className="era-bars">
            {data.eras.map((d) => (
              <div className="era-bar" key={d.e}>
                <span className="era-bar__name">{ERA[d.e].label}</span>
                <span className="era-bar__track">
                  <span
                    className="era-bar__fill"
                    style={{ width: `${(d.n / data.eraMax) * 100}%`, background: ERA[d.e].color }}
                  />
                </span>
                <span className="era-bar__val">{d.n}</span>
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
            <span className="bigstat__val">{data.kinds[0] ? formatFirmMW(data.kinds[0].mw) : "0 MW"}</span>
            <span className="bigstat__lab">Data center IT counted on its own. Not added to generation.</span>
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

