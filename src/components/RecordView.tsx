import changelogJson from "../../data/changelog.json";
import { formatFullDate, formatNumberKind, formatNumberKindShort, formatPower } from "../lib/format";
import type { NumberKind } from "../types";

interface SnapshotKind {
  numberKind: NumberKind;
  countedMW: number;
  countedRows: number;
  statusMix: Record<string, number>;
}

interface DataSnapshot {
  date: string;
  source: string;
  note: string;
  rowCount: number;
  kinds: SnapshotKind[];
  rows: { id: string; status: string; capacityMW: number | null; counts: string; numberKind: string }[];
}

interface ChangelogEntry {
  date: string;
  type: "row_added" | "status_changed" | "mw_corrected" | "counts_changed";
  rowId: string;
  before: string;
  after: string;
  sourceUrl: string;
  note?: string;
}

const SERIES: { kind: NumberKind; color: string; dash?: string }[] = [
  { kind: "it_capacity", color: "#c8f135" },
  { kind: "grid_gen_for_dc", color: "#7fc4ec", dash: "6 4" },
  { kind: "btm_gen", color: "#f0a05a" },
  { kind: "offtake_new", color: "#67e8f9" },
  { kind: "offtake_existing", color: "#c4b5fd", dash: "2 3" },
  { kind: "utility_load", color: "#aab1ba", dash: "1 4" },
];

const snapshotFiles = import.meta.glob("../../data/history/*.json", {
  eager: true,
  import: "default",
}) as Record<string, DataSnapshot>;

const SNAPSHOTS = Object.values(snapshotFiles).sort((a, b) => a.date.localeCompare(b.date));
const ENTRIES = [...(changelogJson.entries as ChangelogEntry[])].sort(
  (a, b) => b.date.localeCompare(a.date) || a.rowId.localeCompare(b.rowId),
);

function changeText(entry: ChangelogEntry): string {
  if (entry.type === "row_added") return `Row added: ${entry.rowId}. ${entry.after}`;
  if (entry.type === "mw_corrected") {
    return `MW corrected on ${entry.rowId}. Before ${entry.before}. After ${entry.after}.`;
  }
  if (entry.type === "status_changed") {
    return `Status changed on ${entry.rowId}. Before ${entry.before}. After ${entry.after}.`;
  }
  return `Counts changed on ${entry.rowId}. Before ${entry.before}. After ${entry.after}.`;
}

function TotalsChart({ snapshots }: { snapshots: DataSnapshot[] }) {
  const width = 640;
  const height = 280;
  const pad = { l: 72, r: 16, t: 16, b: 36 };
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;
  const max = Math.max(
    ...snapshots.flatMap((snap) => snap.kinds.map((kind) => kind.countedMW)),
    1,
  );
  const yMax = max * 1.08;
  const xOf = (index: number) =>
    pad.l + (snapshots.length <= 1 ? innerW / 2 : (index / (snapshots.length - 1)) * innerW);
  const yOf = (value: number) => pad.t + innerH - (value / yMax) * innerH;
  const ticks = [0, yMax / 2, yMax];
  const pathFor = (kind: NumberKind) =>
    snapshots
      .map((snap, index) => {
        const row = snap.kinds.find((item) => item.numberKind === kind);
        const mw = row?.countedMW ?? 0;
        return `${index === 0 ? "M" : "L"}${xOf(index).toFixed(1)} ${yOf(mw).toFixed(1)}`;
      })
      .join(" ");

  return (
    <figure className="sig-chart record-chart">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Line chart of counted megawatts for each kind over time. Each kind is its own line. The lines are not stacked and they are not added together."
      >
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={pad.l} x2={width - pad.r} y1={yOf(tick)} y2={yOf(tick)} className="sig-chart__grid" />
            <text x={pad.l - 8} y={yOf(tick) + 4} className="sig-chart__axis" textAnchor="end">
              {formatPower(tick)}
            </text>
          </g>
        ))}
        {SERIES.map((series) => (
          <g key={series.kind}>
            <path
              d={pathFor(series.kind)}
              fill="none"
              stroke={series.color}
              strokeWidth="2.25"
              strokeDasharray={series.dash}
            />
            {snapshots.map((snap, index) => {
              const row = snap.kinds.find((item) => item.numberKind === series.kind);
              return (
                <circle
                  key={`${series.kind}-${snap.date}`}
                  cx={xOf(index)}
                  cy={yOf(row?.countedMW ?? 0)}
                  r="3.2"
                  fill={series.color}
                />
              );
            })}
          </g>
        ))}
        {snapshots.map((snap, index) => (
          <text key={snap.date} x={xOf(index)} y={height - 10} className="sig-chart__axis" textAnchor="middle">
            {formatFullDate(snap.date)}
          </text>
        ))}
      </svg>
      <figcaption className="sig-legend">
        {SERIES.map((series) => {
          const latest = snapshots[snapshots.length - 1]?.kinds.find((item) => item.numberKind === series.kind);
          return (
            <span key={series.kind}>
              <i className="sig-swatch" style={{ background: series.color }} />
              {formatNumberKindShort(series.kind)} {formatPower(latest?.countedMW ?? 0)}
            </span>
          );
        })}
        <span>Each line is one kind. Lines are not stacked and are not added together.</span>
      </figcaption>
    </figure>
  );
}

export default function RecordView() {
  const latest = SNAPSHOTS[SNAPSHOTS.length - 1];

  return (
    <div className="page page--record">
      <header className="page__head">
        <p className="overview__eyebrow">Record</p>
        <h1 className="page__title">History of counted totals</h1>
        <p className="page__lead">
          Each line is one kind of megawatt, taken from the daily snapshot of committed rows. The lines stay separate.
          They are not stacked and they are not added together. Figures of at least 1,000 MW are shown in GW. Smaller
          figures stay in MW. A daily job writes today's snapshot only when the committed data has changed. It does not
          fetch news and it does not edit rows.
        </p>
      </header>

      {latest && (
        <div className="dc-stats" aria-label="Latest counted totals. They are not added together.">
          {latest.kinds.map((kind) => (
            <div className="dc-stat" key={kind.numberKind}>
              <span className="dc-stat__v">{formatPower(kind.countedMW)}</span>
              <span className="dc-stat__l">
                {formatNumberKind(kind.numberKind)}
                <br />
                {kind.countedRows} counted
              </span>
            </div>
          ))}
        </div>
      )}

      {SNAPSHOTS.length > 0 ? <TotalsChart snapshots={SNAPSHOTS} /> : <p className="page__lead">No snapshots yet.</p>}

      <div className="sig-table-wrap">
        <table className="sig-table">
          <caption>Counted megawatts by date and kind. Each column is its own total.</caption>
          <thead>
            <tr>
              <th>Date</th>
              {SERIES.map((series) => (
                <th key={series.kind}>{formatNumberKindShort(series.kind)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SNAPSHOTS.map((snap) => (
              <tr key={snap.date}>
                <td>{formatFullDate(snap.date)}</td>
                {SERIES.map((series) => {
                  const kind = snap.kinds.find((item) => item.numberKind === series.kind);
                  return <td key={series.kind}>{formatPower(kind?.countedMW ?? 0)}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="sig-block">
        <h2>Changelog</h2>
        <div className="record-log">
          {ENTRIES.map((entry) => (
            <article className="record-entry" key={`${entry.date}-${entry.type}-${entry.rowId}`}>
              <div className="record-entry__date">{formatFullDate(entry.date)}</div>
              <div>
                <h3 className="hist-item__title">{changeText(entry)}</h3>
                {entry.note ? <p className="hist-item__desc">{entry.note}</p> : null}
                {entry.sourceUrl ? (
                  <a className="hist-item__src" href={entry.sourceUrl} target="_blank" rel="noopener noreferrer">
                    Source ↗
                  </a>
                ) : null}
              </div>
            </article>
          ))}
          {ENTRIES.length === 0 && <p className="page__lead">No changelog entries yet.</p>}
        </div>
      </section>
    </div>
  );
}
