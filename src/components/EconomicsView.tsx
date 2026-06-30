import { useMemo, useState } from "react";
import { REAL_ESTATE } from "../data/realestate";
import { CONSTRUCTION } from "../data/construction";
import type { RealEstateDeal } from "../types";
import { DEAL_TYPE, DEAL_TYPE_ORDER } from "../lib/theme";
import { formatUSD, formatSqft, formatMonthYear } from "../lib/format";
import { useElementSize } from "../lib/hooks";
import ScatterMap, { type ScatterPoint } from "./ScatterMap";

type SortKey = "date" | "price" | "psf" | "mw";

function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export default function EconomicsView() {
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "price", dir: "desc" });
  const [selected, setSelected] = useState<string | null>(null);

  const stats = useMemo(() => {
    const psf = REAL_ESTATE.map((d) => d.pricePerSqft).filter((v): v is number => v != null);
    const total = REAL_ESTATE.reduce((a, d) => a + (d.priceUSD ?? 0), 0);
    const perMW = REAL_ESTATE.filter((d) => d.priceUSD && d.sizeMW).map((d) => d.priceUSD! / d.sizeMW!);
    return {
      count: REAL_ESTATE.length,
      total,
      medianPsf: median(psf),
      medianPerMW: median(perMW),
      markets: new Set(REAL_ESTATE.map((d) => `${d.city}|${d.country}`)).size,
    };
  }, []);

  const sorted = useMemo(() => {
    const dir = sort.dir === "asc" ? 1 : -1;
    const val = (d: RealEstateDeal) =>
      sort.key === "date" ? d.dealDate : sort.key === "price" ? d.priceUSD : sort.key === "psf" ? d.pricePerSqft : d.sizeMW;
    return [...REAL_ESTATE].sort((a, b) => {
      const av = val(a), bv = val(b);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return (av < bv ? -1 : av > bv ? 1 : 0) * dir;
    });
  }, [sort]);

  const points: ScatterPoint[] = useMemo(
    () =>
      REAL_ESTATE.map((d) => ({
        id: d.id,
        lat: d.lat,
        lng: d.lng,
        color: DEAL_TYPE[d.dealType].color,
        r: d.priceUSD ? Math.max(4, Math.min(13, 3 + Math.sqrt(d.priceUSD / 1e9) * 4)) : 4,
        label: d.project,
        sublabel: `${d.buyer} / ${d.seller} · ${formatUSD(d.priceUSD)} · ${DEAL_TYPE[d.dealType].label}`,
      })),
    []
  );

  const psfSeries = useMemo(
    () => REAL_ESTATE.filter((d) => d.pricePerSqft != null).map((d) => ({ year: Number(d.dealDate.slice(0, 4)), psf: d.pricePerSqft! })),
    []
  );

  const materials = useMemo(
    () =>
      CONSTRUCTION.filter((c) => c.kind === "material" && (c.leadTimeWeeksHigh != null || c.leadTimeWeeksLow != null)).sort(
        (a, b) => (b.leadTimeWeeksHigh ?? b.leadTimeWeeksLow ?? 0) - (a.leadTimeWeeksHigh ?? a.leadTimeWeeksLow ?? 0)
      ),
    []
  );
  const maxWeeks = Math.max(1, ...materials.map((m) => m.leadTimeWeeksHigh ?? m.leadTimeWeeksLow ?? 0));

  const benchmarks = useMemo(
    () => CONSTRUCTION.filter((c) => c.kind === "cost" && c.costPerMwMillionUSD != null).sort((a, b) => (b.costPerMwMillionUSD ?? 0) - (a.costPerMwMillionUSD ?? 0)),
    []
  );
  const maxMW = Math.max(1, ...benchmarks.map((b) => b.costPerMwMillionUSD ?? 0));

  const onSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "date" ? "desc" : "desc" }));

  const sel = REAL_ESTATE.find((d) => d.id === selected) ?? null;

  return (
    <div className="page page--econ">
      <header className="page__head">
        <p className="overview__eyebrow">Economics</p>
        <h1 className="page__title">Real estate and construction</h1>
        <p className="page__lead">
          The capital and supply side of the buildout: who is buying and selling data center real estate, what it costs
          per square foot and per megawatt, and the long-lead equipment that gates how fast it can be built.
        </p>
      </header>

      <div className="dc-stats">
        <Stat v={formatUSD(stats.total)} l="Tracked deal value" />
        <Stat v={String(stats.count)} l="Transactions" />
        <Stat v={`$${Math.round(stats.medianPsf)}`} l="Median $/sqft" />
        <Stat v={`$${(stats.medianPerMW / 1e6).toFixed(1)}M`} l="Median $/MW" />
        <Stat v={String(stats.markets)} l="Markets" />
        <Stat v={String(materials.length)} l="Lead-time items" />
      </div>

      <div className="dc-maprow">
        <ScatterMap points={points} view="world" selectedId={selected} onSelect={setSelected} height={340} />
        <div className="dc-mapctl">
          <h3 className="sources-h">Deal type</h3>
          <div className="dc-legend">
            {DEAL_TYPE_ORDER.filter((t) => REAL_ESTATE.some((d) => d.dealType === t)).map((t) => (
              <span key={t} className="dc-legend__item">
                <span className="dc-legend__dot" style={{ background: DEAL_TYPE[t].color }} />
                {DEAL_TYPE[t].label}
              </span>
            ))}
          </div>
          <p className="dc-mapnote">Dot size reflects deal value. Markers sit at the campus or headquarters market.</p>
        </div>
      </div>

      {sel && <DealCard d={sel} onClose={() => setSelected(null)} />}

      <div className="econ-grid">
        <section className="card" aria-label="Price per square foot over time">
          <h3 className="card__title">Price per square foot, by year</h3>
          <p className="card__sub">Disclosed $/sqft across tracked deals</p>
          <PsfChart series={psfSeries} />
        </section>

        <section className="card" aria-label="Construction cost per megawatt">
          <h3 className="card__title">Construction cost, $M per MW</h3>
          <p className="card__sub">Hyperscale build benchmarks by market</p>
          <div className="bench">
            {benchmarks.map((b) => (
              <div className="bench__row" key={b.id}>
                <span className="bench__name">{b.market || b.label}{b.year ? ` ${b.year}` : ""}</span>
                <span className="bench__track"><span className="bench__fill" style={{ width: `${((b.costPerMwMillionUSD ?? 0) / maxMW) * 100}%` }} /></span>
                <span className="bench__val">${(b.costPerMwMillionUSD ?? 0).toFixed(1)}M</span>
              </div>
            ))}
            {benchmarks.length === 0 && <p className="card__foot">Benchmarks loading.</p>}
          </div>
        </section>
      </div>

      <section className="card card--full" aria-label="Long-lead materials" style={{ marginBottom: 14 }}>
        <h3 className="card__title">Long-lead equipment</h3>
        <p className="card__sub">Lead times in weeks for the items that gate data center schedules</p>
        <div className="lead">
          {materials.map((m) => {
            const lo = m.leadTimeWeeksLow ?? m.leadTimeWeeksHigh ?? 0;
            const hi = m.leadTimeWeeksHigh ?? m.leadTimeWeeksLow ?? 0;
            return (
              <div className="lead__row" key={m.id}>
                <span className="lead__name">{m.label}</span>
                <span className="lead__track">
                  <span className="lead__bar" style={{ left: `${(lo / maxWeeks) * 100}%`, width: `${(Math.max(hi - lo, maxWeeks * 0.01) / maxWeeks) * 100}%` }} />
                </span>
                <span className="lead__val">{lo === hi ? `${hi}w` : `${lo} to ${hi}w`}</span>
              </div>
            );
          })}
          {materials.length === 0 && <p className="card__foot">Lead-time data loading.</p>}
        </div>
      </section>

      <div className="dc-table-wrap">
        <div className="dc-row econ-row econ-row--head" role="row">
          <span className="dc-th" style={{ cursor: "default" }}>Deal</span>
          <span className="dc-th" style={{ cursor: "default" }}>Type</span>
          <button className={`dc-th dc-num${sort.key === "price" ? " is-active" : ""}`} onClick={() => onSort("price")}>Price <Arrow on={sort.key === "price"} dir={sort.dir} /></button>
          <button className={`dc-th dc-num${sort.key === "psf" ? " is-active" : ""}`} onClick={() => onSort("psf")}>$/sqft <Arrow on={sort.key === "psf"} dir={sort.dir} /></button>
          <button className={`dc-th dc-num${sort.key === "mw" ? " is-active" : ""}`} onClick={() => onSort("mw")}>MW <Arrow on={sort.key === "mw"} dir={sort.dir} /></button>
          <button className={`dc-th dc-num${sort.key === "date" ? " is-active" : ""}`} onClick={() => onSort("date")}>Date <Arrow on={sort.key === "date"} dir={sort.dir} /></button>
        </div>
        <ul className="dc-table" role="list">
          {sorted.map((d) => (
            <DealRow key={d.id} d={d} open={selected === d.id} onToggle={() => setSelected(selected === d.id ? null : d.id)} />
          ))}
        </ul>
        {REAL_ESTATE.length === 0 && <div className="dc-empty">Deals loading.</div>}
      </div>
    </div>
  );
}

function Arrow({ on, dir }: { on: boolean; dir: "asc" | "desc" }) {
  return <span className="dc-th__arrow" aria-hidden="true">{on ? (dir === "asc" ? "↑" : "↓") : "↕"}</span>;
}
function Stat({ v, l }: { v: string; l: string }) {
  return (
    <div className="dc-stat">
      <span className="dc-stat__v">{v}</span>
      <span className="dc-stat__l">{l}</span>
    </div>
  );
}

function DealRow({ d, open, onToggle }: { d: RealEstateDeal; open: boolean; onToggle: () => void }) {
  return (
    <li className={`dc-li${open ? " dc-li--open" : ""}`}>
      <button className="dc-row econ-row" onClick={onToggle} aria-expanded={open}>
        <span className="dc-cell-main">
          <span className="dc-fac">{d.project}</span>
          <span className="dc-op">{d.buyer}{d.seller && d.seller !== d.buyer ? ` from ${d.seller}` : ""}</span>
        </span>
        <span className="dc-type" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 7, height: 7, borderRadius: 2, background: DEAL_TYPE[d.dealType].color }} />
          {DEAL_TYPE[d.dealType].label}
        </span>
        <span className="dc-num dc-mw">{formatUSD(d.priceUSD)}</span>
        <span className="dc-num dc-mw">{d.pricePerSqft != null ? `$${Math.round(d.pricePerSqft)}` : "n/a"}</span>
        <span className="dc-num dc-mw">{d.sizeMW != null ? d.sizeMW : "n/a"}</span>
        <span className="dc-num dc-mw">{formatMonthYear(d.dealDate)}</span>
      </button>
      {open && (
        <div className="dc-detail">
          <p>{d.summary}</p>
          <div className="dc-meta">
            <span>{[d.city, d.region, d.country].filter(Boolean).join(", ")}</span>
            {d.grossSqft != null && <span>{formatSqft(d.grossSqft)}</span>}
            {d.capRatePct != null && <span>Cap rate {d.capRatePct}%</span>}
            <span>Confidence: {d.confidence}</span>
            <a href={d.sourceUrl} target="_blank" rel="noopener noreferrer">Source: {d.sourceName} ↗</a>
          </div>
        </div>
      )}
    </li>
  );
}

function DealCard({ d, onClose }: { d: RealEstateDeal; onClose: () => void }) {
  return (
    <div className="fac-card" role="region" aria-label="Selected deal">
      <button className="fac-card__close" onClick={onClose} aria-label="Close deal detail">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" /></svg>
      </button>
      <div className="fac-card__head">
        <span className="fac-card__dot" style={{ background: DEAL_TYPE[d.dealType].color }} />
        <div className="dc-cell-main">
          <span className="fac-card__name">{d.project}</span>
          <span className="dc-op">{d.buyer}{d.seller && d.seller !== d.buyer ? ` from ${d.seller}` : ""} · {DEAL_TYPE[d.dealType].label}</span>
        </div>
      </div>
      <p className="fac-card__sum">{d.summary}</p>
      <div className="fac-card__meta">
        <span>{[d.city, d.region, d.country].filter(Boolean).join(", ")}</span>
        <span>{formatUSD(d.priceUSD)}</span>
        {d.pricePerSqft != null && <span>${Math.round(d.pricePerSqft)}/sqft</span>}
        {d.sizeMW != null && <span>{d.sizeMW} MW</span>}
        {d.grossSqft != null && <span>{formatSqft(d.grossSqft)}</span>}
        {d.capRatePct != null && <span>Cap rate {d.capRatePct}%</span>}
        <a href={d.sourceUrl} target="_blank" rel="noopener noreferrer">Source: {d.sourceName} ↗</a>
      </div>
    </div>
  );
}

function PsfChart({ series }: { series: { year: number; psf: number }[] }) {
  const { ref, width } = useElementSize<HTMLDivElement>();
  const h = 200, padL = 44, padR = 12, padT = 12, padB = 24;
  if (series.length === 0) return <div className="card__foot" style={{ paddingTop: 20 }}>Price data loading.</div>;
  const years = series.map((s) => s.year);
  const minY = Math.min(...years), maxY = Math.max(...years);
  const maxP = Math.max(...series.map((s) => s.psf));
  const innerW = Math.max(1, width - padL - padR), innerH = h - padT - padB;
  const x = (yr: number) => padL + (maxY === minY ? 0.5 : (yr - minY) / (maxY - minY)) * innerW;
  const y = (p: number) => padT + innerH - (p / maxP) * innerH;
  const ticks = [0, Math.round(maxP / 2), Math.round(maxP)];
  return (
    <div className="fc-chart" ref={ref} style={{ height: h }}>
      {width > 0 && (
        <svg width={width} height={h} role="img" aria-label="Price per square foot scatter by year">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={padL} y1={y(t)} x2={width - padR} y2={y(t)} className="tl-tick" />
              <text x={padL - 8} y={y(t) + 3} textAnchor="end" className="tl-tick-label">${t}</text>
            </g>
          ))}
          {Array.from(new Set(years)).sort().map((yr) => (
            <text key={yr} x={x(yr)} y={h - 7} textAnchor="middle" className="tl-tick-label">{`'${String(yr).slice(2)}`}</text>
          ))}
          {series.map((s, i) => (
            <circle key={i} cx={x(s.year)} cy={y(s.psf)} r={4} fill="var(--signal)" fillOpacity={0.85} stroke="#0a0c10" strokeWidth={1} />
          ))}
        </svg>
      )}
    </div>
  );
}
