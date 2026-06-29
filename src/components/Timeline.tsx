import { useMemo, useRef } from "react";
import type { PreparedCommitment } from "../types";
import { techColor } from "../lib/theme";
import { radiusForCapacity } from "../lib/scales";
import { formatGW, formatMonthYear } from "../lib/format";
import { useElementSize } from "../lib/hooks";

interface Props {
  /** Facet-filtered commitments (drives dots + cumulative curve). */
  commitments: PreparedCommitment[];
  minT: number;
  maxT: number;
  scrubT: number;
  onScrub: (t: number) => void;
  playing: boolean;
  onTogglePlay: () => void;
  speed: number;
  onSetSpeed: (s: number) => void;
  onLive: () => void;
  onReset: () => void;
  atLive: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  cumulativeGW: number;
  countInRange: number;
}

const PAD_L = 10;
const PAD_R = 10;
const DAY = 86_400_000;

const SPEEDS: { v: number; label: string }[] = [
  { v: 1, label: "1mo/s" },
  { v: 6, label: "6mo/s" },
  { v: 12, label: "1yr/s" },
];

export default function Timeline({
  commitments,
  minT,
  maxT,
  scrubT,
  onScrub,
  playing,
  onTogglePlay,
  speed,
  onSetSpeed,
  onLive,
  onReset,
  atLive,
  selectedId,
  onSelect,
  cumulativeGW,
  countInRange,
}: Props) {
  const { ref, width, height } = useElementSize<HTMLDivElement>();
  const dragging = useRef(false);

  const innerW = Math.max(1, width - PAD_L - PAD_R);
  const span = Math.max(1, maxT - minT);
  const baselineY = height - 18;
  const areaTop = 8;

  const xFor = (t: number) => PAD_L + ((t - minT) / span) * innerW;
  const tFor = (clientX: number, rect: DOMRect) => {
    const px = clientX - rect.left - PAD_L;
    return Math.max(minT, Math.min(maxT, minT + (px / innerW) * span));
  };

  // Cumulative committed capacity over time (the buildout curve).
  const { areaPath, linePath } = useMemo(() => {
    const sorted = [...commitments].sort((a, b) => a.t - b.t);
    let acc = 0;
    const steps: { t: number; v: number }[] = [{ t: minT, v: 0 }];
    for (const c of sorted) {
      acc += c.capacityMW ?? 0;
      steps.push({ t: c.t, v: acc });
    }
    steps.push({ t: maxT, v: acc });
    const maxCum = Math.max(acc, 1);
    const yFor = (v: number) => baselineY - (v / maxCum) * (baselineY - areaTop);

    let line = "";
    let prevV = 0;
    for (let i = 0; i < steps.length; i++) {
      const s = steps[i];
      const x = xFor(s.t);
      if (i === 0) line += `M${x},${yFor(0)}`;
      else line += `L${x},${yFor(prevV)} L${x},${yFor(s.v)}`;
      prevV = s.v;
    }
    const lastX = xFor(maxT);
    const area = `${line} L${lastX},${baselineY} L${xFor(minT)},${baselineY} Z`;
    return { areaPath: area, linePath: line };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commitments, minT, maxT, width, height]);

  // Year gridlines.
  const ticks = useMemo(() => {
    const out: { x: number; label: string }[] = [];
    const y0 = new Date(minT).getUTCFullYear();
    const y1 = new Date(maxT).getUTCFullYear();
    for (let y = y0; y <= y1; y++) {
      const t = Date.UTC(y, 0, 1);
      if (t < minT - DAY * 120 || t > maxT + DAY * 120) continue;
      out.push({ x: xFor(Math.max(minT, t)), label: String(y) });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minT, maxT, width]);

  const scrubX = xFor(scrubT);

  const startDrag = (e: React.PointerEvent) => {
    if ((e.target as Element).closest(".tl-dot")) return; // let dots handle selection
    dragging.current = true;
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    onScrub(tFor(e.clientX, rect));
  };
  const moveDrag = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    onScrub(tFor(e.clientX, rect));
  };
  const endDrag = () => {
    dragging.current = false;
  };

  const step = (deltaDays: number) => onScrub(Math.max(minT, Math.min(maxT, scrubT + deltaDays * DAY)));

  const onKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowRight": e.preventDefault(); step(30); break;
      case "ArrowLeft": e.preventDefault(); step(-30); break;
      case "PageUp": e.preventDefault(); step(180); break;
      case "PageDown": e.preventDefault(); step(-180); break;
      case "Home": e.preventDefault(); onScrub(minT); break;
      case "End": e.preventDefault(); onScrub(maxT); break;
    }
  };

  return (
    <section className="timeline" aria-label="Timeline">
      <div className="timeline__head">
        <div className="tl-controls" role="group" aria-label="Timeline playback">
          <button
            className="tlc-icon"
            onClick={onTogglePlay}
            aria-pressed={playing}
            aria-label={playing ? "Pause playback" : "Play playback"}
          >
            {playing ? (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="5" width="4" height="14" rx="1" />
                <rect x="14" y="5" width="4" height="14" rx="1" />
              </svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7 5l12 7-12 7z" />
              </svg>
            )}
          </button>

          <button className="tlc-seg" aria-pressed={atLive && !playing} onClick={onLive}>
            Live
          </button>

          {SPEEDS.map((s) => (
            <button
              key={s.v}
              className="tlc-seg"
              aria-pressed={playing && speed === s.v}
              aria-label={`Play at ${s.label.replace("mo/s", " months per second").replace("yr/s", " year per second")}`}
              onClick={() => onSetSpeed(s.v)}
            >
              {s.label}
            </button>
          ))}

          <span className="tlc-div" aria-hidden="true" />
          <span className="tlc-clock" aria-hidden="true">
            {formatMonthYear(new Date(scrubT).toISOString().slice(0, 7)).toUpperCase()}
          </span>

          <button className="tlc-icon" onClick={onReset} aria-label="Rewind to start of record">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 3v6h6" />
              <path d="M3.5 13a9 9 0 1 0 2.6-6.4L3 9" />
            </svg>
          </button>
        </div>

        <div className="timeline__spacer" />

        <div className="tl-stat" aria-hidden="true">
          <b>{formatGW(cumulativeGW)}</b> GW committed
          <span className="tl-stat__sep">·</span>
          <span className="tl-stat__count">{countInRange} sites</span>
        </div>
      </div>

      <div
        className="tl-track-wrap"
        ref={ref}
        role="slider"
        tabIndex={0}
        aria-label="Timeline scrubber. Reveals commitments up to the selected date."
        aria-valuemin={minT}
        aria-valuemax={maxT}
        aria-valuenow={scrubT}
        aria-valuetext={`${formatMonthYear(new Date(scrubT).toISOString().slice(0, 7))}, ${formatGW(cumulativeGW)} gigawatts committed`}
        onKeyDown={onKeyDown}
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        style={{ touchAction: "pan-y" }}
      >
        {width > 0 && (
          <svg className="tl-svg" width={width} height={height}>
            <defs>
              <linearGradient id="tlGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#c8f135" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#c8f135" stopOpacity="0.02" />
              </linearGradient>
            </defs>

            {ticks.map((t) => (
              <g key={t.label}>
                <line className="tl-tick" x1={t.x} y1={areaTop} x2={t.x} y2={baselineY} />
                <text className="tl-tick-label" x={t.x + 4} y={height - 4}>{t.label}</text>
              </g>
            ))}

            <path className="tl-area" d={areaPath} />
            <path className="tl-area-line" d={linePath} />
            <line className="tl-axis-line" x1={PAD_L} y1={baselineY} x2={width - PAD_R} y2={baselineY} />

            {/* Revealed portion shading */}
            <rect x={PAD_L} y={areaTop} width={Math.max(0, scrubX - PAD_L)} height={baselineY - areaTop} fill="rgba(200,241,53,0.05)" />

            {commitments.map((c) => {
              const future = c.t > scrubT;
              const r = Math.max(2.5, radiusForCapacity(c.capacityMW) * 0.5);
              return (
                <circle
                  key={c.id}
                  className={`tl-dot${future ? " tl-dot--future" : ""}${c.id === selectedId ? " tl-dot--selected" : ""}`}
                  cx={xFor(c.t)}
                  cy={baselineY}
                  r={c.id === selectedId ? r + 1.5 : r}
                  fill={techColor(c.techType)}
                  fillOpacity={future ? 0.5 : 0.95}
                  aria-hidden="true"
                  style={{ cursor: "pointer" }}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(c.id);
                  }}
                />
              );
            })}

            {/* Playhead */}
            <line className="tl-playhead-line" x1={scrubX} y1={areaTop - 4} x2={scrubX} y2={baselineY + 4} />
            <path className="tl-playhead-grip" d={`M${scrubX},${areaTop - 6} l5,-6 l-10,0 z`} />
            <circle className="tl-playhead-grip" cx={scrubX} cy={baselineY + 4} r={3} />
          </svg>
        )}
      </div>
    </section>
  );
}
