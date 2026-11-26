import { useEffect, useId, useMemo, useRef, useState } from "react";
import { scaleLinear, scaleTime } from "d3-scale";
import { formatChance, formatPacific, formatVolume, publicDataUrl, type PolyMarket } from "../lib/computeMarket";
import {
  RANGE_IDS,
  chipFamily,
  filterRange,
  marketRank,
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
  const [claimWindow, setClaimWindow] = useState(12);

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
        Polymarket uses the public CLOB prices-history feed, interval max, fidelity 720 minutes. Lambda, CoreWeave, and
        the SF Compute from-price are read from Wayback snapshots. RunPod and Lambda catalog history is the CC BY 4.0
        gpu-price-history panel. Vast and the Autoresearch node table have no older public page that parsed, so those
        lines start at the first saved snapshot.
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
            <PriceCard key={series.id} series={series} range={range} />
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
        onChange={(event) => {
          setQuery(event.target.value);
          setClaimWindow(12);
        }}
        placeholder="Search questions"
        type="search"
      />
      <p className="cm-status">{claims.length} claim series</p>
      {claims.slice(0, claimWindow).map((entry) => (
        <ClaimChart key={entry.id} entry={entry} range={range} startOpen={false} />
      ))}
      {claimWindow < claims.length && (
        <button type="button" className="cm-more" onClick={() => setClaimWindow((count) => count + 12)}>
          Show more
        </button>
      )}

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

function PriceCard({ series, range }: { series: SeriesFile; range: RangeId }) {
  const [open, setOpen] = useState(false);
  return (
    <details className="cm-market" open={open} onToggle={(event) => setOpen((event.currentTarget as HTMLDetailsElement).open)}>
      <summary>{series.name}</summary>
      {open && (
        <>
          <LineChart
            lines={[{ name: lineLabel(series), color: sourceColor(series), points: series.points, joinAt: series.live_start, gapMs: gapMsFor(series) }]}
            range={range}
            marker={series.points[series.points.length - 1]?.origin === "live" ? "Live now" : "Latest saved"}
            formatValue={(value) => formatValue(value, series.unit)}
            curve="monotone"
            label={series.name}
          />
          <ChartCredit series={series} />
        </>
      )}
    </details>
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
            curve="step"
            label={entry.name}
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
  curve,
  label,
  unitLabel,
}: {
  lines: { name: string; color: string; points: SeriesPoint[]; joinAt?: number | null; gapMs?: number }[];
  range: RangeId;
  marker: string;
  formatValue: (value: number) => string;
  curve: "monotone" | "step";
  label: string;
  unitLabel?: string;
}) {
  const gradId = useId().replace(/:/g, "");
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [boxW, setBoxW] = useState(0);
  const shown = lines
    .map((line) => ({ ...line, points: filterRange(line.points, range) }))
    .filter((line) => line.points.length > 0);
  const hasLines = shown.length > 0;
  useEffect(() => {
    const node = svgRef.current;
    if (!node) return;
    const measure = () => {
      const next = Math.round(node.clientWidth);
      if (next > 0) setBoxW((prev) => (prev === next ? prev : next));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasLines]);
  if (!hasLines) return <p className="cm-status">No points in this range.</p>;
  const flat = shown.flatMap((line) => line.points);
  const t0 = Math.min(...flat.map((point) => point.t));
  const t1 = Math.max(...flat.map((point) => point.t));
  const v0 = Math.min(...flat.map((point) => point.v));
  const v1 = Math.max(...flat.map((point) => point.v));
  const padSpan = v1 === v0 ? Math.max(Math.abs(v1) * 0.08, 0.01) : (v1 - v0) * 0.12;
  const ticks = v0 === v1 ? [v0] : [v0, (v0 + v1) / 2, v1];
  const width = boxW || 640;
  const height = Math.max(200, Math.min(280, Math.round(width * 0.46)));
  let labelChars = 0;
  for (const value of ticks) labelChars = Math.max(labelChars, formatValue(value).length);
  const pad = { l: Math.max(64, labelChars * 8 + 16), r: 72, t: 22, b: 36 };
  const x = scaleTime()
    .domain([new Date(t0), new Date(t1 === t0 ? t0 + 60_000 : t1)])
    .range([pad.l, width - pad.r]);
  const y = scaleLinear()
    .domain([v0 - padSpan, v1 + padSpan])
    .range([height - pad.b, pad.t]);
  let latest = flat[0];
  for (const point of flat) {
    if (point.t > latest.t) latest = point;
  }
  const latestLine = shown.find((line) => line.points.some((point) => point.t === latest.t)) ?? shown[0];
  const single = flat.length === 1;
  const hoverPoint = hover == null ? null : nearestPoint(flat, hover);
  const tipLeft = hoverPoint ? Math.min(Math.max((x(new Date(hoverPoint.t)) / width) * 100, 4), 68) : 0;
  const livePulse = marker === "Live now";

  function readPointer(clientX: number) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    const px = ((clientX - rect.left) / rect.width) * width;
    const date = x.invert(px);
    setHover(date.getTime());
  }

  function moveHover(step: number) {
    const ordered = flat.slice().sort((a, b) => a.t - b.t);
    const current = hoverPoint ? ordered.findIndex((point) => point.t === hoverPoint.t) : ordered.length - 1;
    const next = ordered[Math.min(Math.max(current + step, 0), ordered.length - 1)];
    if (next) setHover(next.t);
  }

  const described = `${label}. ${shown.map((line) => line.name).join(", ")}. Latest ${formatValue(latest.v)} on ${axisDay(latest.t)}.`;

  return (
    <figure className="cm-chart">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={described}
        tabIndex={0}
        onPointerDown={(event) => readPointer(event.clientX)}
        onPointerMove={(event) => {
          if (event.pointerType === "mouse" || event.buttons === 1) readPointer(event.clientX);
        }}
        onPointerLeave={() => setHover(null)}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") {
            event.preventDefault();
            moveHover(1);
          }
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            moveHover(-1);
          }
        }}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={shown[0].color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={shown[0].color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((value) => (
          <line
            key={value}
            x1={pad.l}
            y1={y(value)}
            x2={width - pad.r}
            y2={y(value)}
            className="cm-chart__grid"
          />
        ))}
        {ticks.map((value) => (
          <text key={`t-${value}`} x={pad.l - 8} y={y(value) + 4} className="cm-chart__tick" textAnchor="end">
            {formatValue(value)}
          </text>
        ))}
        <text x={pad.l} y={height - 10} className="cm-chart__tick" textAnchor="start">
          {axisDay(t0)}
        </text>
        {axisDay(t0) !== axisDay(t1) && (
          <text x={width - pad.r} y={height - 10} className="cm-chart__tick" textAnchor="end">
            {axisDay(t1)}
          </text>
        )}
        {shown.map((line) => {
          const segments = splitGaps(line.points, line.gapMs).filter((segment) => segment.length > 1);
          return segments.map((segment, index) => {
            const path = curvePath(segment.map((point) => ({ x: x(new Date(point.t)), y: y(point.v) })), curve);
            const first = segment[0];
            const last = segment[segment.length - 1];
            const area = `${path} L${x(new Date(last.t))},${y.range()[0]} L${x(new Date(first.t))},${y.range()[0]} Z`;
            return (
              <g key={`${line.name}-${index}`}>
                {index === 0 && line === shown[0] && <path d={area} fill={`url(#${gradId})`} stroke="none" />}
                <path d={path} fill="none" stroke={line.color} className="cm-chart__line" />
              </g>
            );
          });
        })}
        {shown.map((line) => {
          if (line.joinAt == null) return null;
          const before = line.points.some((point) => point.t < line.joinAt!);
          const after = line.points.some((point) => point.t >= line.joinAt!);
          if (!before || !after) return null;
          const joinX = x(new Date(line.joinAt));
          return <line key={`${line.name}-join`} x1={joinX} y1={pad.t} x2={joinX} y2={height - pad.b} className="cm-chart__joinline" />;
        })}
        {shown.some((line) => line.joinAt != null && line.points.some((point) => point.t < (line.joinAt ?? 0)) && line.points.some((point) => point.t >= (line.joinAt ?? 0))) && (
          <text x={(pad.l + width - pad.r) / 2} y={14} textAnchor="middle" className="cm-chart__join">
            Live begins
          </text>
        )}
        {hoverPoint && (
          <line x1={x(new Date(hoverPoint.t))} y1={pad.t} x2={x(new Date(hoverPoint.t))} y2={height - pad.b} className="cm-chart__cross" />
        )}
        <circle cx={x(new Date(latest.t))} cy={y(latest.v)} r="3.2" fill={latestLine.color} />
        {livePulse && <circle cx={x(new Date(latest.t))} cy={y(latest.v)} r="3.2" fill="none" stroke={latestLine.color} className="cm-live-ring" />}
        <text
          x={Math.min(x(new Date(latest.t)) + 8, width - 8)}
          y={Math.max(y(latest.v) - 8, 16)}
          className="cm-chart__end"
          textAnchor={x(new Date(latest.t)) > width - 90 ? "end" : "start"}
        >
          {formatValue(latest.v)}
        </text>
      </svg>
      {hoverPoint && (
        <div className="cm-tip" style={{ left: `${tipLeft}%` }} role="status">
          <p>{axisDay(hoverPoint.t)}</p>
          <p>
            <span className="cm-chart__swatch" style={{ background: nearestLine(shown, hoverPoint).color }} />
            {nearestLine(shown, hoverPoint).name}
          </p>
          <p>
            {formatValue(hoverPoint.v)}
            {unitLabel ? ` ${unitLabel}` : ""}
          </p>
        </div>
      )}
      <ul className="cm-chart__legend">
        {shown.map((line) => (
          <li key={line.name}>
            <span className="cm-chart__swatch" style={{ background: line.color }} />
            {line.name}
          </li>
        ))}
      </ul>
      <p className="cm-note">{single ? "One point. No line is drawn." : marker === "Live now" ? "Drag or use arrow keys to read a point. Live now marks the latest odds." : "Drag or use arrow keys to read a point."}</p>
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

const FRESH_MS = 48 * 60 * 60 * 1000;

function unitTitle(unit: string): string {
  const count = unit.match(/(\d+) GPU/);
  if (unit.includes("node-hour")) return count ? `per node-hour (${count[1]} GPU)` : "per node-hour";
  if (/minute/i.test(unit)) return "per minute";
  return "per GPU-hour";
}

function isFresh(series: SeriesFile): boolean {
  const last = series.points[series.points.length - 1];
  return Boolean(last) && Date.now() - last.t <= FRESH_MS;
}

function trimNumber(value: number): string {
  const digits = Math.abs(value) >= 100 ? 2 : 4;
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: digits });
}

function curvePath(points: { x: number; y: number }[], curve: "monotone" | "step"): string {
  if (points.length < 2) return "";
  if (curve === "step") {
    let path = `M${points[0].x},${points[0].y}`;
    for (let i = 1; i < points.length; i += 1) path += ` H${points[i].x} V${points[i].y}`;
    return path;
  }
  const n = points.length;
  const slope: number[] = [];
  for (let i = 0; i < n - 1; i += 1) {
    const dx = points[i + 1].x - points[i].x;
    slope.push(dx === 0 ? 0 : (points[i + 1].y - points[i].y) / dx);
  }
  const tangent = new Array<number>(n).fill(0);
  tangent[0] = slope[0];
  tangent[n - 1] = slope[n - 2];
  for (let i = 1; i < n - 1; i += 1) {
    tangent[i] = slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2;
  }
  for (let i = 0; i < n - 1; i += 1) {
    if (Math.abs(slope[i]) < 1e-9) {
      tangent[i] = 0;
      tangent[i + 1] = 0;
      continue;
    }
    const a = tangent[i] / slope[i];
    const b = tangent[i + 1] / slope[i];
    const hypot = a * a + b * b;
    if (hypot > 9) {
      const scale = 3 / Math.sqrt(hypot);
      tangent[i] = scale * a * slope[i];
      tangent[i + 1] = scale * b * slope[i];
    }
  }
  let path = `M${points[0].x},${points[0].y}`;
  for (let i = 0; i < n - 1; i += 1) {
    const dx = (points[i + 1].x - points[i].x) / 3;
    path += ` C${points[i].x + dx},${points[i].y + tangent[i] * dx} ${points[i + 1].x - dx},${points[i + 1].y - tangent[i + 1] * dx} ${points[i + 1].x},${points[i + 1].y}`;
  }
  return path;
}

function nearestPoint(points: SeriesPoint[], t: number): SeriesPoint {
  let best = points[0];
  let bestGap = Math.abs(points[0].t - t);
  for (const point of points) {
    const gap = Math.abs(point.t - t);
    if (gap < bestGap) {
      best = point;
      bestGap = gap;
    }
  }
  return best;
}

function nearestLine(
  lines: { name: string; color: string; points: SeriesPoint[] }[],
  point: SeriesPoint,
): { name: string; color: string } {
  for (const line of lines) {
    if (line.points.some((item) => item.t === point.t && item.v === point.v)) return line;
  }
  return lines[0];
}

const SOURCE_COLOR: Record<string, string> = {
  "Vast.ai": "#d6ef6a",
  RunPod: "#8ec8ef",
  "SF Compute Autoresearch": "#f0b56a",
  "SF Compute": "#f0b56a",
  "SF Compute changelog": "#d7b0f0",
  "SF Compute homepage sample": "#e7c98a",
  Lambda: "#8ee0c2",
  CoreWeave: "#f3a7a0",
  "gpu-price-history": "#b7c0ff",
};

function sourceColor(series: SeriesFile): string {
  if (lane(series) === "community") return "#6eb0dd";
  if (lane(series) === "from") return "#e09a45";
  if (series.history === "dataset") {
    const who = (series.group || "").toLowerCase();
    if (who.includes("lambda")) return "#8ee0c2";
    if (who.includes("runpod")) return "#8ec8ef";
  }
  return SOURCE_COLOR[series.source] ?? "#f1efe8";
}

function Sparkline({ points, color }: { points: SeriesPoint[]; color: string }) {
  if (points.length < 2) return null;
  const width = 160;
  const height = 36;
  const min = Math.min(...points.map((point) => point.v));
  const max = Math.max(...points.map((point) => point.v));
  const span = max - min || 1;
  const t0 = points[0].t;
  const t1 = points[points.length - 1].t || t0 + 1;
  const plotted = points.map((point) => ({
    x: ((point.t - t0) / (t1 - t0)) * width,
    y: height - 4 - ((point.v - min) / span) * (height - 8),
  }));
  return (
    <svg className="cm-spark" viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <path d={curvePath(plotted, "step")} fill="none" stroke={color} />
    </svg>
  );
}

async function loadSeries(file: string): Promise<SeriesFile> {
  const response = await fetch(publicDataUrl(`data/compute-market/series/${file}`));
  if (!response.ok) throw new Error(`${file} returned ${response.status}`);
  return validateSeries(await response.json());
}

const TILE_CHIPS = ["H100", "H200", "B200", "B300"];
const HERO_CHIPS = ["H100", "H200", "B200"];
const LINE_COLORS = ["#c8f135", "#7fc4ec", "#f0a35e", "#d98cff", "#8ee0c2", "#f2d16b", "#f28b82"];

function hourly(series: SeriesFile): boolean {
  return /hour/i.test(series.unit) && !/minute/i.test(series.unit);
}

function lane(series: SeriesFile): string {
  if (series.id.includes("community")) return "community";
  if (series.id.includes("secure")) return "secure";
  if (series.history === "dataset") return series.group || "dataset";
  if (series.id.startsWith("sf-archive")) return "from";
  return "posted";
}

function seriesScore(series: SeriesFile): number {
  const name = `${series.id} ${series.name}`.toLowerCase();
  let score = series.points.length;
  if (/1x|1gpu|1-gpu|-1$|h100-1|h200-1|b200-1|b300-1/.test(name)) score += 1000;
  if (series.history === "joined" || series.history === "snapshot") score += 200;
  if (series.history === "archive") score += 50;
  if (lane(series) === "community" || lane(series) === "from") score -= 30;
  return score;
}

function onePerSource(rows: SeriesFile[]): SeriesFile[] {
  const picked = new Map<string, SeriesFile>();
  for (const series of rows) {
    const key = `${series.source}|${lane(series)}`;
    const prior = picked.get(key);
    if (!prior || seriesScore(series) > seriesScore(prior)) picked.set(key, series);
  }
  return [...picked.values()].sort((a, b) => a.source.localeCompare(b.source) || a.name.localeCompare(b.name));
}

function lineLabel(series: SeriesFile): string {
  const kind = lane(series);
  if (series.history === "dataset") {
    const who = series.group ? series.group.charAt(0).toUpperCase() + series.group.slice(1) : "Catalog";
    return `${who} catalog`;
  }
  if (kind === "secure" || kind === "community" || kind === "from") return `${series.source} ${kind}`;
  return series.source;
}

function gapMsFor(series: SeriesFile): number | undefined {
  if (series.history === "dataset") return 45 * 24 * 60 * 60 * 1000;
  if (series.history === "archive" || series.history === "joined") return 10 * 24 * 60 * 60 * 1000;
  return undefined;
}

function changeChip(series: SeriesFile): { text: string; dir: "up" | "down" | "flat" } {
  const first = series.points[0];
  const last = series.points[series.points.length - 1];
  if (!first || !last || series.points.length < 2 || first.v === last.v) return { text: "Flat", dir: "flat" };
  const delta = last.v - first.v;
  if (first.v === 0) return { text: delta > 0 ? "Up" : "Down", dir: delta > 0 ? "up" : "down" };
  const pct = `${delta > 0 ? "+" : ""}${((delta / first.v) * 100).toFixed(1)}%`;
  return { text: pct, dir: delta > 0 ? "up" : "down" };
}

function topMarkets(markets: PolyMarket[]): PolyMarket[] {
  const rank = (market: PolyMarket) => marketRank(market.question, market.eventTitle);
  const byVolume = (a: PolyMarket, b: PolyMarket) => (b.volumeUsd ?? -1) - (a.volumeUsd ?? -1);
  const relevant = markets.filter((market) => rank(market) < 4).sort(byVolume);
  const rest = markets.filter((market) => rank(market) >= 4).sort(byVolume);
  const picked: PolyMarket[] = [];
  const seen = new Set<string>();
  for (const market of [...relevant, ...rest]) {
    if (seen.has(market.id)) continue;
    seen.add(market.id);
    picked.push(market);
    if (picked.length === 8) break;
  }
  return picked;
}

export function ComputeDashboard({ markets, asOf }: { markets: PolyMarket[]; asOf: string | null }) {
  const [index, setIndex] = useState<SeriesIndex | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<RangeId>("Max");
  const [prices, setPrices] = useState<SeriesFile[]>([]);
  const [claims, setClaims] = useState<SeriesFile[]>([]);
  const featured = useMemo(() => topMarkets(markets), [markets]);
  const featuredKey = featured.map((market) => market.id).join("|");

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
    const wanted = index.series.filter((item) => item.history !== "clob" && item.layer === "gpu-hours");
    Promise.all(wanted.map((item) => loadSeries(item.file)))
      .then((rows) => {
        if (!cancel) setPrices(rows.filter(hourly));
      })
      .catch((reason) => {
        if (!cancel) setError(reason instanceof Error ? reason.message : "Price history failed");
      });
    return () => {
      cancel = true;
    };
  }, [index]);

  useEffect(() => {
    if (!featuredKey) {
      setClaims([]);
      return;
    }
    let cancel = false;
    Promise.all(
      featured.map((market) =>
        loadSeries(`polymarket-${market.id}-yes.json`).catch(() => null),
      ),
    ).then((rows) => {
      if (!cancel) setClaims(rows.filter((row): row is SeriesFile => row != null));
    });
    return () => {
      cancel = true;
    };
  }, [featuredKey, featured]);

  const tiles = useMemo(
    () =>
      TILE_CHIPS.map((chip) => ({
        chip,
        series: onePerSource(prices.filter((series) => chipFamily(series.name) === chip)),
      })),
    [prices],
  );

  if (error) return <p className="cm-status">{error}</p>;
  if (!index) return <p className="cm-status">Loading the dashboard.</p>;

  const liveTiles = tiles.map((group) => ({ chip: group.chip, series: group.series.filter((series) => isFresh(series)) }));
  const archivedTiles = tiles.map((group) => ({ chip: group.chip, series: group.series.filter((series) => !isFresh(series)) }));
  const liveCount = liveTiles.filter((group) => group.series.length > 0).length;

  return (
    <section className="cm-block" aria-labelledby="cm-dashboard">
      <h2 id="cm-dashboard" className="cm-kicker">Charts</h2>
      <div className="cm-ranges cm-ranges--sticky" role="group" aria-label="Dashboard time range">
        {RANGE_IDS.map((id) => (
          <button key={id} type="button" className="cm-range" aria-pressed={range === id} onClick={() => setRange(id)}>
            {id}
          </button>
        ))}
      </div>

      {HERO_CHIPS.map((chip) => {
        const lines = onePerSource(prices.filter((series) => chipFamily(series.name) === chip));
        const units: string[] = [];
        for (const series of lines) {
          const phrase = unitTitle(series.unit);
          if (!units.includes(phrase)) units.push(phrase);
        }
        if (lines.length === 0) {
          return (
            <article className="cm-chart-card cm-hero" key={chip}>
              <h3>{chip}</h3>
              <p className="cm-status">No hourly history for this chip.</p>
            </article>
          );
        }
        return units.map((phrase) => {
          const group = lines.filter((series) => unitTitle(series.unit) === phrase);
          const unit = group[0].unit;
          return (
            <article className="cm-chart-card cm-hero" key={`${chip}-${unit}`}>
              <h3>
                {chip} {phrase}
              </h3>
              <p className="cm-note">Each line is one source. Lines are not averaged. A break is a missing point.</p>
              <LineChart
                lines={group.map((series) => ({
                  name: lineLabel(series),
                  color: sourceColor(series),
                  points: series.points,
                  joinAt: series.live_start,
                  gapMs: gapMsFor(series),
                }))}
                range={range}
                marker="Latest saved"
                formatValue={(value) => formatValue(value, unit)}
                curve="monotone"
                label={`${chip} ${phrase}`}
                unitLabel={phrase}
              />
              <details className="cm-market">
                <summary>Sources for this chart</summary>
                {group.map((series) => (
                  <ChartCredit key={series.id} series={series} />
                ))}
              </details>
            </article>
          );
        });
      })}

      <article className="cm-chart-card cm-hero">
        <h3>Top market odds</h3>
        <p className="cm-note">
          <span className="sig-tag">CLAIM</span>
          Each line is the Yes price from the CLOB history. The No token stays in the list below.
        </p>
        {claims.length === 0 ? (
          <p className="cm-status">No claim history is loaded yet.</p>
        ) : (
          <LineChart
            lines={claims.map((series, index) => ({
              name: series.name,
              color: LINE_COLORS[index % LINE_COLORS.length],
              points: series.points,
            }))}
            range={range}
            marker="Live now"
            formatValue={(value) => formatChance(value)}
            curve="step"
            label="Top market odds"
          />
        )}
        {claims.map((series) => (
          <ChartCredit key={series.id} series={series} />
        ))}
      </article>

      <h3>Live now</h3>
      <p className="cm-note">A tile is here only when its latest point is under 48 hours old. Sources are not averaged.</p>
      {liveCount === 0 && <p className="cm-status">No price in the last 48 hours.</p>}
      {liveTiles.map((group) =>
        group.series.length === 0 ? null : (
          <div className="cm-chip" key={`live-${group.chip}`}>
            <h4>{group.chip}</h4>
            <PriceTiles series={group.series} />
          </div>
        ),
      )}

      <h3>Last archived price</h3>
      <p className="cm-note">These latest points are older than 48 hours. The date is when that price was posted. The same series stays in the chart above.</p>
      {archivedTiles.map((group) =>
        group.series.length === 0 ? null : (
          <div className="cm-chip" key={`arch-${group.chip}`}>
            <h4>{group.chip}</h4>
            <PriceTiles series={group.series} archived />
          </div>
        ),
      )}

      <h3>Market cards</h3>
      <p className="cm-note">
        <span className="sig-tag">CLAIM</span>
        The top compute, AI capex, chip, and data center markets, by volume. A chance is not a fact about the world.
      </p>
      {featured.length === 0 && <p className="cm-status">Loading Polymarket odds.</p>}
      <div className="cm-cards">
        {featured.map((market) => {
          const history = claims.find((series) => series.id === `polymarket-${market.id}-yes`);
          return (
            <article className="cm-card" key={market.id}>
              <p className="cm-card__label">{market.eventTitle}</p>
              <h4 className="cm-card__q">{market.question}</h4>
              <p className="cm-card__odds">{formatChance(market.probability)}</p>
              {history && history.points.length > 1 ? <Sparkline points={history.points} color="#d6ef6a" /> : <span className="cm-spark cm-spark--empty" />}
              <p className="cm-card__meta">{market.volumeUsd == null ? "Volume unavailable" : `Volume ${formatVolume(market.volumeUsd)}`}</p>
              <p className="cm-card__meta">{market.endDate ? `Ends ${formatPacific(market.endDate)}` : "End date unavailable"}</p>
              <p className="cm-card__src">
                <span className="sig-tag">CLAIM</span>
                <a href={market.url}>Polymarket</a>
                {asOf ? `. As of ${formatPacific(asOf)}.` : ". As of time unavailable."}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function PriceTiles({ series, archived }: { series: SeriesFile[]; archived?: boolean }) {
  return (
    <div className="cm-kpis">
      {series.map((item) => {
        const last = item.points[item.points.length - 1];
        const delta = changeChip(item);
        return (
          <article className={archived ? "cm-kpi cm-kpi--archived" : "cm-kpi"} key={item.id}>
            <p className="cm-kpi__value">{formatValue(last.v, item.unit)}</p>
            <p className="cm-kpi__unit">{unitTitle(item.unit)}</p>
            <p className={`cm-kpi__delta cm-kpi__delta--${delta.dir}`}>{delta.text}</p>
            <p className="cm-kpi__src">
              <span className="sig-tag">{item.label}</span>
              <span className="cm-kpi__who">{item.source}</span>
              <a href={last.url || item.url}>{item.name}</a>
            </p>
            <p className="cm-kpi__time">As of {formatPacific(new Date(last.t).toISOString())}.</p>
          </article>
        );
      })}
    </div>
  );
}
