import { useMemo, useState } from "react";
import { COMMITMENTS } from "../data/commitments";
import {
  BOTTLENECKS,
  BOTTLENECK_CHIPS,
  BOTTLENECK_SCALE_DAYS,
  CONFLICT_CALLOUT,
  ERCOT_FACT_SHEET_URL,
  ERCOT_QUEUE_NOTE,
  FAN_CASE_META,
  FORECAST_TWH,
  GEV_LABELED_SUM,
  GT_FAST_PATH_CALLOUT,
  INVENTORY_CALLOUT,
  INVENTORY_GAP,
  INVENTORY_PINS,
  PEAK_GW_CARDS,
  SOURCE_SERIES_COLOR,
  bottleneckToDays,
  fanAnchor,
  historyPoints,
  ieaUsBase2030,
  lastHistoryOrEstimate,
  pinFromBottleneck,
  pinFromBottleneckChip,
  pinFromInventory,
  pinFromPeak,
  pinFromTwh,
  scenarioPoints,
  type BottleneckChip,
  type BottleneckPin,
  type InventoryPin,
  type FanCase,
  type ForecastGeo,
  type ForecastTwhPoint,
  type InspectablePin,
} from "../data/forecast";
import { formatGW } from "../lib/format";
import { useElementSize } from "../lib/hooks";

const FAN_ORDER: FanCase[] = ["bear", "base", "bull"];

export default function ForecastLabView() {
  const [geo, setGeo] = useState<ForecastGeo>("US");
  const [fanCase, setFanCase] = useState<FanCase>("base");
  const [selected, setSelected] = useState<InspectablePin | null>(null);
  const { ref, width } = useElementSize<HTMLDivElement>();

  const atlas = useMemo(() => {
    const withMw = COMMITMENTS.filter((c) => c.capacityMW != null);
    const totalMW = withMw.reduce((a, c) => a + (c.capacityMW ?? 0), 0);
    const top = [...withMw].sort((a, b) => (b.capacityMW ?? 0) - (a.capacityMW ?? 0)).slice(0, 8);
    return { totalMW, n: COMMITMENTS.length, nWithMw: withMw.length, top };
  }, []);

  const model = useMemo(() => buildChartModel(geo, fanCase), [geo, fanCase]);

  const h = 340;
  const padL = 48;
  const padR = 16;
  const padT = 18;
  const padB = 30;
  const innerW = Math.max(1, width - padL - padR);
  const innerH = h - padT - padB;
  const x = (year: number) => padL + ((year - model.xMin) / (model.xMax - model.xMin)) * innerW;
  const y = (twh: number) => padT + innerH - (twh / model.yMax) * innerH;
  const line = (pts: ForecastTwhPoint[]) =>
    pts.map((p, i) => `${i ? "L" : "M"}${x(p.year)},${y(p.twh)}`).join(" ");

  const onSelectTwh = (p: ForecastTwhPoint) => setSelected(pinFromTwh(p));

  return (
    <div className="page page--flab">
      <header className="flab-head">
        <p className="overview__eyebrow">Forecast Lab</p>
        <h1 className="page__title">Bottlenecks first. Sourced electricity second.</h1>
        <p className="page__lead">
          Four layers, four axes. The schedule is the product. History is annual DC electricity in TWh, IEA and LBNL
          kept apart. The fan is sourced pins, not an 8 / 20 / 34 percent CAGR toy. Atlas announcement GW stays in the
          sidebar as Hypergrid commitments intent.
        </p>
      </header>

      <section className="flab-bn" aria-labelledby="flab-bn-title">
        <div className="flab-bn__head">
          <div>
            <h2 id="flab-bn-title" className="flab-h2">
              Bottleneck schedule
            </h2>
            <p className="flab-bn__lead">
              Main chart. Sourced lead-time strip. Original units stay on the label. Scale days are a display conversion,
              not a midpoint.
            </p>
          </div>
          <span className="flab-tag flab-tag--sourced">sourced · IEA / EPRI</span>
        </div>
        <p className="flab-bn-callout">{GT_FAST_PATH_CALLOUT}</p>
        <BottleneckStrip
          selectedId={selected?.id ?? null}
          onSelectPin={(b) => setSelected(pinFromBottleneck(b))}
          onSelectChip={(c) => setSelected(pinFromBottleneckChip(c))}
        />
      </section>

      <InventoryLayer selectedId={selected?.id ?? null} onSelect={(p) => setSelected(pinFromInventory(p))} />

      {geo === "US" && (
        <aside className="flab-conflict" role="note">
          <strong>{CONFLICT_CALLOUT.title}.</strong> {CONFLICT_CALLOUT.body}
        </aside>
      )}

      <div className="flab-layout">
        <div className="flab-main">
          <section className="flab-card" aria-labelledby="flab-hist-title">
            <div className="flab-card__head">
              <div>
                <h2 id="flab-hist-title" className="flab-h2">
                  History and sourced fan
                </h2>
                <p className="card__sub">
                  Annual DC electricity, TWh only. {geo === "US" ? "IEA and LBNL as separate series." : "IEA world series."}{" "}
                  No invented LBNL 2017 or 2019-2022 yearly rows. Fan cases map to IEA / LBNL pins.
                </p>
              </div>
              <div className="flab-toggles">
                <div className="chips" role="group" aria-label="Geography">
                  <button className="chip" aria-pressed={geo === "world"} onClick={() => setGeo("world")}>
                    World
                  </button>
                  <button className="chip" aria-pressed={geo === "US"} onClick={() => setGeo("US")}>
                    US
                  </button>
                </div>
                <div className="chips" role="group" aria-label="Fan case">
                  {FAN_ORDER.map((k) => (
                    <button key={k} className="chip" aria-pressed={fanCase === k} onClick={() => setFanCase(k)}>
                      <span className="chip__dot" style={{ background: FAN_CASE_META[k].color }} />
                      {FAN_CASE_META[k].label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="fc-chart flab-chart" ref={ref} style={{ height: h }}>
              {width > 0 && (
                <svg
                  width={width}
                  height={h}
                  role="img"
                  aria-label={`${geo} annual data-center electricity in TWh with sourced ${FAN_CASE_META[fanCase].label} fan`}
                >
                  {model.yTicks.map((v) => (
                    <g key={v}>
                      <line x1={padL} y1={y(v)} x2={width - padR} y2={y(v)} className="tl-tick" />
                      <text x={padL - 8} y={y(v) + 3} textAnchor="end" className="tl-tick-label">
                        {v}
                      </text>
                    </g>
                  ))}
                  {model.xTicks.map((yr) => (
                    <text key={yr} x={x(yr)} y={h - 8} textAnchor="middle" className="tl-tick-label">
                      {yr}
                    </text>
                  ))}
                  <text x={padL} y={12} className="tl-tick-label">
                    TWh
                  </text>

                  {model.fanBand && (
                    <path d={fanBandPath(model.fanBand, x, y)} fill="rgba(245,213,71,0.07)" stroke="none" />
                  )}

                  {model.histSeries.map((s) => (
                    <path
                      key={s.key}
                      d={line(s.pts)}
                      fill="none"
                      stroke={s.color}
                      strokeWidth={2.1}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                  ))}

                  {model.fanRays.map((r) => (
                    <path
                      key={r.key}
                      d={line(r.pts)}
                      fill="none"
                      stroke={r.color}
                      strokeWidth={r.active ? 2.4 : 1.2}
                      strokeDasharray="5 4"
                      opacity={r.active ? 1 : 0.35}
                    />
                  ))}

                  {model.allPins.map((p) => {
                    const active = selected?.id === p.id;
                    const r = p.status === "estimate" ? 5.2 : 4.4;
                    return (
                      <g key={p.id}>
                        <circle
                          cx={x(p.year)}
                          cy={y(p.twh)}
                          r={active ? r + 2.4 : r}
                          fill={p.status === "scenario" ? "var(--ink-800)" : SOURCE_SERIES_COLOR[p.source] ?? "#f1efe8"}
                          stroke={SOURCE_SERIES_COLOR[p.source] ?? "#f1efe8"}
                          strokeWidth={p.status === "scenario" ? 2 : 1.2}
                          className="flab-pin"
                          role="button"
                          tabIndex={0}
                          aria-label={`${p.twh} TWh ${p.geography} ${p.year} ${p.source} ${p.status}`}
                          onClick={() => onSelectTwh(p)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              onSelectTwh(p);
                            }
                          }}
                        />
                        {p.status === "estimate" && (
                          <circle
                            cx={x(p.year)}
                            cy={y(p.twh)}
                            r={1.6}
                            fill="var(--ink-900)"
                            pointerEvents="none"
                          />
                        )}
                      </g>
                    );
                  })}
                </svg>
              )}
            </div>

            <ul className="flab-legend">
              <li>
                <span className="flab-sw" style={{ background: SOURCE_SERIES_COLOR.IEA }} />
                IEA sourced
              </li>
              {geo === "US" && (
                <li>
                  <span className="flab-sw" style={{ background: SOURCE_SERIES_COLOR["LBNL-2024"] }} />
                  LBNL sourced
                </li>
              )}
              <li>
                <span className="flab-sw flab-sw--open" />
                Scenario pin
              </li>
              <li>
                <span className="flab-sw flab-sw--est" />
                Near-term estimate
              </li>
            </ul>
            <p className="flab-case-note">
              <b>{FAN_CASE_META[fanCase].label} case.</b> {FAN_CASE_META[fanCase].note} Each pin keeps unit, year,
              geography, and sourceUrl.
            </p>
          </section>

          <section className="flab-peaks" aria-labelledby="flab-peak-title">
            <div className="flab-card__head">
              <div>
                <h2 id="flab-peak-title" className="flab-h2">
                  Peak GW cards
                </h2>
                <p className="card__sub">
                  Peak and incremental gigawatts. Separate from the TWh chart. Do not read these as annual electricity.
                </p>
              </div>
              <span className="flab-tag flab-tag--sourced">sourced · GW, not TWh</span>
            </div>
            <div className="flab-peak-grid">
              {PEAK_GW_CARDS.map((card) => (
                <button
                  key={card.id}
                  className={`flab-peak${selected?.id === card.id ? " is-on" : ""}`}
                  onClick={() => setSelected(pinFromPeak(card))}
                >
                  <span className="flab-peak__v">
                    {card.unit === "GW incremental" ? "+" : ""}
                    {card.gw}
                    <small> {card.unit}</small>
                  </span>
                  <span className="flab-peak__l">{card.label}</span>
                  <span className="flab-peak__s">
                    {card.source} · {card.year} · {card.geography}
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>

        <aside className="flab-side">
          <section className="flab-card flab-card--side" aria-labelledby="flab-atlas-title">
            <div className="flab-card__head">
              <div>
                <h2 id="flab-atlas-title" className="flab-h2">
                  Atlas announcement GW
                </h2>
                <p className="card__sub">
                  Sidebar only. Hypergrid commitments intent. Never the TWh axis.
                </p>
              </div>
              <span className="flab-tag">intent · GW</span>
            </div>
            <div className="flab-atlas-stat">
              <span className="flab-atlas-stat__v">
                {formatGW(atlas.totalMW)}
                <small> GW</small>
              </span>
              <span className="flab-atlas-stat__l">
                Sum of {atlas.nWithMw} atlas rows with disclosed MW, of {atlas.n} commitments. Headline program size,
                not generation and not TWh.
              </span>
            </div>
            <ol className="flab-atlas-list">
              {atlas.top.map((c) => (
                <li key={c.id}>
                  <span className="flab-atlas-list__n">{c.project}</span>
                  <span className="flab-atlas-list__m">{formatGW(c.capacityMW ?? 0)} GW</span>
                </li>
              ))}
            </ol>
          </section>

          <section className="flab-card flab-card--side" aria-labelledby="flab-pin-title">
            <h2 id="flab-pin-title" className="flab-h2">
              Pin inspector
            </h2>
            {selected ? (
              <dl className="flab-pin-dl">
                <div>
                  <dt>Value</dt>
                  <dd>
                    {selected.value} {selected.unit}
                  </dd>
                </div>
                <div>
                  <dt>Year</dt>
                  <dd>{selected.year}</dd>
                </div>
                <div>
                  <dt>Geography</dt>
                  <dd>{selected.geography}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>{selected.status}</dd>
                </div>
                <div>
                  <dt>Scenario</dt>
                  <dd>{selected.scenario}</dd>
                </div>
                <div>
                  <dt>Source</dt>
                  <dd>{selected.source}</dd>
                </div>
                <div>
                  <dt>Honest label</dt>
                  <dd>{selected.numberKind === "assumed" ? "assumed · desk estimate" : "sourced"}</dd>
                </div>
                {selected.notes && (
                  <div className="flab-pin-dl--wide">
                    <dt>Notes</dt>
                    <dd>{selected.notes}</dd>
                  </div>
                )}
                {selected.sourceUrl && (
                  <div className="flab-pin-dl--wide">
                    <dt>sourceUrl</dt>
                    <dd>
                      <a href={selected.sourceUrl} target="_blank" rel="noopener noreferrer">
                        {selected.sourceUrl}
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
            ) : (
              <p className="card__sub">Click a TWh pin, a peak GW card, a bottleneck bar, or an inventory chip. Source names open sourceUrl.</p>
            )}
          </section>
        </aside>
      </div>

      <section className="flab-method prose">
        <h2>What this lab will not do</h2>
        <p>
          It will not default to the Analysis CAGR toy (8 / 20 / 34). It will not plot announcement MW on the TWh
          axis. It will not invent LBNL yearly intermediates for 2017 or 2019 through 2022. It will not silently
          average IEA and LBNL US history.           It will not invent bottleneck midpoints or restudy months. It will not sum OEM backlogs or merge firm with
          SRA. It will not invent hyperscaler GT ownership. Peak GW cards stay off the electricity chart.
        </p>
        <p>
          Data credits: IEA Key Questions on Energy and AI (Tables A.1 / A.4 and §1.3), IEA battery-storage commentary,
          LBNL 2024 and 2025 data-center electricity series, EPRI Powering Intelligence peak cases and EPRI / Utility
          Dive gas-turbine waits, DOE July 2025 midpoint incremental GW, Southern Nuclear Vogtle CODs. The default
          bottleneck strip is sourced pins only. Inventory is a thin sourced layer under it: GEV, Siemens Energy, MHI,
          Vistra 10-K, and ERCOT / IEA queue snapshots. Wood Mackenzie transformer weeks are omitted from this strip.
        </p>
      </section>

      <footer className="flab-foot">
        Built by{" "}
        <a href="https://x.com/davidtphung" target="_blank" rel="noopener noreferrer">
          David T Phung
        </a>
        . {FORECAST_TWH.length} sourced TWh rows, embedded exactly.
      </footer>
    </div>
  );
}

function InventoryLayer({
  selectedId,
  onSelect,
}: {
  selectedId: string | null;
  onSelect: (p: InventoryPin) => void;
}) {
  const backlog = INVENTORY_PINS.filter((p) => p.column === "backlog");
  const delivered = INVENTORY_PINS.filter((p) => p.column === "delivered");
  const queue = INVENTORY_PINS.filter((p) => p.column === "queue");
  const heroes = queue.filter((p) => p.weight === "hero");
  const muted = queue.filter((p) => p.weight !== "hero");

  return (
    <section className="flab-inv" aria-labelledby="flab-inv-title">
      <div className="flab-inv__head">
        <div>
          <h2 id="flab-inv-title" className="flab-h2">
            Inventory (thin)
          </h2>
          <p className="flab-bn__lead">
            Metal vs queue. Secondary to the lead-time strip. Firm and SRA stay separate. OEM books are not summed.
          </p>
        </div>
        <span className="flab-tag flab-tag--sourced">sourced · not announcement MW</span>
      </div>
      <p className="flab-inv-callout">{INVENTORY_CALLOUT}</p>
      <div className="flab-inv-grid">
        <div className="flab-inv-col">
          <h3 className="flab-inv-col__h">Backlog</h3>
          <p className="flab-inv-col__sub">OEM books. Firm is binding. SRA is hope. Not one industry total.</p>
          <div className="flab-inv-chips">
            {backlog.map((p) => (
              <InventoryChip key={p.id} pin={p} selected={selectedId === p.id} onSelect={onSelect} />
            ))}
          </div>
          <p className="flab-inv-note">{GEV_LABELED_SUM}</p>
        </div>
        <div className="flab-inv-col">
          <h3 className="flab-inv-col__h">Delivered</h3>
          <p className="flab-inv-col__sub">Named operating metal. Not a hyperscaler ownership map.</p>
          <div className="flab-inv-chips">
            {delivered.map((p) => (
              <InventoryChip key={p.id} pin={p} selected={selectedId === p.id} onSelect={onSelect} />
            ))}
          </div>
          <p className="flab-inv-gap">{INVENTORY_GAP}</p>
        </div>
        <div className="flab-inv-col">
          <h3 className="flab-inv-col__h">Queue vs exists</h3>
          <p className="flab-inv-col__sub">Energized and capacity are the hero. Queue snapshots stay muted and un-averaged.</p>
          <div className="flab-inv-heroes">
            {heroes.map((p) => (
              <a
                key={p.id}
                className={`flab-inv-hero${selectedId === p.id ? " is-on" : ""}`}
                href={p.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onSelect(p)}
              >
                <span className="flab-inv-hero__v">
                  {p.value}
                  <small> {p.unit}</small>
                </span>
                <span className="flab-inv-hero__l">{p.label}</span>
                <span className="flab-inv-hero__s">
                  {p.source} · {p.year} · {p.geography}
                </span>
              </a>
            ))}
          </div>
          <div className="flab-inv-chips">
            {muted.map((p) => (
              <InventoryChip key={p.id} pin={p} selected={selectedId === p.id} onSelect={onSelect} />
            ))}
          </div>
          <a className="flab-inv-extra" href={ERCOT_FACT_SHEET_URL} target="_blank" rel="noopener noreferrer">
            ERCOT Fact Sheet (2022 file, not a 2026 number)
          </a>
        </div>
      </div>
    </section>
  );
}

function InventoryChip({
  pin,
  selected,
  onSelect,
}: {
  pin: InventoryPin;
  selected: boolean;
  onSelect: (p: InventoryPin) => void;
}) {
  return (
    <a
      className={`flab-inv-chip flab-inv-chip--${pin.kind}${pin.weight === "muted" || pin.kind === "sra" || pin.kind === "queue" ? " flab-inv-chip--soft" : ""}${selected ? " is-on" : ""}`}
      href={pin.sourceUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => onSelect(pin)}
    >
      <span className="flab-inv-chip__k">
        {pin.id === "gev-slots-2031"
          ? "Secondary"
          : pin.kind === "sra"
            ? "SRA"
            : pin.kind === "firm"
              ? "Firm"
              : pin.kind === "queue"
                ? "Queue"
                : pin.kind === "frame"
                  ? "Frame"
                  : "Sourced"}
      </span>
      <span className="flab-inv-chip__v">
        {pin.value} {pin.unit}
      </span>
      <span className="flab-inv-chip__l">{pin.label}</span>
      <span className="flab-inv-chip__s">
        {pin.source}
        {pin.year ? ` · ${pin.year}` : ""} · {pin.geography}
      </span>
    </a>
  );
}

function barGeometry(b: BottleneckPin): { left: number; width: number; plusAt: number | null } {
  const scale = BOTTLENECK_SCALE_DAYS;
  if (b.kind === "duration") {
    const widthDays = bottleneckToDays(b.valueLow, b.unit);
    return { left: 0, width: (widthDays / scale) * 100, plusAt: null };
  }
  const lowDays = bottleneckToDays(b.valueLow, b.unit);
  if (b.kind === "open" || b.openHigh || b.valueHigh == null) {
    return {
      left: (lowDays / scale) * 100,
      width: ((scale - lowDays) / scale) * 100,
      plusAt: (lowDays / scale) * 100,
    };
  }
  const highDays = bottleneckToDays(b.valueHigh, b.unit);
  return {
    left: (lowDays / scale) * 100,
    width: ((highDays - lowDays) / scale) * 100,
    plusAt: null,
  };
}

function BottleneckStrip({
  selectedId,
  onSelectPin,
  onSelectChip,
}: {
  selectedId: string | null;
  onSelectPin: (b: BottleneckPin) => void;
  onSelectChip: (c: BottleneckChip) => void;
}) {
  const ticks = [
    { d: 0, l: "0" },
    { d: 365, l: "1y" },
    { d: 365 * 2, l: "2y" },
    { d: 365 * 3, l: "3y" },
    { d: 365 * 5, l: "5y" },
    { d: 365 * 6, l: "6y" },
    { d: 365 * 10, l: "10y" },
  ];
  const ieaGt = BOTTLENECK_CHIPS.find((c) => c.id === "iea-gt-5y")!;
  const vogtle = BOTTLENECK_CHIPS.filter((c) => c.id.startsWith("vogtle-"));

  return (
    <div className="flab-strip">
      <div className="flab-strip__axis" aria-hidden="true">
        {ticks.map((t) => (
          <span key={t.l} className="flab-strip__tick" style={{ left: `${(t.d / BOTTLENECK_SCALE_DAYS) * 100}%` }}>
            {t.l}
          </span>
        ))}
      </div>
      {BOTTLENECKS.map((b) => {
        const geo = barGeometry(b);
        return (
          <div key={b.id}>
            <div className={`flab-strip__row${selectedId === b.id ? " is-on" : ""}`}>
              <button className="flab-strip__lab" type="button" onClick={() => onSelectPin(b)}>
                <b>{b.short}</b>
                <em>sourced</em>
              </button>
              <button
                className="flab-strip__track-btn"
                type="button"
                onClick={() => onSelectPin(b)}
                aria-label={`${b.label} ${b.displayLabel} ${b.source}`}
              >
                <span className="flab-strip__track">
                  <span
                    className={`flab-strip__bar${b.openHigh ? " flab-strip__bar--open" : ""}`}
                    style={{ left: `${geo.left}%`, width: `${Math.max(geo.width, 1.1)}%` }}
                  />
                  {geo.plusAt != null && <span className="flab-strip__plus" style={{ left: `${geo.plusAt}%` }} />}
                </span>
              </button>
              <span className="flab-strip__val">
                {b.displayLabel}
                <a
                  className="flab-strip__src"
                  href={b.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => onSelectPin(b)}
                >
                  {b.source}
                  {b.year ? ` ${b.year}` : ""}
                </a>
              </span>
            </div>
            {b.id === "interconnect" && <p className="flab-strip__note">{ERCOT_QUEUE_NOTE}</p>}
            {b.id === "gt-large" && (
              <div className="flab-strip__chips">
                <a
                  className={`flab-bn-chip${selectedId === ieaGt.id ? " is-on" : ""}`}
                  href={ieaGt.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => onSelectChip(ieaGt)}
                >
                  {ieaGt.label}: {ieaGt.value} {ieaGt.unit} · {ieaGt.source}
                </a>
              </div>
            )}
            {b.id === "nuclear" && (
              <div className="flab-strip__chips">
                {vogtle.map((c) => (
                  <a
                    key={c.id}
                    className={`flab-bn-chip${selectedId === c.id ? " is-on" : ""}`}
                    href={c.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => onSelectChip(c)}
                  >
                    {c.label}: {c.value} · {c.source}
                  </a>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function buildChartModel(geo: ForecastGeo, fanCase: FanCase) {
  const ieaHist = historyPoints(geo, "IEA");
  const lbnlHist = geo === "US" ? historyPoints(geo, "LBNL") : [];
  const scenarios = scenarioPoints(geo);
  const allPins = [...ieaHist, ...lbnlHist, ...scenarios];
  const xMin = geo === "US" ? 2014 : 2023;
  const xMax = 2030;
  const yMax = Math.max(200, ...allPins.map((p) => p.twh)) * 1.08;
  const step = geo === "world" ? 200 : 150;
  const yTicks: number[] = [];
  for (let v = 0; v <= yMax; v += step) yTicks.push(v);
  const xTicks = geo === "US" ? [2014, 2016, 2018, 2023, 2025, 2028, 2030] : [2023, 2024, 2025, 2028, 2030];

  const histSeries = [
    { key: "IEA", color: SOURCE_SERIES_COLOR.IEA, pts: ieaHist },
    ...(lbnlHist.length ? [{ key: "LBNL", color: SOURCE_SERIES_COLOR["LBNL-2024"], pts: lbnlHist }] : []),
  ];

  const fanRays: { key: string; color: string; active: boolean; pts: ForecastTwhPoint[] }[] = [];
  for (const k of FAN_ORDER) {
    const dest = fanAnchor(geo, k);
    const start =
      geo === "US"
        ? lastHistoryOrEstimate(lbnlHist) ?? lastHistoryOrEstimate(ieaHist)
        : lastHistoryOrEstimate(ieaHist);
    if (!start) continue;
    fanRays.push({
      key: k,
      color: FAN_CASE_META[k].color,
      active: k === fanCase,
      pts: [start, dest],
    });
  }
  if (geo === "US") {
    const ieaStart = lastHistoryOrEstimate(ieaHist);
    const ieaBase = ieaUsBase2030();
    if (ieaStart) {
      fanRays.push({
        key: "iea-us-base",
        color: SOURCE_SERIES_COLOR.IEA,
        active: fanCase === "base",
        pts: [ieaStart, ieaBase],
      });
    }
  }

  const bear = fanAnchor(geo, "bear");
  const bull = fanAnchor(geo, "bull");
  const start =
    geo === "US" ? lastHistoryOrEstimate(lbnlHist) ?? lastHistoryOrEstimate(ieaHist) : lastHistoryOrEstimate(ieaHist);
  const fanBand = start ? { start, low: bear, high: bull } : null;

  return { histSeries, fanRays, fanBand, allPins, xMin, xMax, yMax, yTicks, xTicks };
}

function fanBandPath(
  band: { start: ForecastTwhPoint; low: ForecastTwhPoint; high: ForecastTwhPoint },
  x: (y: number) => number,
  y: (t: number) => number
): string {
  return `M${x(band.start.year)},${y(band.start.twh)} L${x(band.high.year)},${y(band.high.twh)} L${x(band.low.year)},${y(band.low.twh)} Z`;
}
