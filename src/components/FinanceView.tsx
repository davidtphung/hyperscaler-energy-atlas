import { useMemo } from "react";
import { COMMITMENTS } from "../data/commitments";
import { DATACENTERS } from "../data/datacenters";
import { POLICY } from "../data/policy";
import type { FinanceMetric } from "../types";
import {
  FINANCE_CONFIDENCE,
  commitmentBridge,
  creditCompareRows,
  financeSources,
  requireMetric,
  stackScenarios,
  waterfallSteps,
} from "../lib/finance";
import { STATUS, buyerAccent } from "../lib/theme";
import { formatGW, formatUSDLarge } from "../lib/format";

interface Props {
  onGoPolicy?: () => void;
  onGoEconomics?: () => void;
}

export default function FinanceView({ onGoPolicy, onGoEconomics }: Props) {
  const envelope = requireMetric("envelope-5t");
  const debt35 = requireMetric("stack-debt-70");
  const debt4 = requireMetric("stack-debt-4t");
  const revenue = requireMetric("wf-revenue");
  const runToday = requireMetric("run-today");
  const cagr = requireMetric("run-cagr");
  const columbiaLev = requireMetric("lev-columbia-facility");
  const tunguzLev = requireMetric("lev-tunguz-facility");
  const beignet = requireMetric("lev-beignet");
  const corpLev = requireMetric("lev-corporate-typical");
  const msSplit = requireMetric("lev-ms-split");
  const columbiaEnv = requireMetric("envelope-columbia-us");
  const columbiaGw = requireMetric("envelope-columbia-base-gw");
  const usGw = requireMetric("envelope-us-gw-tunguz");
  const gartnerSw = requireMetric("run-gartner-software");
  const gartnerIt = requireMetric("run-gartner-it-2026");
  const gartner9 = requireMetric("run-gartner-9t");
  const muniFed = requireMetric("mkt-us-muni-fed");
  const privateUse = requireMetric("muni-private-use");
  const muniTools = requireMetric("muni-tools");
  const flowStock = requireMetric("ctx-flow-stock");
  const cloudGrowth = requireMetric("run-cloud-growth");
  const thread = requireMetric("ctx-x-thread");

  const stacks = useMemo(() => stackScenarios(), []);
  const steps = useMemo(() => waterfallSteps(), []);
  const credit = useMemo(() => creditCompareRows(), []);
  const sources = useMemo(() => financeSources(), []);
  const bridge = useMemo(() => commitmentBridge(COMMITMENTS), []);
  const taxPolicies = useMemo(() => POLICY.filter((p) => p.category === "tax-incentive"), []);

  const maxBuyerMW = Math.max(1, ...bridge.byBuyer.map((b) => b.mw));
  const disclosedGW = formatGW(bridge.mw);
  const dcCount = DATACENTERS.length;

  return (
    <div className="page page--finance">
      <header className="page__head">
        <p className="overview__eyebrow">Finance</p>
        <h1 className="page__title">Capital for the AI buildout</h1>
        <p className="page__lead">
          Cash, equity, debt, bonds, and munis sitting next to the public energy and data-center
          commitments already mapped in this atlas. Figures are labeled by source, as-of date, and
          confidence. Analyst claims stay claims.
        </p>
      </header>

      <aside className="fin-disclaimer" role="note">
        Educational scale, not investment advice. Nothing here is a recommendation to buy, sell, or
        underwrite a security. Markets clear through spreads. Announcement gigawatts are not
        energized megawatts, and a multi-year debt <em>flow</em> is not an outstanding <em>stock</em>.
      </aside>

      <div className="fin-legend" aria-label="Confidence key">
        {(Object.keys(FINANCE_CONFIDENCE) as Array<keyof typeof FINANCE_CONFIDENCE>).map((k) => (
          <span key={k} className="fin-legend__item">
            <span className="fin-badge" data-c={k}>
              {FINANCE_CONFIDENCE[k].label}
            </span>
            <span className="fin-legend__blurb">{FINANCE_CONFIDENCE[k].blurb}</span>
          </span>
        ))}
      </div>

      <div className="dc-stats">
        <Stat v={envelope.display} l="Capex envelope to ~2030" c={envelope} />
        <Stat v={debt35.display} l="Debt at 70% of $5T" c={debt35} />
        <Stat v={debt4.display} l="Tunguz headline debt" c={debt4} />
        <Stat v={revenue.display} l="Implied AI revenue" c={revenue} />
        <Stat v={runToday.display} l="Today's AI run-rate band" c={runToday} />
        <Stat v={`${disclosedGW} GW`} l="Mapped announcement GW" note="Atlas commitments, not finance" />
      </div>

      {/* 1. Capital stack */}
      <section className="card card--full fin-section" aria-label="Capital stack">
        <h2 className="card__title">Capital stack</h2>
        <p className="card__sub">
          Equity versus debt on a claimed global AI data-center envelope, then the gap between a
          70% mid-case and Tunguz's $4T headline.
        </p>
        <p className="fin-copy">
          Over the next five years Tunguz, citing J.P. Morgan Asset Management, Western Asset, and
          PIMCO, puts the global buildout near <Cite m={envelope} />. Data centers are financed like
          real estate: some cash and equity, mostly debt. Tunguz cites facility leverage of{" "}
          <Cite m={tunguzLev} /> (Columbia / CREFC), versus about <Cite m={corpLev} /> on a typical
          corporate balance sheet. Columbia's own paper, which we opened, writes{" "}
          <Cite m={columbiaLev} /> on the physical facility and power, because hyperscaler equity
          often buys the IT kit while project debt buys the building.
        </p>
        <p className="fin-copy">
          Synthetic JV SPVs can go further. The Meta / Blue Owl Hyperion vehicle (Beignet) is{" "}
          <Cite m={beignet} />. That deal already lives on the Economics tab as a development JV.
        </p>

        <div className="dc-table-wrap fin-table">
          <div className="dc-row fin-stack-row fin-stack-row--head" role="row">
            <span className="dc-th" style={{ cursor: "default" }}>Scenario</span>
            <span className="dc-th" style={{ cursor: "default" }}>Leverage</span>
            <span className="dc-th dc-num" style={{ cursor: "default" }}>Debt</span>
            <span className="dc-th dc-num" style={{ cursor: "default" }}>Equity</span>
            <span className="dc-th" style={{ cursor: "default" }}>Why this number</span>
          </div>
          <ul className="dc-table" role="list">
            {stacks.map((s) => (
              <li key={s.id} className="dc-li">
                <div className="dc-row fin-stack-row">
                  <span className="dc-fac">{s.label}</span>
                  <span className="dc-mw">{s.leveragePct}</span>
                  <span className="dc-num dc-mw">
                    {s.debt.display} <Conf m={s.debt} />
                  </span>
                  <span className="dc-num dc-mw">
                    {s.equity.display} <Conf m={s.equity} />
                  </span>
                  <span className="fin-cell-note">{s.note}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="fin-stacks" aria-hidden="true">
          {stacks.map((s) => {
            const debt = s.debt.value ?? 0;
            const equity = s.equity.value ?? 0;
            const total = debt + equity || 1;
            return (
              <div key={s.id} className="fin-stackvis">
                <div className="fin-stackvis__lab">
                  {s.label}: {s.debt.display} debt / {s.equity.display} equity
                </div>
                <div className="fin-stackvis__bar">
                  <span className="fin-stackvis__debt" style={{ width: `${(debt / total) * 100}%` }} />
                  <span className="fin-stackvis__eq" style={{ width: `${(equity / total) * 100}%` }} />
                </div>
              </div>
            );
          })}
          <div className="fin-stackvis__key">
            <span><i className="fin-swatch" style={{ background: "var(--signal)" }} /> Debt</span>
            <span><i className="fin-swatch" style={{ background: "#7fc4ec" }} /> Equity / cash</span>
          </div>
        </div>

        <div className="fin-callout">
          <h3 className="fin-callout__h">Why $3.5T and $4T both appear</h3>
          <p>
            $3.5T is 70% of the $5T envelope, the midpoint of Tunguz's 65% to 75% facility band.
            $4T is his headline comparison number. That is 80% of $5T, which sits inside Columbia's
            70% to 80% facility range and closer to a book that includes 90% SPVs like Beignet. The
            $0.5T gap is a higher assumed leverage on the same claimed envelope, not a second
            independent forecast. Both rows inherit claim confidence because the $5T input is a
            house-research cite we cannot open.
          </p>
        </div>

        <p className="fin-copy">
          A different academic envelope: Columbia scales a 200 GW US planned increment at about
          $8.2B per 200 MW campus (building, power, and chips) and gets <Cite m={columbiaEnv} />{" "}
          through 2032. That is US-only and includes IT equipment. Do not add it to the $5T global
          figure. Columbia's installed-plus-construction tally is <Cite m={columbiaGw} />, against
          Tunguz's <Cite m={usGw} />. Those GW rows stay off the dollar charts.
        </p>
        <p className="card__foot">
          Morgan Stanley, as restated by Columbia, sees an all-in 2025 to 2028 mix near{" "}
          <Cite m={msSplit} /> because IT kit is mostly equity-funded. Facility debt can still sit
          at 70% to 90% on the building.{" "}
          {onGoEconomics && (
            <button type="button" className="fin-textbtn" onClick={onGoEconomics}>
              Open the Hyperion JV on Economics
            </button>
          )}
        </p>
      </section>

      {/* 2. Waterfall */}
      <section className="card card--full fin-section" aria-label="Debt service waterfall">
        <h2 className="card__title">Debt service to revenue</h2>
        <p className="card__sub">
          Tunguz fn6, with arithmetic checked. Every step names its assumption.
        </p>
        <p className="fin-copy">
          If $4T of project debt must be serviced at 6.5% to 7.5%, the interest bill is $260B to
          $300B a year. A 3× investment-grade coverage ratio lifts that to about $800B to $900B of
          operating profit. At 60% to 70% gross margin, the implied AI revenue is $1.2T to $1.5T.
          That is a teaching waterfall, not a rating-agency model.
        </p>

        <div className="dc-table-wrap fin-table">
          <div className="dc-row fin-wf-row fin-wf-row--head" role="row">
            <span className="dc-th" style={{ cursor: "default" }}>Step</span>
            <span className="dc-th dc-num" style={{ cursor: "default" }}>Figure</span>
            <span className="dc-th" style={{ cursor: "default" }}>Assumption / check</span>
            <span className="dc-th" style={{ cursor: "default" }}>Source</span>
          </div>
          <ul className="dc-table" role="list">
            {steps.map((s, i) => (
              <li key={s.id} className="dc-li">
                <div className="dc-row fin-wf-row">
                  <span className="dc-cell-main">
                    <span className="fin-stepn">{i + 1}</span>
                    <span className="dc-fac">{s.title}</span>
                  </span>
                  <span className="dc-num">
                    <span className="fin-fig">{s.display}</span> <Conf m={s.row} />
                  </span>
                  <span className="fin-cell-note">{s.assumption}</span>
                  <SourceLink m={s.row} />
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="fin-run">
          <div>
            <h3 className="sources-h">Today versus the implied 2030 run-rate</h3>
            <p className="fin-copy">
              Tunguz puts today's annualized AI revenue, across clouds and labs, at{" "}
              <Cite m={runToday} />. Reaching the midpoint of the implied band (~$1.35T) from the
              midpoint of that run-rate (~$150B) in five years is <Cite m={cagr} /> CAGR. We
              recompute 9<sup>0.2</sup> − 1 ≈ 55.2%. His companion cloud-growth print is{" "}
              <Cite m={cloudGrowth} />. Cloud growth is not AI-revenue growth.
            </p>
          </div>
          <div>
            <h3 className="sources-h">Gartner context (primary)</h3>
            <p className="fin-copy">
              Worldwide software spending is <Cite m={gartnerSw} />. Worldwide IT is{" "}
              <Cite m={gartnerIt} />. Tunguz writes that IT compounds toward <Cite m={gartner9} />.
              We could not find a free Gartner table that prints $9T for 2030, so that rung stays a
              claim. The point of the comparison: $1.2T to $1.5T of AI revenue would rival the entire
              2026 software category.
            </p>
          </div>
        </div>
      </section>

      {/* 3. Credit market context */}
      <section className="card card--full fin-section" aria-label="Credit market context">
        <h2 className="card__title">Credit market context</h2>
        <p className="card__sub">
          Tunguz compares $4T of AI debt to the world's primary credit stocks. Bars are US dollars.
          GW and TWh never appear here.
        </p>

        <aside className="fin-caveat" role="note">
          <strong>Systems caveat.</strong> {flowStock.notes} Commercial paper is short-term working
          capital, typically under 270 days. Putting it on the same chart as 20-year project debt is
          a size metaphor, not a substitution.
        </aside>

        <div className="fin-creditbars" aria-label="Credit stocks versus claimed AI debt">
          {credit.map((r) => {
            const max = Math.max(1, ...credit.map((x) => x.stock.value ?? 0));
            const pct = Math.max(2, ((r.stock.value ?? 0) / max) * 100);
            const claim = r.id === "ai-debt";
            return (
              <div className="fin-creditbars__row" key={r.id}>
                <span className="fin-creditbars__name">{r.market}</span>
                <span className="fin-creditbars__track">
                  <span
                    className="fin-creditbars__fill"
                    style={{
                      width: `${pct}%`,
                      background: claim ? "var(--signal)" : "#7fc4ec",
                    }}
                  />
                </span>
                <span className="fin-creditbars__val">
                  {r.stock.value != null ? formatUSDLarge(r.stock.value) : r.stock.display}
                </span>
              </div>
            );
          })}
        </div>

        <div className="dc-table-wrap fin-table" style={{ marginTop: 16 }}>
          <div className="dc-row fin-mkt-row fin-mkt-row--head" role="row">
            <span className="dc-th" style={{ cursor: "default" }}>Market</span>
            <span className="dc-th dc-num" style={{ cursor: "default" }}>Outstanding / claim</span>
            <span className="dc-th" style={{ cursor: "default" }}>As of</span>
            <span className="dc-th" style={{ cursor: "default" }}>$4T versus</span>
            <span className="dc-th" style={{ cursor: "default" }}>Confidence</span>
          </div>
          <ul className="dc-table" role="list">
            {credit.map((r) => (
              <li key={r.id} className="dc-li">
                <div className="dc-row fin-mkt-row">
                  <span className="dc-cell-main">
                    <span className="dc-fac">{r.market}</span>
                    <span className="dc-op">{r.note}</span>
                  </span>
                  <span className="dc-num dc-mw">{r.stock.display}</span>
                  <span className="dc-mw">{r.stock.asOf}</span>
                  <span className="fin-cell-note">{r.versus}</span>
                  <span><Conf m={r.stock} /></span>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <p className="card__foot">
          $4T / $11.7T = 34.2%, which matches Tunguz's "34% expansion" once the SIFMA 1Q26 corporate
          stock is the denominator. The percentage is arithmetic on a claimed numerator.
        </p>
      </section>

      {/* 4. Municipal channel */}
      <section className="card card--full fin-section" aria-label="Public and municipal channel">
        <h2 className="card__title">Public and municipal channel</h2>
        <p className="card__sub">
          Munis already finance American roads, water, airports, and many power plants. They are not
          a blank check for a private AI campus.
        </p>
        <p className="fin-copy">
          The US municipal market is about <Cite m={muniFed} />. Tunguz asks whether towns chasing
          growth will use that market to fund some data-center infrastructure the way they have
          funded power plants. Possible, with limits.
        </p>
        <p className="fin-copy">
          Tax-exempt governmental bonds generally fail the private-use tests if more than{" "}
          <Cite m={privateUse} />. A privately owned hall of GPUs almost never qualifies. Public
          wires, substations, water, and roads owned by a government or public-power utility can
          still take tax-exempt debt when ownership and output tests hold. Realistic tools around
          the campus itself are <Cite m={muniTools} />.
        </p>
        <p className="fin-copy">
          HYPERGRID already tracks the tax-incentive fight on the Policy tab
          ({taxPolicies.length} tax-incentive records, including Georgia's sales-tax exemption).
          Abatements and PILOTs change the local cash flow even when they are not bond proceeds.
          {onGoPolicy && (
            <>
              {" "}
              <button type="button" className="fin-textbtn" onClick={onGoPolicy}>
                Open Policy
              </button>
            </>
          )}
        </p>
      </section>

      {/* 5. Bridge to commitments */}
      <section className="card card--full fin-section" aria-label="Bridge to Hypergrid commitments">
        <h2 className="card__title">Bridge to Hypergrid commitments</h2>
        <p className="card__sub">
          The atlas maps public announcements. Those electrical megawatts are not a capital-markets
          ledger, and they are not energized load.
        </p>

        <div className="fin-bridge-stats">
          <div className="fin-bridge-card">
            <span className="dc-stat__v">{bridge.count}</span>
            <span className="dc-stat__l">Sourced commitments</span>
            <p>Energy and data-center rows in <code>commitments.ts</code>.</p>
          </div>
          <div className="fin-bridge-card">
            <span className="dc-stat__v">{disclosedGW}<small> GW</small></span>
            <span className="dc-stat__l">Announcement capacity</span>
            <p>
              Sum of disclosed MW only ({bridge.disclosed} rows). {bridge.undisclosed} rows have no
              capacity. Headline program size, not nameplate and not energized.
            </p>
          </div>
          <div className="fin-bridge-card">
            <span className="dc-stat__v">{formatGW(bridge.energyMW)}<small> GW</small></span>
            <span className="dc-stat__l">Energy-supply announcements</span>
            <p>
              {bridge.energyCount} energy rows. Still announcements and PPAs, not a generation
              ledger. Forecast Lab models committed GW; it does not invent energized totals.
            </p>
          </div>
          <div className="fin-bridge-card">
            <span className="dc-stat__v">{formatGW(bridge.datacenterMW)}<small> GW</small></span>
            <span className="dc-stat__l">Data-center campus announcements</span>
            <p>
              {bridge.datacenterCount} campus rows. Separate from the {dcCount} facilities in the
              Data Centers directory, which is a curated subset and not an energized-MW census.
            </p>
          </div>
        </div>

        <div className="econ-grid" style={{ marginTop: 14 }}>
          <div>
            <h3 className="sources-h">Announcement GW by buyer</h3>
            <p className="card__sub" style={{ marginBottom: 12 }}>
              Electrical megawatts only. Not dollars, not TWh, not Bcf.
            </p>
            <div className="bench">
              {bridge.byBuyer.slice(0, 10).map((b) => (
                <div className="bench__row" key={b.buyer}>
                  <span className="bench__name">{b.buyer}</span>
                  <span className="bench__track">
                    <span
                      className="bench__fill"
                      style={{
                        width: `${(b.mw / maxBuyerMW) * 100}%`,
                        background: buyerAccent(b.buyer),
                      }}
                    />
                  </span>
                  <span className="bench__val">{formatGW(b.mw)} GW</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="sources-h">By firmness (status)</h3>
            <p className="card__sub" style={{ marginBottom: 12 }}>
              Operational is still an announcement-era capacity figure unless the source said otherwise.
            </p>
            <div className="bench">
              {bridge.byStatus.map((s) => (
                <div className="bench__row" key={s.status}>
                  <span className="bench__name">{STATUS[s.status].label}</span>
                  <span className="bench__track">
                    <span className="bench__fill" style={{ width: `${(s.mw / Math.max(1, bridge.mw)) * 100}%` }} />
                  </span>
                  <span className="bench__val">{s.count} · {formatGW(s.mw)} GW</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <p className="card__foot">
          Unit hygiene: these cards stay in counts and electrical GW. The dollar charts above never
          share an axis with them. Converting GW to TWh needs a capacity factor; converting to Bcf
          of gas needs a heat rate. This page does not invent those factors.
        </p>
      </section>

      {/* 6. Sources */}
      <section className="fin-section" aria-label="Finance sources">
        <h2 className="sources-h">Sources on this page</h2>
        <ul className="source-list">
          {sources.map((s) => (
            <li key={s.name} className="source-row">
              <a className="source-row__link" href={s.url} target="_blank" rel="noopener noreferrer">
                {s.name}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M7 17 17 7M9 7h8v8" />
                </svg>
              </a>
              <span className="source-row__meta">
                {s.count} metric{s.count === 1 ? "" : "s"}
                {s.primary > 0 && <span className="source-row__hi">{s.primary} primary</span>}
              </span>
            </li>
          ))}
        </ul>
        <p className="card__foot" style={{ marginTop: 16 }}>
          Essay:{" "}
          <a href={envelope.sourceUrl} target="_blank" rel="noopener noreferrer">
            Tunguz, Concrete, Silicon, and Leverage
          </a>
          . Thread:{" "}
          <a href={thread.sourceUrl} target="_blank" rel="noopener noreferrer">
            {thread.sourceName}
          </a>
          . About / Sources lists the commitment-level primary sources.
        </p>
      </section>
    </div>
  );
}

function Stat({
  v,
  l,
  c,
  note,
}: {
  v: string;
  l: string;
  c?: FinanceMetric;
  note?: string;
}) {
  return (
    <div className="dc-stat">
      <span className="dc-stat__v">{v}</span>
      <span className="dc-stat__l">{l}</span>
      {c ? <Conf m={c} /> : note ? <span className="fin-stat-note">{note}</span> : null}
    </div>
  );
}

function Conf({ m }: { m: FinanceMetric }) {
  return (
    <span className="fin-badge" data-c={m.confidence} title={`${m.sourceName} · as of ${m.asOf}`}>
      {FINANCE_CONFIDENCE[m.confidence].label}
    </span>
  );
}

function Cite({ m }: { m: FinanceMetric }) {
  return (
    <a className="fin-cite" href={m.sourceUrl} target="_blank" rel="noopener noreferrer">
      {m.display}
      <span className="fin-cite__meta">
        {" "}
        · {m.sourceName} · {m.asOf} · {FINANCE_CONFIDENCE[m.confidence].label}
      </span>
    </a>
  );
}

function SourceLink({ m }: { m: FinanceMetric }) {
  return (
    <a className="fin-srclink" href={m.sourceUrl} target="_blank" rel="noopener noreferrer">
      {m.sourceName} · {m.asOf}
    </a>
  );
}

