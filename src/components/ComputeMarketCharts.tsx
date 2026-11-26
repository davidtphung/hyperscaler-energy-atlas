import { useEffect, useMemo, useState } from "react";
import { scaleLinear, scaleTime } from "d3-scale";
import { formatChance, formatPacific, publicDataUrl } from "../lib/computeMarket";
import {
  RANGE_IDS,
  chipFamily,
  filterRange,
  splitGaps,
  validateIndex,
  validateSeries,
  type RangeId,
  type SeriesFile,
  type SeriesIndex,
  type SeriesIndexEntry,
  type SeriesLayer,
  type SeriesPoint,
} from "../lib/computeSeries";

const LAYERS: { id: SeriesLayer; title: string; hint: string }[] = [
  { id: "power", title: "Power", hint: "Electricity, plants, and the grid connection." },
  { id: "it-mw", title: "IT MW", hint: "Claims that name IT load or megawatts of computer demand." },
  { id: "chips", title: "Chips", hint: "Claims that name a GPU or a chip." },
  { id: "gpu-hours", title: "GPU-hours", hint: "A posted price for chip time. Dollars stay dollars." },
  { id: "tokens", title: "Tokens", hint: "Claims that name model output." },
  { id: "land", title: "Land", hint: "Claims that name a site or land." },
  { id: "unplaced", title: "Not placed", hint: "These claims do not name a priced layer, so they stay here." },
];

const CHIP_ORDER = ["H100", "H200", "B200", "B300", "GB200", "GB300", "A100", "GH200", "L40S", "RTX 4090", "Other"];

export default function ComputeMarketCharts() {
  const [index, setIndex] = useState<SeriesIndex | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<RangeId>("Max");
  const [prices, setPrices] = useState<SeriesFile[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancel = false;
    fetch(publicDataUrl("data/compute-market/series/index.json"))
      .then((response) => {
        if (!response.ok) throw new Error(`History index returned ${response.status}`);
        return response.json();
      })
      .then((payload) => {
        if (!cancel) setIndex(validateIndex(payload));
      })
      .catch((reason) => {
        if (!cancel) setError(reason instanceof Error ? reason.message : "History index failed");
      });
    return () => {
      cancel = true;
    };
  }, []);

  useEffect(() => {
    if (!index) return;
    let cancel = false;
    const wanted = index.series.filter((item) => item.history !== "clob");
    Promise.all(wanted.map((item) => loadSeries(item.file)))
      .then((rows) => {
        if (!cancel) setPrices(rows);
      })
      .catch((reason) => {
        if (!cancel) setError(reason instanceof Error ? reason.message : "Price history failed");
      });
    return () => {
      cancel = true;
    };
  }, [index]);

  const claims = useMemo(() => {
    if (!index) return [];
    const needle = query.trim().toLowerCase();
    return index.series.filter((item) => {
      if (item.history !== "clob" || (item.outcome || "").toLowerCase() !== "yes") return false;
      if (!needle) return true;
      return `${item.name} ${item.group || ""}`.toLowerCase().includes(needle);
    });
  }, [index, query]);

  const byChip = useMemo(() => {
    const groups = new Map<string, SeriesFile[]>();
    for (const series of prices) {
      const chip = chipFamily(series.name);
      const list = groups.get(chip) ?? [];
      list.push(series);
      groups.set(chip, list);
    }
    return CHIP_ORDER.filter((chip) => groups.has(chip)).map((chip) => ({
      chip,
      series: (groups.get(chip) ?? []).sort((a, b) => a.name.localeCompare(b.name)),
    }));
  }, [prices]);

  if (error) return <p className="cm-status">{error}</p>;
  if (!index) return <p className="cm-status">Loading price history.</p>;

  return (
    <section className="cm-block" aria-labelledby="cm-history">
      <h2 id="cm-history">Price history</h2>
      <p className="cm-note">
        Each line is one source. Lines are not averaged. A break in a line is a missing point. Nothing is filled in.
        Polymarket uses the public CLOB prices-history feed, interval max, fidelity 720 minutes. Vast, RunPod, and the
        Autoresearch table have no public history feed, so those lines start at the first saved snapshot.
      </p>
      <div className="cm-ranges" role="group" aria-label="Time range">
        {RANGE_IDS.map((id) => (
          <button
            key={id}
            type="button"
            className="cm-range"
            aria-pressed={range === id}
            onClick={() => setRange(id)}
          >
            {id}
          </button>
        ))}
      </div>

      <h3>GPU-hour prices</h3>
      <p className="cm-note">One chart per posted price. A per-minute rate stays per minute.</p>
      {byChip.map((group) => (
        <div className="cm-chip" key={group.chip}>
          <h4>{group.chip}</h4>
          {group.series.map((series) => (
            <article className="cm-chart-card" key={series.id}>
              <h5>{series.name}</h5>
              <LineChart
                lines={[{ name: series.source, color: "var(--signal)", points: series.points }]}
                range={range}
                marker={series.history === "clob" ? "Live now" : "Latest saved"}
                formatValue={(value) => formatValue(value, series.unit)}
              />
              <ChartCredit series={series} />
            </article>
          ))}
        </div>
      ))}

      <h3>Polymarket claims</h3>
      <p className="cm-note">
        <span className="sig-tag">CLAIM</span>
        The line is the implied probability of Yes. The No token is drawn as its own line when the history file has it.
        This is not a fact about the world.
      </p>
      <label className="cm-search-label" htmlFor="cm-history-search">
        Filter history
      </label>
      <input
        id="cm-history-search"
        className="cm-search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search questions"
        type="search"
      />
      <p className="cm-status">{claims.length} claim series</p>
      {claims.map((entry, index) => (
        <ClaimChart key={entry.id} entry={entry} range={range} startOpen={query.trim() !== "" ? index === 0 : index < 3} />
      ))}

      <h3 id="cm-map">Where prices sit</h3>
      <p className="cm-note">
        Each series sits on the layer its question or unit names. Dollars are not turned into megawatts. Hypergrid kind
        totals are not on this map, and they are not added together.
      </p>
      <div className="cm-map">
        {LAYERS.map((layer) => {
          const items = index.series.filter((item) => item.layer === layer.id && (item.outcome == null || item.outcome.toLowerCase() === "yes"));
          return (
            <article className="cm-map__col" key={layer.id}>
              <h4>{layer.title}</h4>
              <p className="cm-note">{layer.hint}</p>
              <p className="cm-status">{items.length} series</p>
              {items.length === 0 ? (
                <p className="cm-note">No series sits here.</p>
              ) : (
                <details open={items.length <= 8}>
                  <summary>Show {items.length}</summary>
                  <ul className="cm-map__list">
                    {items.map((item) => (
                      <li key={item.id}>
                        <span className="sig-tag">{item.label}</span>
                        {item.name}
                        <span className="cm-map__src">{item.source}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ClaimChart({ entry, range, startOpen }: { entry: SeriesIndexEntry; range: RangeId; startOpen: boolean }) {
  const [open, setOpen] = useState(startOpen);
  const [yes, setYes] = useState<SeriesFile | null>(null);
  const [no, setNo] = useState<SeriesFile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setOpen(startOpen);
  }, [startOpen, entry.id]);

  useEffect(() => {
    if (!open || yes) return;
    let cancel = false;
    const noId = entry.id.replace(/-yes$/, "-no");
    Promise.all([
      loadSeries(entry.file),
      fetch(publicDataUrl(`data/compute-market/series/${noId}.json`)).then(async (response) => {
        if (response.status === 404) return null;
        if (!response.ok) throw new Error(`${entry.name} No history returned ${response.status}`);
        return validateSeries(await response.json());
      }),
    ])
      .then(([yesSeries, noSeries]) => {
        if (cancel) return;
        setYes(yesSeries);
        setNo(noSeries);
      })
      .catch((reason) => {
        if (!cancel) setError(reason instanceof Error ? reason.message : "Claim history failed");
      });
    return () => {
      cancel = true;
    };
  }, [open, entry.file, entry.id, entry.name, yes]);

  return (
    <details
      className="cm-market"
      open={open}
      onToggle={(event) => setOpen((event.currentTarget as HTMLDetailsElement).open)}
    >
      <summary>{entry.name}</summary>
      {open && error && <p className="cm-status">{error}</p>}
      {open && !error && !yes && <p className="cm-status">Loading this history.</p>}
      {open && yes && (
        <>
          <LineChart
            lines={[
              { name: "Yes", color: "var(--signal)", points: yes.points },
              ...(no ? [{ name: "No", color: "#7fc4ec", points: no.points }] : []),
            ]}
            range={range}
            marker="Live now"
            formatValue={(value) => formatChance(value)}
          />
          <ChartCredit series={yes} />
        </>
      )}
    </details>
  );
}

function ChartCredit({ series }: { series: SeriesFile }) {
  const last = series.points[series.points.length - 1];
  return (
    <>
      <p className="cm-note">
        <span className="sig-tag">{series.label}</span>
        Source: <a href={series.url}>{series.source}</a>
        . As of {formatPacific(new Date(last.t).toISOString())}.
      </p>
      {series.history_note && <p className="cm-note">{series.history_note}</p>}
    </>
  );
}

function LineChart({
  lines,
  range,
  marker,
  formatValue,
}: {
  lines: { name: string; color: string; points: SeriesPoint[] }[];
  range: RangeId;
  marker: string;
  formatValue: (value: number) => string;
}) {
  const shown = lines
    .map((line) => ({ ...line, points: filterRange(line.points, range) }))
    .filter((line) => line.points.length > 0);
  if (shown.length === 0) return <p className="cm-status">No points in this range.</p>;
  const flat = shown.flatMap((line) => line.points);
  const t0 = Math.min(...flat.map((point) => point.t));
  const t1 = Math.max(...flat.map((point) => point.t));
  const v0 = Math.min(...flat.map((point) => point.v));
  const v1 = Math.max(...flat.map((point) => point.v));
  const padSpan = v1 === v0 ? Math.max(Math.abs(v1) * 0.08, 0.01) : (v1 - v0) * 0.12;
  const width = 640;
  const height = 220;
  const pad = { l: 128, r: 16, t: 20, b: 34 };
  const sameDay = axisDay(t0) === axisDay(t1);
  const x = scaleTime()
    .domain([new Date(t0), new Date(t1 === t0 ? t0 + 60_000 : t1)])
    .range([pad.l, width - pad.r]);
  const y = scaleLinear()
    .domain([v0 - padSpan, v1 + padSpan])
    .range([height - pad.b, pad.t]);
  const latestT = Math.max(...lines.flatMap((line) => line.points.map((point) => point.t)));
  const markerPoint = flat.find((point) => point.t === latestT) ?? null;
  const single = flat.length === 1;

  return (
    <figure className="cm-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Price history chart">
        <line x1={pad.l} y1={height - pad.b} x2={width - pad.r} y2={height - pad.b} className="cm-chart__axis" />
        {(v0 === v1 ? [v0] : [v0, v1]).map((value) => (
          <text key={value} x={pad.l - 8} y={y(value) + 4} className="cm-chart__tick" textAnchor="end">
            {formatValue(value)}
          </text>
        ))}
        {sameDay ? (
          <text x={(pad.l + width - pad.r) / 2} y={height - 8} className="cm-chart__tick" textAnchor="middle">
            {axisDay(t0)}
          </text>
        ) : (
          <>
            <text x={pad.l} y={height - 8} className="cm-chart__tick" textAnchor="start">
              {axisDay(t0)}
            </text>
            <text x={width - pad.r} y={height - 8} className="cm-chart__tick" textAnchor="end">
              {axisDay(t1)}
            </text>
          </>
        )}
        {shown.map((line) =>
          splitGaps(line.points).map((segment, index) =>
            segment.length > 1 ? (
              <polyline
                key={`${line.name}-${index}`}
                fill="none"
                stroke={line.color}
                strokeWidth="2"
                points={segment.map((point) => `${x(new Date(point.t))},${y(point.v)}`).join(" ")}
              />
            ) : null,
          ),
        )}
        {shown.flatMap((line) =>
          line.points.map((point) => (
            <circle key={`${line.name}-${point.t}`} cx={x(new Date(point.t))} cy={y(point.v)} r={single ? 4 : 2.5} fill={line.color} />
          )),
        )}
        {markerPoint && (
          <text
            x={Math.min(x(new Date(markerPoint.t)) + 6, width - pad.r)}
            y={Math.max(y(markerPoint.v) - 8, 14)}
            className="cm-chart__live"
            textAnchor={x(new Date(markerPoint.t)) > width - 90 ? "end" : "start"}
          >
            {marker}
          </text>
        )}
      </svg>
      <ul className="cm-chart__legend">
        {shown.map((line) => (
          <li key={line.name}>
            <span className="cm-chart__swatch" style={{ background: line.color }} />
            {line.name}
          </li>
        ))}
      </ul>
      {single && <p className="cm-note">One point. No line is drawn.</p>}
    </figure>
  );
}

function axisDay(ms: number): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(ms));
}

function formatValue(value: number, unit: string): string {
  if (unit === "implied probability") return formatChance(value);
  if (/minute/i.test(unit)) return `$${trimNumber(value)}/min`;
  return `$${trimNumber(value)}`;
}

function trimNumber(value: number): string {
  const digits = Math.abs(value) >= 100 ? 2 : 4;
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: digits });
}

async function loadSeries(file: string): Promise<SeriesFile> {
  const response = await fetch(publicDataUrl(`data/compute-market/series/${file}`));
  if (!response.ok) throw new Error(`${file} returned ${response.status}`);
  return validateSeries(await response.json());
}
