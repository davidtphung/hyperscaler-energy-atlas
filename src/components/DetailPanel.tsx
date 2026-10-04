import { useEffect, useMemo } from "react";
import type { PreparedCommitment } from "../types";
import { TECH, STATUS, CATEGORY, techColor, buyerAccent } from "../lib/theme";
import { formatBoundPower, formatExactMW, formatFullDate, formatLocation, formatNumberKind, formatNumberKindNote, formatPower, formatSourcedDate } from "../lib/format";
import { announcedCount, firmKindTotals, kindHeroNote } from "../lib/select";
import { emptyPrimaryMwIds, evidenceFor } from "../lib/evidence";
import { recordMeta } from "../lib/recordMeta";

interface Props {
  selected: PreparedCommitment | null;
  /** Facet + time filtered commitments currently in view. */
  visible: PreparedCommitment[];
  /** Full loaded catalog. Holder list reads from this, not from the facet view. */
  catalog: PreparedCommitment[];
  totalAll: number;
  open: boolean;
  onSelect: (id: string) => void;
  onClose: () => void;
  onToggleBuyer: (buyer: string) => void;
  buyersOn: Set<string>;
  onsiteOpen: boolean;
  onOnsiteOpen: (open: boolean) => void;
  onsiteOnly: boolean;
  onOnsiteOnly: (on: boolean) => void;
  onClearOnsite: () => void;
  ledgerFocusId: string | null;
}

export default function DetailPanel({
  selected,
  visible,
  catalog,
  totalAll,
  open,
  onSelect,
  onClose,
  onToggleBuyer,
  buyersOn,
  onsiteOpen,
  onOnsiteOpen,
  onsiteOnly,
  onOnsiteOnly,
  onClearOnsite,
  ledgerFocusId,
}: Props) {
  return (
    <aside className={`detail${open ? " detail--open" : ""}`} aria-label={selected ? "Commitment detail" : "Overview"}>
      <div className="sheet-handle" aria-hidden="true" />
      {selected ? (
        <DetailCard c={selected} onClose={onClose} />
      ) : (
        <Overview
          visible={visible}
          catalog={catalog}
          totalAll={totalAll}
          onSelect={onSelect}
          onToggleBuyer={onToggleBuyer}
          buyersOn={buyersOn}
          onsiteOpen={onsiteOpen}
          onOnsiteOpen={onOnsiteOpen}
          onsiteOnly={onsiteOnly}
          onOnsiteOnly={onOnsiteOnly}
          onClearOnsite={onClearOnsite}
          ledgerFocusId={ledgerFocusId}
        />
      )}
    </aside>
  );
}

function Overview({
  visible,
  catalog,
  totalAll,
  onSelect,
  onToggleBuyer,
  buyersOn,
  onsiteOpen,
  onOnsiteOpen,
  onsiteOnly,
  onOnsiteOnly,
  onClearOnsite,
  ledgerFocusId,
}: {
  visible: PreparedCommitment[];
  catalog: PreparedCommitment[];
  totalAll: number;
  onSelect: (id: string) => void;
  onToggleBuyer: (buyer: string) => void;
  buyersOn: Set<string>;
  onsiteOpen: boolean;
  onOnsiteOpen: (open: boolean) => void;
  onsiteOnly: boolean;
  onOnsiteOnly: (on: boolean) => void;
  onClearOnsite: () => void;
  ledgerFocusId: string | null;
}) {
  const stats = useMemo(() => {
    const actors = new Set(visible.map((c) => c.buyer));
    return {
      kinds: firmKindTotals(visible),
      actors: actors.size,
      announced: announcedCount(visible),
    };
  }, [visible]);

  const holders = useMemo(
    () => catalog.filter((c) => c.numberKind === "btm_gen" && c.counts === "yes"),
    [catalog],
  );
  const holderIds = useMemo(() => new Set(holders.map((c) => c.id)), [holders]);

  const recent = useMemo(() => {
    const base = onsiteOnly
      ? catalog.filter((c) => holderIds.has(c.id))
      : [...visible].sort((a, b) => b.t - a.t).slice(0, 40);
    if (ledgerFocusId && !base.some((c) => c.id === ledgerFocusId)) {
      const extra = catalog.find((c) => c.id === ledgerFocusId);
      if (extra) return [extra, ...base];
    }
    return base;
  }, [onsiteOnly, catalog, holderIds, visible, ledgerFocusId]);

  useEffect(() => {
    if (!ledgerFocusId) return;
    document.getElementById(`ledger-${ledgerFocusId}`)?.scrollIntoView({ block: "nearest" });
  }, [ledgerFocusId, recent]);

  return (
    <div className="overview">
      <p className="overview__eyebrow">The buildout</p>
      <h1 className="overview__lead">
        The hyperscalers are buying the <em>future of energy</em> to feed the AI era.
      </h1>

      <div className="kind-totals" aria-label="Firm totals by kind">
        {stats.kinds.map((k) => {
          const note = kindHeroNote(k.kind, visible);
          const head = (
            <>
              <span className="kind-total__val">
                {formatPower(k.mw, k.approx)}
                {k.mw >= 1000 && <small className="kind-total__mw">{formatExactMW(k.mw)}</small>}
              </span>
              <span className="kind-total__label">{formatNumberKind(k.kind)}</span>
              <span className="kind-total__meta">{k.rows} {k.rows === 1 ? "row" : "rows"} counted</span>
            </>
          );
          if (k.kind !== "btm_gen") {
            return (
              <div className="kind-total" key={k.kind}>
                {head}
                {note && <p className="kind-note">{note}</p>}
              </div>
            );
          }
          return (
            <div className="kind-total kind-total--onsite" key={k.kind}>
              <button
                type="button"
                id="onsite-tile"
                className="kind-total__toggle"
                aria-expanded={onsiteOpen}
                aria-controls="onsite-panel"
                onClick={() => onOnsiteOpen(!onsiteOpen)}
              >
                {head}
              </button>
              {note && <p className="kind-note">{note}</p>}
              {onsiteOpen && (
                <OnsiteHolders
                  holders={holders}
                  catalog={catalog}
                  buyersOn={buyersOn}
                  onToggleBuyer={onToggleBuyer}
                  onsiteOnly={onsiteOnly}
                  onOnsiteOnly={onOnsiteOnly}
                  onClear={onClearOnsite}
                  onSelect={onSelect}
                />
              )}
            </div>
          );
        })}
      </div>
      <p className="kind-note">These totals are separate. They are not added together.</p>
      <p className="kind-note">Announced: {stats.announced} {stats.announced === 1 ? "row" : "rows"}. Not included in the totals above.</p>

      <div className="stat-grid">
        <div className="stat">
          <div className="stat__val">{visible.length}</div>
          <div className="stat__label">Commitments in view</div>
        </div>
        <div className="stat">
          <div className="stat__val">{stats.actors}</div>
          <div className="stat__label">Actors</div>
        </div>
      </div>

        <div className="rail__group" id="ledger">
          <div className="rail__head">
            <h2 className="rail__title">Ledger</h2>
          <span className="rail__reset" style={{ pointerEvents: "none" }}>
            {onsiteOnly ? recent.length : visible.length} of {totalAll}
          </span>
        </div>
        {onsiteOnly && (
          <p className="kind-note">List limited to counted on-site holders. Totals above stay on the rows in view.</p>
        )}
        <div className="legend">
          {recent.map((c) => (
            <button
              key={c.id}
              id={`ledger-${c.id}`}
              className={`legend__row${c.id === ledgerFocusId ? " legend__row--focus" : ""}`}
              onClick={() => onSelect(c.id)}
            >
              <span className="legend__swatch" style={{ background: techColor(c.techType), borderRadius: 999 }} />
              <span className="legend__label" style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <span style={{ color: "var(--text)" }}>{c.project}</span>
                <span style={{ fontSize: 11, color: "var(--text-3)" }}>
                  {c.buyer} · {formatFullDate(c.date)}
                </span>
              </span>
              <span className="legend__val">{formatBoundPower(c.capacityMW, c.bound)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const ALSO_PUBLIC = [
  {
    href: "https://opsb.ohio.gov/news/opsb-approves-construction-of-licking-county-natural-gas-fired-power-plant",
    label: "Ohio Power Siting Board release, 9 Jun 2025",
  },
  {
    href: "https://www.williams.com/wp-content/uploads/sites/14/2026/02/Socrates-North-and-South-Fact-Sheet-1.pdf",
    label: "Williams fact sheet",
  },
];

function OnsiteHolders({
  holders,
  catalog,
  buyersOn,
  onToggleBuyer,
  onsiteOnly,
  onOnsiteOnly,
  onClear,
  onSelect,
}: {
  holders: PreparedCommitment[];
  catalog: PreparedCommitment[];
  buyersOn: Set<string>;
  onToggleBuyer: (buyer: string) => void;
  onsiteOnly: boolean;
  onOnsiteOnly: (on: boolean) => void;
  onClear: () => void;
  onSelect: (id: string) => void;
}) {
  const loaded = firmKindTotals(catalog).find((k) => k.kind === "btm_gen");
  const extraIds = new Set(emptyPrimaryMwIds());
  const showAlso = holders.some((row) => extraIds.has(row.id));

  return (
    <div className="onsite-panel" id="onsite-panel">
      <div className="onsite-panel__head">
        <h3>Who holds the on-site generation</h3>
        <button type="button" onClick={onClear}>
          Clear
        </button>
      </div>
      <p className="kind-note">The five totals are separate and are not added together.</p>
      {loaded && (
        <p className="kind-note">
          Counted on-site total in the loaded rows: {formatPower(loaded.mw, loaded.approx)}, {loaded.rows}{" "}
          {loaded.rows === 1 ? "row" : "rows"}.
        </p>
      )}
      <button
        type="button"
        className="onsite-panel__only"
        aria-pressed={onsiteOnly}
        onClick={() => onOnsiteOnly(!onsiteOnly)}
      >
        Show only these on the map and list
      </button>
      <ul className="onsite-list">
        {holders.map((row) => {
          const ev = evidenceFor(row);
          return (
            <li key={row.id} className="onsite-card">
              <div className="onsite-card__who">
                <button
                  type="button"
                  className="onsite-card__buyer"
                  aria-pressed={buyersOn.has(row.buyer)}
                  onClick={() => onToggleBuyer(row.buyer)}
                >
                  {row.buyer}
                </button>
                {row.counterparty && <span className="onsite-card__party">{row.counterparty}</span>}
              </div>
              <button type="button" className="onsite-card__main" onClick={() => onSelect(row.id)}>
                <span className="onsite-card__project">{row.project}</span>
                <span className="onsite-card__place">{formatLocation(row.city, row.state, row.country)}</span>
                <span className="onsite-card__mw">{formatBoundPower(row.capacityMW, row.bound)}</span>
                <span className="onsite-card__status">{STATUS[row.status].label}</span>
              </button>
              <div className="onsite-card__ev">
                <span className="ev-chip">Status: {ev.status.mark}</span>
                <span className="ev-chip">MW: {ev.mw.mark}</span>
              </div>
              {ev.mw.mark === "EMPTY PRIMARY" && <p className="onsite-card__reason">{ev.mw.reason}</p>}
              <a className="onsite-card__source" href={row.sourceUrl} target="_blank" rel="noopener noreferrer">
                {row.sourceName}
              </a>
              {row.sourceUrl2 && (
                <a className="onsite-card__source" href={row.sourceUrl2} target="_blank" rel="noopener noreferrer">
                  {row.sourceName2 ?? row.sourceUrl2}
                </a>
              )}
            </li>
          );
        })}
      </ul>
      {showAlso && (
        <div className="onsite-also">
          <p>
            Also public (not the row's cited link). CLAIM for the holder and the per-plant MW. Not the cited
            source and not used for counting.
          </p>
          {ALSO_PUBLIC.map((link) => (
            <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer">
              {link.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function RecordBlock({ c }: { c: PreparedCommitment }) {
  const meta = recordMeta(c);
  const evidence = evidenceFor(c);
  const rows: [string, string][] = [
    ["Id", meta.id],
    ["Kind", meta.kind],
    ["Status", meta.status],
    ["Counts", `${meta.counts}. ${meta.countsWhy}`],
    ["Basis", meta.basis],
    ["Figure type", meta.figureType],
    ["Source domain", meta.sourceDomain],
    ["Checked", meta.checked],
    ["Evidence", meta.evidence],
  ];
  return (
    <div className="record">
      <h2 className="record__title">Record</h2>
      <div className="kv">
        {rows.map(([label, value]) => (
          <div className="kv__row" key={label}>
            <span className="kv__k">{label}</span>
            <span className="kv__v">{value}</span>
          </div>
        ))}
      </div>
      <p className="kind-note">
        Status {evidence.status.mark}. {evidence.status.reason}
      </p>
      <p className="kind-note">
        MW {evidence.mw.mark}. {evidence.mw.reason}
      </p>
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
          <span className="detail__buyer-kind">{c.actorKind}</span>
        </div>
        <h1 className="detail__title">{c.project}</h1>
        <div className="detail__loc">
          {formatLocation(c.city, c.state, c.country) || c.country}
          {c.locationApprox && <span className="detail__loc-note">Approximate pin. Not an exact site.</span>}
        </div>
        <div className="detail__capten">
          <span className="detail__cap">{formatBoundPower(c.capacityMW, c.bound)}</span>
          <span className="detail__cap-label">
            {formatNumberKind(c.numberKind) ?? (c.capacityMW ? "committed capacity" : "capacity undisclosed")}
          </span>
        </div>
      </div>

      <div className="detail__body">
        <p className="detail__summary">{c.summary}</p>

        <div className="kv">
          <div className="kv__row">
            <span className="kv__k">Technology</span>
            <span className="kv__v" style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: techColor(c.techType) }} />
              {c.numberKind === "btm_gen" ? "On-site generation" : TECH[c.techType].label}
            </span>
          </div>
          <div className="kv__row">
            <span className="kv__k">Status</span>
            <span className="kv__v">{c.excludeReason === "restart" ? "Restart in progress" : STATUS[c.status].label}</span>
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
            <span className="kv__k">Construction start</span>
            <span className="kv__v">{formatSourcedDate(c.constructionStart)}</span>
          </div>
          <div className="kv__row">
            <span className="kv__k">Online / COD</span>
            <span className="kv__v">{formatSourcedDate(c.onlineDate)}</span>
          </div>
          <div className="kv__row">
            <span className="kv__k">Confidence</span>
            <span className="kv__v" style={{ textTransform: "capitalize" }}>{c.confidence}</span>
          </div>
          {c.numberKind && (
            <div className="kv__row">
              <span className="kv__k">Number kind</span>
              <span className="kv__v">{formatNumberKind(c.numberKind)}</span>
            </div>
          )}
          {"energizedMW" in c && (
            <div className="kv__row">
              <span className="kv__k">Energized</span>
              <span className="kv__v">{c.energizedMW == null ? "empty" : formatPower(c.energizedMW)}</span>
            </div>
          )}
          {"daysToCod" in c && (
            <div className="kv__row">
              <span className="kv__k">Days to COD</span>
              <span className="kv__v">{c.daysToCod == null ? "empty" : String(c.daysToCod)}</span>
            </div>
          )}
        </div>

        <RecordBlock c={c} />

        <a className="detail__source" href={c.sourceUrl} target="_blank" rel="noopener noreferrer">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" />
            <path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
          </svg>
          Source: {c.sourceName}
        </a>
        {c.sourceUrl2 && (
          <a className="detail__source" href={c.sourceUrl2} target="_blank" rel="noopener noreferrer">
            Source: {c.sourceName2 ?? c.sourceUrl2}
          </a>
        )}

        <p style={{ fontSize: 11, color: "var(--text-4)", marginTop: 2 }}>
          {formatNumberKindNote(c.numberKind) ??
            `${formatBoundPower(c.capacityMW, c.bound)}. Figures reflect publicly reported headline capacity.`}
        </p>
      </div>
    </div>
  );
}
