import { useMemo } from "react";
import type { PreparedCommitment } from "../types";
import { TECH, STATUS, CATEGORY, techColor, buyerAccent } from "../lib/theme";
import { formatCapacity, formatFullDate, formatGW, formatLocation } from "../lib/format";
import { sumMW } from "../lib/select";

interface Props {
  selected: PreparedCommitment | null;
  /** Facet + time filtered commitments currently in view. */
  visible: PreparedCommitment[];
  totalAll: number;
  open: boolean;
  onSelect: (id: string) => void;
  onClose: () => void;
}

export default function DetailPanel({ selected, visible, totalAll, open, onSelect, onClose }: Props) {
  return (
    <aside className={`detail${open ? " detail--open" : ""}`} aria-label={selected ? "Commitment detail" : "Overview"}>
      <div className="sheet-handle" aria-hidden="true" />
      {selected ? (
        <DetailCard c={selected} onClose={onClose} />
      ) : (
        <Overview visible={visible} totalAll={totalAll} onSelect={onSelect} />
      )}
    </aside>
  );
}

function Overview({
  visible,
  totalAll,
  onSelect,
}: {
  visible: PreparedCommitment[];
  totalAll: number;
  onSelect: (id: string) => void;
}) {
  const stats = useMemo(() => {
    const totalGW = sumMW(visible);
    const buyers = new Set(visible.map((c) => c.buyer));
    const opGW = sumMW(visible.filter((c) => c.status === "operational"));
    const byBuyer = new Map<string, number>();
    for (const c of visible) byBuyer.set(c.buyer, (byBuyer.get(c.buyer) ?? 0) + (c.capacityMW ?? 0));
    const bars = [...byBuyer.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
    const maxBar = Math.max(1, ...bars.map((b) => b[1]));
    return { totalGW, buyers: buyers.size, opGW, bars, maxBar };
  }, [visible]);

  const recent = useMemo(() => [...visible].sort((a, b) => b.t - a.t).slice(0, 40), [visible]);

  return (
    <div className="overview">
      <p className="overview__eyebrow">The buildout</p>
      <h2 className="overview__lead">
        The hyperscalers are buying the <em>future of energy</em> to feed the AI era.
      </h2>

      <div className="stat-grid">
        <div className="stat">
          <div className="stat__val">
            {formatGW(stats.totalGW)}
            <small>GW</small>
          </div>
          <div className="stat__label">Capacity committed</div>
        </div>
        <div className="stat">
          <div className="stat__val">{visible.length}</div>
          <div className="stat__label">Commitments in view</div>
        </div>
        <div className="stat">
          <div className="stat__val">{stats.buyers}</div>
          <div className="stat__label">Buyers active</div>
        </div>
        <div className="stat">
          <div className="stat__val">
            {formatGW(stats.opGW)}
            <small>GW</small>
          </div>
          <div className="stat__label">Already operational</div>
        </div>
      </div>

      {stats.bars.length > 0 && (
        <div className="rail__group" style={{ marginBottom: 22 }}>
          <div className="rail__head">
            <h3 className="rail__title">Capacity by buyer</h3>
          </div>
          <div className="bars">
            {stats.bars.map(([name, mw]) => (
              <div className="bar__row" key={name}>
                <span className="bar__name">{name}</span>
                <span className="bar__track">
                  <span
                    className="bar__fill"
                    style={{ width: `${(mw / stats.maxBar) * 100}%`, background: buyerAccent(name) }}
                  />
                </span>
                <span className="bar__val">{mw ? `${formatGW(mw)} GW` : "n/a"}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rail__group">
        <div className="rail__head">
          <h3 className="rail__title">Ledger</h3>
          <span className="rail__reset" style={{ pointerEvents: "none" }}>
            {visible.length} of {totalAll}
          </span>
        </div>
        <div className="legend" role="list">
          {recent.map((c) => (
            <button key={c.id} className="legend__row" role="listitem" onClick={() => onSelect(c.id)}>
              <span className="legend__swatch" style={{ background: techColor(c.techType), borderRadius: 999 }} />
              <span className="legend__label" style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <span style={{ color: "var(--text)" }}>{c.project}</span>
                <span style={{ fontSize: 11, color: "var(--text-3)" }}>
                  {c.buyer} · {formatFullDate(c.date)}
                </span>
              </span>
              <span className="legend__val">{formatCapacity(c.capacityMW)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function DetailCard({ c, onClose }: { c: PreparedCommitment; onClose: () => void }) {
  return (
    <div className="detail__card">
      <div className="detail__hero">
        <button className="detail__close" onClick={onClose} aria-label="Close detail">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="18" y1="6" x2="6" y2="18" />
          </svg>
        </button>
        <div className="detail__buyer">
          <span className="detail__buyer-dot" style={{ background: buyerAccent(c.buyer) }} />
          <span className="detail__buyer-name">{c.buyer}</span>
        </div>
        <h2 className="detail__title">{c.project}</h2>
        <div className="detail__loc">{formatLocation(c.city, c.state, c.country) || c.country}</div>
        <div className="detail__capten">
          <span className="detail__cap">{formatCapacity(c.capacityMW)}</span>
          <span className="detail__cap-label">{c.capacityMW ? "committed capacity" : "capacity undisclosed"}</span>
        </div>
      </div>

      <div className="detail__body">
        <p className="detail__summary">{c.summary}</p>

        <div className="kv">
          <div className="kv__row">
            <span className="kv__k">Technology</span>
            <span className="kv__v" style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: techColor(c.techType) }} />
              {TECH[c.techType].label}
            </span>
          </div>
          <div className="kv__row">
            <span className="kv__k">Status</span>
            <span className="kv__v">{STATUS[c.status].label}</span>
          </div>
          <div className="kv__row">
            <span className="kv__k">Category</span>
            <span className="kv__v">{CATEGORY[c.category].label}</span>
          </div>
          {c.counterparty && (
            <div className="kv__row">
              <span className="kv__k">Counterparty</span>
              <span className="kv__v" style={{ fontFamily: "var(--font-sans)" }}>{c.counterparty}</span>
            </div>
          )}
          <div className="kv__row">
            <span className="kv__k">Announced</span>
            <span className="kv__v">{formatFullDate(c.date)}</span>
          </div>
          <div className="kv__row">
            <span className="kv__k">Confidence</span>
            <span className="kv__v" style={{ textTransform: "capitalize" }}>{c.confidence}</span>
          </div>
        </div>

        <a className="detail__source" href={c.sourceUrl} target="_blank" rel="noopener noreferrer">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" />
            <path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
          </svg>
          Source: {c.sourceName}
        </a>

        <p style={{ fontSize: 11, color: "var(--text-4)", marginTop: 2 }}>
          {formatGW(c.capacityMW ?? 0)} GW equivalent. Figures reflect publicly reported headline capacity.
        </p>
      </div>
    </div>
  );
}
