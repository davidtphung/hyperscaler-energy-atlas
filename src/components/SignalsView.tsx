import { useEffect } from "react";
import { useReducedMotion } from "../lib/hooks";
import { formatFullDate, formatMonthYear } from "../lib/format";
import { SOURCES } from "../lib/signalSearch";
import {
  DC_SA,
  FORMULAS,
  GEN_SA,
  SIGNALS,
  basisLine,
  changeSince,
  chartRows,
  claimChecks,
  formatBillions,
  formatMillions,
  formatPercent,
  formatSignedBillions,
  latestPoint,
  seriesById,
  yearOverYear,
} from "../lib/signals";

interface Props {
  anchor: string | null;
}

export default function SignalsView({ anchor }: Props) {
  const reducedMotion = useReducedMotion();
  const dataCenter = seriesById(DC_SA);
  const general = seriesById(GEN_SA);
  const end = latestPoint(dataCenter);
  const genEnd = latestPoint(general);
  const yoy = yearOverYear(dataCenter, end.month);
  const since = changeSince(dataCenter, end.month, "2021-01");
  const gap = end.value - genEnd.value;
  const rows = chartRows();
  const claims = claimChecks();
  const dcBasis = basisLine(dataCenter, end);
  const genBasis = basisLine(general, genEnd);

  useEffect(() => {
    if (!anchor) return;
    const el = document.getElementById(anchor);
    if (!el) return;
    el.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
  }, [anchor, reducedMotion]);

  return (
    <div className="page page--signals">
      <header className="page__head">
        <p className="overview__eyebrow">Signals</p>
        <h1 className="page__title">Construction spending</h1>
        <p className="page__lead">
          Census dollars of construction put in place. They are not megawatts, they are not one of the five counted
          kinds, and they do not change counted IT load.
        </p>
        <p className="sig-note">
          <span className="sig-tag">FACT</span> Census defines data center as: "{SIGNALS.definitions.dataCenter}" General
          office is: "{SIGNALS.definitions.general}" The same definitions page lists "{SIGNALS.definitions.racksOrServers}"
          among items excluded from construction.
        </p>
        <p className="page__actions">
          <a className="sig-download" href="signals.json" download>
            Download signals JSON
          </a>
          <a className="sig-download sig-download--quiet" href={SIGNALS.links.release}>
            Census release
          </a>
          <a className="sig-download sig-download--quiet" href={SIGNALS.definitions.sourceUrl}>
            Definitions
          </a>
        </p>
      </header>

      <p className="sig-note">
        Data center is counted inside Census Office. The comparison here is against general office only.
      </p>
      <p className="sig-note">
        Nominal dollars mix cost inflation with real building. These figures are not volume, build rate or capacity.
      </p>

      <section className="sig-stats" aria-label="Latest Census readings">
        <Stat
          tag="MEASUREMENT"
          evidence="FACT"
          label="Private data center"
          value={formatBillions(end.value)}
          basis={dcBasis}
          formula={`${formatMillions(end.value)} million dollars, read from the stored series. No formula.`}
        />
        <Stat
          tag="MEASUREMENT"
          evidence="FACT"
          label="Private general office"
          value={formatBillions(genEnd.value)}
          basis={genBasis}
          formula={`${formatMillions(genEnd.value)} million dollars, read from the stored series. General office is a subcategory of Census Office, not the Census Office total.`}
        />
        {yoy && (
          <Stat
            tag="CALCULATED"
            evidence="FACT"
            label="Data center year over year"
            value={formatPercent(yoy.ratio)}
            basis={dcBasis}
            formula={`(${formatMillions(yoy.latest.value)} minus ${formatMillions(yoy.prior.value)}) / ${formatMillions(yoy.prior.value)} = ${formatPercent(yoy.ratio)}. ${FORMULAS.yoy}.`}
          />
        )}
        <Stat
          tag="CALCULATED"
          evidence="FACT"
          label="Data center minus general office"
          value={formatBillions(gap)}
          basis={`${dcBasis} Compared with ${genBasis}`}
          formula={`${formatMillions(end.value)} minus ${formatMillions(genEnd.value)} = ${formatBillions(gap)}. ${FORMULAS.gap}`}
        />
        {since && (
          <Stat
            tag="CALCULATED"
            evidence="FACT"
            label="Change since Jan 2021"
            value={formatSignedBillions(since.change)}
            basis={dcBasis}
            formula={`${formatMillions(since.latest.value)} minus ${formatMillions(since.prior.value)} = ${formatSignedBillions(since.change)}. ${FORMULAS.since}.`}
          />
        )}
        {since && (
          <Stat
            tag="CALCULATED"
            evidence="FACT"
            label="Percent since Jan 2021"
            value={formatPercent(since.ratio)}
            basis={dcBasis}
            formula={`(${formatMillions(since.latest.value)} minus ${formatMillions(since.prior.value)}) / ${formatMillions(since.prior.value)} = ${formatPercent(since.ratio)}. ${FORMULAS.sincePct}.`}
          />
        )}
      </section>

      <section id="signal-chart" className="sig-block">
        <h2>Data center and general office</h2>
        <p className="sig-copy">
          Private construction, seasonally adjusted annual rate, nominal dollars, January 2021 through{" "}
          {formatMonthYear(end.month)}. General office is not the Census Office total. The two lines are different categories.
        </p>
        <SpendingChart rows={rows} />
        <details className="sig-fold">
          <summary>Monthly values behind the chart</summary>
          <div className="sig-table-wrap">
            <table className="sig-table">
              <caption>Stored millions of dollars, seasonally adjusted annual rate, nominal, {SIGNALS.vintage}.</caption>
              <thead>
                <tr>
                  <th scope="col">Month</th>
                  <th scope="col">Data center</th>
                  <th scope="col">General office</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.month}>
                    <th scope="row">{formatMonthYear(row.month)}</th>
                    <td>{formatMillions(row.dataCenter)}</td>
                    <td>{formatMillions(row.general)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </section>

      <section id="signal-claims" className="sig-block">
        <h2>Third party claim vs Census</h2>
        <p className="sig-copy">
          <span className="sig-tag">THIRD-PARTY CLAIM</span> The Kobeissi Letter post of 3 Oct 2026 (
          <a href="https://x.com/KobeissiLetter/status/2106454781816340774">status 2106454781816340774</a>
          ). Each number below is computed from the stored Census series. A whole billion or a whole percent matches
          when the Census value rounds to that claim. Anything else is marked not reproduced.
        </p>
        <div className="sig-table-wrap">
          <table className="sig-table">
            <caption>Claim compared with Census. Levels are MEASUREMENT. Changes and the gap are CALCULATED.</caption>
            <thead>
              <tr>
                <th scope="col">Claim</th>
                <th scope="col">Census value</th>
                <th scope="col">Result</th>
              </tr>
            </thead>
            <tbody>
              {claims.map((row) => (
                <tr key={row.id}>
                  <th scope="row">{row.claim}</th>
                  <td>
                    <span className="sig-tag">{row.id === "dc-aug-level" || row.id === "gen-level" ? "MEASUREMENT" : "CALCULATED"}</span>
                    <span className="sig-census">{row.census}</span>
                    <details className="sig-fold">
                      <summary>Formula and basis</summary>
                      <p>{row.formula}</p>
                      <p>{row.basis}</p>
                    </details>
                  </td>
                  <td>{row.matched ? "Matches within rounding" : "not reproduced"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="sig-block" aria-labelledby="signal-series-heading">
        <h2 id="signal-series-heading">Every stored Census series</h2>
        <p className="sig-copy">
          Retrieved {formatFullDate(SIGNALS.retrieved)}. Release {formatFullDate(SIGNALS.releaseDate)}. {SIGNALS.series[0]?.priceNote}{" "}
          {SIGNALS.series[0]?.vintageNote}
        </p>
        <div className="sig-table-wrap">
          <table className="sig-table">
            <thead>
              <tr>
                <th scope="col">Series</th>
                <th scope="col">Latest</th>
                <th scope="col">Basis</th>
              </tr>
            </thead>
            <tbody>
              {SIGNALS.series.map((series) => {
                const point = latestPoint(series);
                return (
                  <tr key={series.id}>
                    <th scope="row">
                      {series.label}
                      <span className="sig-id">{series.fredId ? `${series.id}, FRED page opened` : series.id}</span>
                    </th>
                    <td>
                      <span className="sig-tag">MEASUREMENT</span>
                      <span className="sig-tag">FACT</span>
                      <span className="sig-census">{formatBillions(point.value)}</span>
                      <span className="sig-raw">{formatMillions(point.value)} million dollars</span>
                    </td>
                    <td>{basisLine(series, point)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="sig-copy">
          FRED search for a Census data center construction series was opened on {formatFullDate(SIGNALS.fred.dataCenterSearch.openedOn)}.{" "}
          {SIGNALS.fred.dataCenterSearch.result} PROFCONS and TLOFCON were opened and their August 2026 CSV values match these Census columns.
        </p>
      </section>

      <section id="signal-sources" className="sig-block">
        <h2>Source registry</h2>
        <p className="sig-copy">Public series the atlas tracks. Search finds these cards in their own group, not as map rows.</p>
        <div className="sig-sources">
          {SOURCES.map((source) => (
            <article key={source.id} id={source.id} className="sig-source">
              <h3>{source.name}</h3>
              <p>
                <span className="sig-tag">{source.evidence}</span>
              </p>
              <dl>
                <div>
                  <dt>Publisher</dt>
                  <dd>{source.publisher}</dd>
                </div>
                <div>
                  <dt>Cadence</dt>
                  <dd>{source.cadence}</dd>
                </div>
                <div>
                  <dt>Unit</dt>
                  <dd>{source.unit}</dd>
                </div>
                <div>
                  <dt>Measures</dt>
                  <dd>{source.measures}</dd>
                </div>
                <div>
                  <dt>Fit with counting rules</dt>
                  <dd>{source.fit}</dd>
                </div>
                <div>
                  <dt>Last checked</dt>
                  <dd>{source.lastChecked ? formatFullDate(source.lastChecked) : "not recorded"}</dd>
                </div>
              </dl>
              <a href={source.url}>{source.url.replace(/^https:\/\//, "")}</a>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({
  tag,
  evidence,
  label,
  value,
  basis,
  formula,
}: {
  tag: string;
  evidence: string;
  label: string;
  value: string;
  basis: string;
  formula: string;
}) {
  return (
    <article className="sig-stat">
      <p className="sig-stat__tags">
        <span className="sig-tag">{tag}</span>
        <span className="sig-tag">{evidence}</span>
      </p>
      <h2>{label}</h2>
      <p className="sig-stat__value">{value}</p>
      <p className="sig-stat__basis">{basis}</p>
      <details className="sig-fold">
        <summary title={formula}>Formula</summary>
        <p>{formula}</p>
      </details>
    </article>
  );
}

function SpendingChart({ rows }: { rows: { month: string; dataCenter: number; general: number }[] }) {
  const width = 640;
  const height = 280;
  const pad = { l: 52, r: 16, t: 16, b: 32 };
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;
  const max = Math.max(...rows.flatMap((row) => [row.dataCenter, row.general]), 1);
  const yMax = Math.ceil(max / 10000) * 10000;
  const xOf = (index: number) => pad.l + (rows.length <= 1 ? innerW / 2 : (index / (rows.length - 1)) * innerW);
  const yOf = (value: number) => pad.t + innerH - (value / yMax) * innerH;
  const path = (key: "dataCenter" | "general") =>
    rows.map((row, index) => `${index === 0 ? "M" : "L"}${xOf(index).toFixed(1)} ${yOf(row[key]).toFixed(1)}`).join(" ");
  const ticks = [0, yMax / 2, yMax];
  const yearTicks = rows.filter((row) => row.month.endsWith("-01"));

  return (
    <figure className="sig-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Line chart of private data center and private general office construction spending, seasonally adjusted annual rate, nominal dollars, from January 2021 to the latest month.">
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={pad.l} x2={width - pad.r} y1={yOf(tick)} y2={yOf(tick)} className="sig-chart__grid" />
            <text x={pad.l - 8} y={yOf(tick) + 4} className="sig-chart__axis" textAnchor="end">
              {formatBillions(tick)}
            </text>
          </g>
        ))}
        <path d={path("general")} className="sig-chart__general" fill="none" />
        <path d={path("dataCenter")} className="sig-chart__dc" fill="none" />
        {yearTicks.map((row) => {
          const index = rows.indexOf(row);
          return (
            <text key={row.month} x={xOf(index)} y={height - 8} className="sig-chart__axis" textAnchor="middle">
              {row.month.slice(0, 4)}
            </text>
          );
        })}
      </svg>
      <figcaption className="sig-legend">
        <span><i className="sig-swatch sig-swatch--dc" /> Private data center</span>
        <span><i className="sig-swatch sig-swatch--gen" /> Private general office</span>
        <span>Billions of nominal dollars, seasonally adjusted annual rate</span>
      </figcaption>
    </figure>
  );
}
