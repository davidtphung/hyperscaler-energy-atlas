import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { COMMITMENTS } from "./data/commitments";
import { prepare, domainOf, applyFacets, facetCounts, sumMW } from "./lib/select";
import type { FilterState } from "./lib/select";
import type { TechType, Status, Category } from "./types";
import { formatCapacity } from "./lib/format";
import { useMediaQuery, useReducedMotion } from "./lib/hooks";
import TopBar from "./components/TopBar";
import FilterRail from "./components/FilterRail";
import MapCanvas, { type MapView } from "./components/MapCanvas";
import Timeline from "./components/Timeline";
import DetailPanel from "./components/DetailPanel";

const PLAY_DURATION = 16_000; // ms to sweep the full timeline

function toggle<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  next.has(value) ? next.delete(value) : next.add(value);
  return next;
}

export default function App() {
  const prepared = useMemo(() => prepare(COMMITMENTS), []);
  const domain = useMemo(() => domainOf(prepared), [prepared]);

  const [filters, setFilters] = useState<FilterState>({
    buyers: new Set(),
    techs: new Set(),
    statuses: new Set(),
    categories: new Set(),
    query: "",
  });
  const [view, setView] = useState<MapView>("us");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scrubT, setScrubT] = useState(domain.maxT);
  const [playing, setPlaying] = useState(false);
  const [railOpen, setRailOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [booted, setBooted] = useState(false);
  const [announce, setAnnounce] = useState("");

  const isCompact = useMediaQuery("(max-width: 1180px)");
  const isMobile = useMediaQuery("(max-width: 720px)");
  const reducedMotion = useReducedMotion();

  // Boot reveal.
  useEffect(() => {
    const t = setTimeout(() => setBooted(true), reducedMotion ? 100 : 620);
    return () => clearTimeout(t);
  }, [reducedMotion]);

  // Derived selections.
  const facetFiltered = useMemo(() => applyFacets(prepared, filters), [prepared, filters]);
  const visible = useMemo(() => facetFiltered.filter((c) => c.t <= scrubT), [facetFiltered, scrubT]);
  const inRange = useMemo(() => new Set(visible.map((c) => c.id)), [visible]);
  const counts = useMemo(() => facetCounts(prepared, filters), [prepared, filters]);
  const selected = useMemo(() => prepared.find((c) => c.id === selectedId) ?? null, [prepared, selectedId]);
  const cumulativeGW = useMemo(() => sumMW(visible), [visible]);

  // Announce filter results.
  useEffect(() => {
    setAnnounce(`${facetFiltered.length} commitment${facetFiltered.length === 1 ? "" : "s"} match the current filters.`);
  }, [facetFiltered.length]);

  // Timeline playback.
  const playingRef = useRef(playing);
  playingRef.current = playing;
  useEffect(() => {
    if (!playing || reducedMotion) return;
    let raf = 0;
    let last = 0;
    let running = true;
    const span = Math.max(1, domain.maxT - domain.minT);
    const tick = (ts: number) => {
      if (!last) last = ts;
      const dt = Math.min(80, ts - last);
      last = ts;
      setScrubT((prev) => {
        const next = prev + (span * dt) / PLAY_DURATION;
        if (next >= domain.maxT) {
          running = false;
          return domain.maxT;
        }
        return next;
      });
      if (running) raf = requestAnimationFrame(tick);
      else setPlaying(false);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, reducedMotion, domain.maxT, domain.minT]);

  const onTogglePlay = useCallback(() => {
    if (reducedMotion) {
      setScrubT((t) => (t >= domain.maxT ? domain.minT : domain.maxT));
      return;
    }
    setPlaying((p) => {
      if (!p && scrubT >= domain.maxT) setScrubT(domain.minT);
      return !p;
    });
  }, [reducedMotion, scrubT, domain.maxT, domain.minT]);

  const onScrub = useCallback((t: number) => {
    setPlaying(false);
    setScrubT(t);
  }, []);

  const onSelect = useCallback(
    (id: string | null) => {
      setSelectedId(id);
      if (id) {
        const c = prepared.find((x) => x.id === id);
        if (c) setAnnounce(`Selected ${c.project} by ${c.buyer}, ${formatCapacity(c.capacityMW)}.`);
      }
      if (isCompact) setDetailOpen(!!id);
    },
    [isCompact, prepared]
  );

  const clearFilters = useCallback(
    () => setFilters({ buyers: new Set(), techs: new Set(), statuses: new Set(), categories: new Set(), query: "" }),
    []
  );

  // Escape closes overlays / clears selection.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (selectedId) {
        setSelectedId(null);
        if (isCompact) setDetailOpen(false);
      } else if (railOpen || detailOpen) {
        setRailOpen(false);
        setDetailOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, railOpen, detailOpen, isCompact]);

  const showScrim = isCompact && (railOpen || detailOpen);

  return (
    <>
      <a className="skip-link" href="#map">
        Skip to map
      </a>

      <div className="app">
        <TopBar
          query={filters.query}
          onQuery={(q) => setFilters((f) => ({ ...f, query: q }))}
          onToggleRail={() => {
            setRailOpen((v) => !v);
            setDetailOpen(false);
          }}
          onToggleDetail={() => {
            setDetailOpen((v) => !v);
            setRailOpen(false);
          }}
          isCompact={isMobile}
        />

        <FilterRail
          filters={filters}
          counts={counts}
          buyers={domain.buyers}
          open={railOpen}
          onToggleBuyer={(v) => setFilters((f) => ({ ...f, buyers: toggle(f.buyers, v) }))}
          onToggleTech={(v: TechType) => setFilters((f) => ({ ...f, techs: toggle(f.techs, v) }))}
          onToggleStatus={(v: Status) => setFilters((f) => ({ ...f, statuses: toggle(f.statuses, v) }))}
          onToggleCategory={(v: Category) => setFilters((f) => ({ ...f, categories: toggle(f.categories, v) }))}
          onClear={clearFilters}
          onClose={() => setRailOpen(false)}
        />

        <MapCanvas
          commitments={facetFiltered}
          inRange={inRange}
          selectedId={selectedId}
          onSelect={onSelect}
          view={view}
          onViewChange={setView}
        />

        <DetailPanel
          selected={selected}
          visible={visible}
          totalAll={prepared.length}
          open={isCompact ? detailOpen : true}
          onSelect={onSelect}
          onClose={() => {
            setSelectedId(null);
            setDetailOpen(false);
          }}
        />

        <Timeline
          commitments={facetFiltered}
          minT={domain.minT}
          maxT={domain.maxT}
          scrubT={scrubT}
          onScrub={onScrub}
          playing={playing}
          onTogglePlay={onTogglePlay}
          selectedId={selectedId}
          onSelect={onSelect}
          cumulativeGW={cumulativeGW}
          countInRange={visible.length}
        />
      </div>

      {showScrim && (
        <div
          className="scrim"
          onClick={() => {
            setRailOpen(false);
            setDetailOpen(false);
          }}
          aria-hidden="true"
        />
      )}

      <div className="sr-only" aria-live="polite" role="status">
        {announce}
      </div>

      <div className={`boot${booted ? " boot--out" : ""}`} aria-hidden={booted}>
        <span className="boot__mark">
          <svg width="22" height="22" viewBox="0 0 32 32" fill="currentColor">
            <path d="M17.5 4 7 18h6.5L12 28l12-14h-7z" />
          </svg>
        </span>
        <span className="boot__label">Charting the grid</span>
      </div>
    </>
  );
}
