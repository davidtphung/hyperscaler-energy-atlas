import { useMemo } from "react";
import { COMMITMENTS } from "../data/commitments";
import { POLICY } from "../data/policy";
import type { FinanceMetric } from "../types";
import {
  FINANCE_CONFIDENCE,
  FINANCE_STAMP,
  UNIT_KEY,
  commitmentBridge,
  creditCompareRows,
  financeSources,
  moneyUnitLabel,
  requireMetric,
  stackScenarios,
  waterfallSteps,
} from "../lib/finance";
import { formatUSDLarge } from "../lib/format";

interface Props {
  onGoPolicy?: () => void;
  onGoEconomics?: () => void;
  onGoForecast?: () => void;
}

export default function FinanceView({ onGoPolicy, onGoEconomics, onGoForecast }: Props) {
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

  return (
    <div className="page page--finance">
      <header className="page__head">
        <p className="overview__eyebrow">Finance</p>
        <h1 className="page__title">Capital for the AI buildout</h1>
        <p className="page__lead">
          Credit only: cash, equity, debt, bonds, and munis. This pane does not mix announcement GW,
          contracted IT MW, energized MW, OEM slots, or physical COD. Every money figure is stamped
          Cited or Sample and wears primary / claim confidence.
        </p>
      </header>

      <aside className="fin-disclaimer" role="note">
        <strong>Credit is not COD.</strong> A cleared bond, loan, or SPV is a paper event. It does
        not mean steel is up, IT load is contracted, or megawatts are metered. Educational scale,
        not investment advice.
      </aside>

      <section className="card card--full fin-section" aria-label="Unit key">
        <h2 className="card__title">Unit key (Energy GUY gate)</h2>
        <p className="card__sub">
          These families are never plotted on one axis. Physics falsifiers live on Analysis /
          Forecast Lab, not here.
        </p>
        <div className="dc-table-wrap fin-table">
          <div className="dc-row fin-unit-row fin-unit-row--head" role="row">
            <span className="dc-th" style={{ cursor: "default" }}>Unit family</span>
            <span className="dc-th" style={{ cursor: "default" }}>On this pane</span>
            <span className="dc-th" style={{ cursor: "default" }}>Where it belongs</span>
          </div>
          <ul className="dc-table" role="list">
            {UNIT_KEY.map((u) => (
              <li key={u.unit} className="dc-li">
                <div className="dc-row fin-unit-row">
                  <span className="dc-fac">{u.unit}</span>
                  <span>
                    <span className="fin-badge" data-on={u.onPane}>
                      {u.onPane === "yes" ? "On pane" : "Excluded"}
                    </span>
                  </span>
                  <span className="fin-cell-note">{u.where}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
        {onGoForecast && (
          <p className="card__foot">
            Short cross-link only:{" "}
            <button type="button" className="fin-textbtn" onClick={onGoForecast}>
              Open Forecast Lab on Analysis
            </button>
            . That tab models committed announcement GW. It does not invent energized or metered MW.
          </p>
        )}
      </section>

      <div className="fin-legend" aria-label="Money stamps and confidence">
        {(Object.keys(FINANCE_STAMP) as Array<keyof typeof FINANCE_STAMP>).map((k) => (
          <span key={k} className="fin-legend__item">
            <span className="fin-badge" data-stamp={k}>
              {FINANCE_STAMP[k].label}
            </span>
            <span className="fin-legend__blurb">{FINANCE_STAMP[k].blurb}</span>
          </span>
        ))}
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
        <Stat v={envelope.display} l="Capex envelope, USD credit" c={envelope} />
        <Stat v={debt35.display} l="Sample debt at 70%, USD" c={debt35} />
        <Stat v={debt4.display} l="Cited headline debt, USD" c={debt4} />
        <Stat v={revenue.display} l="Sample implied AI revenue, USD" c={revenue} />
        <Stat v={runToday.display} l="Cited AI run-rate band, USD" c={runToday} />
        <Stat v={String(bridge.count)} l="Atlas records (count only)" note="Not GW. Not COD." />
      </div>

      <section className="card card--full fin-section" aria-label="Capital stack">
        <h2 className="card__title">Capital stack</h2>
        <p className="card__sub">USD credit only. Equity versus debt on a cited envelope. Not physical capacity.</p>
        <p className="fin-copy">
          Tunguz, citing J.P. Morgan Asset Management, Western Asset, and PIMCO, puts a global
          capex envelope near <Cite m={envelope} />. Data-center buildings are usually levered.
          Tunguz cites facility leverage of <Cite m={tunguzLev} /> (Columbia / CREFC), versus about{" "}
          <Cite m={corpLev} /> on a typical corporate balance sheet. Columbia's opened paper writes{" "}
          <Cite m={columbiaLev} /> on the physical facility and power, because sponsor equity often
          buys IT kit while project debt buys the building. None of those percents are megawatts.
        </p>
        <p className="fin-copy">
          Synthetic JV SPVs can go further. The Meta / Blue Owl Hyperion vehicle (Beignet) issued{" "}
          <Cite m={beignet} />. That is a credit structure. It is not Hyperion commercial operation.
          The JV also lives on the Economics tab as a development deal.
        </p>

        <div className="dc-table-wrap fin-table">
          <div className="dc-row fin-stack-row fin-stack-row--head" role="row">
            <span className="dc-th" style={{ cursor: "default" }}>Scenario</span>
            <span className="dc-th" style={{ cursor: "default" }}>Leverage</span>
            <span className="dc-th dc-num" style={{ cursor: "default" }}>Debt (USD)</span>
            <span className="dc-th dc-num" style={{ cursor: "default" }}>Equity (USD)</span>
            <span className="dc-th" style={{ cursor: "default" }}>Stamp</span>
          </div>
          <ul className="dc-table" role="list">
            {stacks.map((s) => (
              <li key={s.id} className="dc-li">
                <div className="dc-row fin-stack-row">
                  <span className="dc-cell-main">
                    <span className="dc-fac">{s.label}</span>
                    <span className="dc-op">{s.note}</span>
                  </span>
                  <span className="dc-mw">{s.leveragePct}</span>
                  <span className="dc-num dc-mw">{s.debt.display}</span>
                  <span className="dc-num dc-mw">{s.equity.display}</span>
                  <span className="fin-stamps">
                    <MoneyMarks m={s.debt} />
                  </span>
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
                  <span className="fin-stackvis__unit"> USD credit</span>
                </div>
                <div className="fin-stackvis__bar">
                  <span className="fin-stackvis__debt" style={{ width: `${(debt / total) * 100}%` }} />
                  <span className="fin-stackvis__eq" style={{ width: `${(equity / total) * 100}%` }} />
                </div>
              </div>
            );
          })}
          <div className="fin-stackvis__key">
            <span><i className="fin-swatch" style={{ background: "var(--signal)" }} /> Debt (USD)</span>
            <span><i className="fin-swatch" style={{ background: "#7fc4ec" }} /> Equity / cash (USD)</span>
          </div>
        </div>

        <div className="fin-callout">
          <h3 className="fin-callout__h">Why $3.5T and $4T both appear</h3>
          <p>
            $3.5T is a Sample: 70% of the Cited $5T envelope. $4T is Tunguz's Cited headline (80% of
            the same envelope). The $0.5T gap is a higher leverage assumption, not a second
            independent forecast, and not a COD schedule.
          </p>
        </div>

        <p className="fin-copy">
          Columbia publishes a separate US dollar envelope of <Cite m={columbiaEnv} /> that includes
          IT kit. It is not added to the $5T global claim. The paper's capacity scaling is a physics
          input and is not shown on this pane.
        </p>
        <p className="card__foot">
          Morgan Stanley, as restated by Columbia, sees an all-in mix near <Cite m={msSplit} />{" "}
          because IT kit is mostly equity-funded. Facility debt can still sit at 70% to 90% on the
          building. That is capital structure, not energized load.{" "}
          {onGoEconomics && (
            <button type="button" className="fin-textbtn" onClick={onGoEconomics}>
              Open the Hyperion JV on Economics
            </button>
          )}
        </p>
      </section>

      <section className="card card--full fin-section" aria-label="Debt service waterfall">
        <h2 className="card__title">Debt service to revenue</h2>
        <p className="card__sub">
          USD P&amp;L sample on a Cited $4T debt claim. Tunguz fn6, arithmetic checked. Not a
          generation or COD model.
        </p>
        <p className="fin-copy">
          If $4T of project debt must be serviced at 6.5% to 7.5%, the interest bill is $260B to
          $300B a year. A 3× coverage ratio lifts that to about $800B to $900B of operating profit.
          At 60% to 70% gross margin, implied AI revenue is $1.2T to $1.5T. Teaching waterfall only.
        </p>

        <div className="dc-table-wrap fin-table">
          <div className="dc-row fin-wf-row fin-wf-row--head" role="row">
            <span className="dc-th" style={{ cursor: "default" }}>Step</span>
            <span className="dc-th dc-num" style={{ cursor: "default" }}>Figure</span>
            <span className="dc-th" style={{ cursor: "default" }}>Unit</span>
            <span className="dc-th" style={{ cursor: "default" }}>Stamp</span>
          </div>
          <ul className="dc-table" role="list">
            {steps.map((s, i) => (
              <li key={s.id} className="dc-li">
                <div className="dc-row fin-wf-row">
                  <span className="dc-cell-main">
                    <span className="fin-stepn">{i + 1}</span>
                    <span className="dc-fac">{s.title}</span>
                    <span className="dc-op">{s.assumption}</span>
                  </span>
                  <span className="dc-num">
                    <span className="fin-fig">{s.display}</span>
                  </span>
                  <span className="fin-cell-note">{moneyUnitLabel(s.row)}</span>
                  <span className="fin-stamps">
                    <MoneyMarks m={s.row} />
                    <SourceLink m={s.row} />
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="fin-run">
          <div>
            <h3 className="sources-h">Today versus the implied run-rate (USD)</h3>
            <p className="fin-copy">
              Tunguz puts today's annualized AI revenue at <Cite m={runToday} />. Reaching the
              midpoint of the implied band (~$1.35T) from ~$150B in five years is{" "}
              <Cite m={cagr} /> CAGR (9<sup>0.2</sup> − 1 ≈ 55.2%). Companion cloud growth:{" "}
              <Cite m={cloudGrowth} />. Cloud growth is not AI-revenue growth and not load growth.
            </p>
          </div>
          <div>
            <h3 className="sources-h">Gartner context (USD, cited primary)</h3>
            <p className="fin-copy">
              Worldwide software spending is <Cite m={gartnerSw} />. Worldwide IT is{" "}
              <Cite m={gartnerIt} />. Tunguz writes that IT compounds toward <Cite m={gartner9} />.
              No free Gartner table prints $9T for 2030, so that rung stays a claim. Scale context
              only: not a data-center MW forecast.
            </p>
          </div>
        </div>
      </section>

      <section className="card card--full fin-section" aria-label="Credit market context">
        <h2 className="card__title">Credit market context</h2>
        <p className="card__sub">
          USD outstanding stocks versus a Cited multi-year AI debt flow. No GW, TWh, or Bcf on
          this chart.
        </p>

        <aside className="fin-caveat" role="note">
          <strong>Systems caveat.</strong> {flowStock.notes} Commercial paper is short-term working
          capital, typically under 270 days. Size metaphor only.
        </aside>

        <div className="fin-creditbars" aria-label="Credit stocks versus claimed AI debt, USD">
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
                  <small> USD</small>
                </span>
              </div>
            );
          })}
        </div>

        <div className="dc-table-wrap fin-table" style={{ marginTop: 16 }}>
          <div className="dc-row fin-mkt-row fin-mkt-row--head" role="row">
            <span className="dc-th" style={{ cursor: "default" }}>Market (USD)</span>
            <span className="dc-th dc-num" style={{ cursor: "default" }}>Outstanding / claim</span>
            <span className="dc-th" style={{ cursor: "default" }}>As of</span>
            <span className="dc-th" style={{ cursor: "default" }}>$4T versus</span>
            <span className="dc-th" style={{ cursor: "default" }}>Stamp</span>
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
                  <span className="fin-stamps"><MoneyMarks m={r.stock} /></span>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <p className="card__foot">
          $4T / $11.7T = 34.2% on the SIFMA 1Q26 corporate stock. Arithmetic on a Cited claim
          numerator over a Cited primary denominator. Not a crowding forecast and not COD.
        </p>
      </section>

      <section className="card card--full fin-section" aria-label="Public and municipal channel">
        <h2 className="card__title">Public and municipal channel</h2>
        <p className="card__sub">USD municipal market and tax rules. Not a campus MW tally.</p>
        <p className="fin-copy">
          The US municipal market is about <Cite m={muniFed} />. Tunguz asks whether towns chasing
          growth will use that market for some data-center infrastructure, as they have for power
          plants. Possible, with limits. A tax-exempt issue is still credit, not energized load.
        </p>
        <p className="fin-copy">
          Tax-exempt governmental bonds generally fail the private-use tests if more than{" "}
          <Cite m={privateUse} />. A privately owned hall of GPUs almost never qualifies. Public
          wires, water, and roads owned by a government or public-power utility can still take
          tax-exempt debt when ownership and output tests hold. Realistic tools around the campus
          itself are <Cite m={muniTools} />.
        </p>
        <p className="fin-copy">
          HYPERGRID tracks the tax-incentive fight on the Policy tab ({taxPolicies.length}{" "}
          tax-incentive records). Abatements and PILOTs change local cash flow even when they are
          not bond proceeds.
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

      <section className="card card--full fin-section" aria-label="Atlas cross-link">
        <h2 className="card__title">Atlas cross-link</h2>
        <p className="card__sub">
          Record counts only. No announcement GW, contracted IT MW, energized MW, OEM slots, or COD
          on this pane.
        </p>
        <div className="fin-bridge-stats">
          <div className="fin-bridge-card">
            <span className="dc-stat__v">{bridge.count}</span>
            <span className="dc-stat__l">Sourced commitment records</span>
            <p>Count of rows in <code>commitments.ts</code>. Not a capacity total.</p>
          </div>
          <div className="fin-bridge-card">
            <span className="dc-stat__v">{bridge.energyCount}</span>
            <span className="dc-stat__l">Energy-category records</span>
            <p>Count only. Announcement GW for those rows lives on Atlas / Forecast Lab.</p>
          </div>
          <div className="fin-bridge-card">
            <span className="dc-stat__v">{bridge.datacenterCount}</span>
            <span className="dc-stat__l">Data-center-category records</span>
            <p>Count only. Campus announcement GW is not summed here.</p>
          </div>
        </div>
        <p className="card__foot">
          Physics falsifiers (interconnection, capacity factor, heat rate, energized vs announced)
          stay off this pane.
          {onGoForecast && (
            <>
              {" "}
              <button type="button" className="fin-textbtn" onClick={onGoForecast}>
                Open Forecast Lab
              </button>
            </>
          )}
        </p>
      </section>

      <section className="fin-section" aria-label="Finance sources">
        <h2 className="sources-h">Sources on this page</h2>
        <ul className="source-list">
          {sources.map((s) => (
            <li key={s.url} className="source-row">
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
          . About / Sources lists commitment-level primary sources.
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
      {c ? <MoneyMarks m={c} /> : note ? <span className="fin-stat-note">{note}</span> : null}
    </div>
  );
}

function MoneyMarks({ m }: { m: FinanceMetric }) {
  return (
    <span className="fin-stamps">
      <span className="fin-badge" data-stamp={m.stamp} title={FINANCE_STAMP[m.stamp].blurb}>
        {FINANCE_STAMP[m.stamp].label}
      </span>
      <span className="fin-badge" data-c={m.confidence} title={`${m.sourceName} · as of ${m.asOf}`}>
        {FINANCE_CONFIDENCE[m.confidence].label}
      </span>
    </span>
  );
}

function Cite({ m }: { m: FinanceMetric }) {
  const title = `${moneyUnitLabel(m)} · ${FINANCE_STAMP[m.stamp].label} · ${m.sourceName} · ${m.asOf} · ${FINANCE_CONFIDENCE[m.confidence].label}`;
  return (
    <a className="fin-cite" href={m.sourceUrl} target="_blank" rel="noopener noreferrer" title={title}>
      {m.display}
      <MoneyMarks m={m} />
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
