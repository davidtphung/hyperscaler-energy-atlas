import { useCallback, useEffect, useMemo, useState } from "react";
import { COMMITMENTS } from "./data/commitments";
import { prepare, domainOf, applyFacets, facetCounts } from "./lib/select";
import type { FilterState } from "./lib/select";
import type { TechType, Status, Category, Era } from "./types";
import { formatPower } from "./lib/format";
import { PHONE_LAYOUT_QUERY, useMediaQuery, useReducedMotion } from "./lib/hooks";
import TopBar, { type Page } from "./components/TopBar";
import FilterRail from "./components/FilterRail";
import MapCanvas, { type MapView } from "./components/MapCanvas";
import Timeline from "./components/Timeline";
import DetailPanel from "./components/DetailPanel";
import PortfolioView from "./components/PortfolioView";
import SourcesView from "./components/SourcesView";
import AboutView from "./components/AboutView";
import DataCentersView from "./components/DataCentersView";
import ContestedView from "./components/ContestedView";
import PolicyView from "./components/PolicyView";
import ForecastView from "./components/ForecastView";
import EconomicsView from "./components/EconomicsView";
import HistoryView from "./components/HistoryView";

// Average month in ms. Playback speed is expressed as simulated months per real
// second, so "6mo/s" advances the scrubber six months for every wall-clock
// second, mirroring the speed-mode pill on a live tracker.
const MONTH_MS = 2.6298e9;

function donateRequested(): boolean {
  if (typeof window === "undefined") return false;
  const hash = window.location.hash.replace(/^#/, "").toLowerCase();
  if (hash === "donate") return true;
  return new URLSearchParams(window.location.search).get("tab")?.toLowerCase() === "donate";
}

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
    eras: new Set(),
    query: "",
  });
  const [page, setPage] = useState<Page>(() => (donateRequested() ? "about" : "atlas"));
  const [scrollDonate, setScrollDonate] = useState(donateRequested);
  const [view, setView] = useState<MapView>("us");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scrubT, setScrubT] = useState(domain.maxT);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(6); // simulated months per real second
  const [railOpen, setRailOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [booted, setBooted] = useState(false);
  const [announce, setAnnounce] = useState("");

  const isCompact = useMediaQuery("(max-width: 1180px)");
  const phoneLayout = useMediaQuery(PHONE_LAYOUT_QUERY);
  const reducedMotion = useReducedMotion();
  const [timelineOpen, setTimelineOpen] = useState(false);
  const timelineCollapsed = phoneLayout && !timelineOpen;

  // Phone layouts open on the full live map. The timeline player is optional
  // there, so a scrub from a wider window does not leave the map on a sliver
  // of the record once the player is collapsed.
  useEffect(() => {
    if (!timelineCollapsed) return;
    setPlaying(false);
    setScrubT(domain.maxT);
  }, [timelineCollapsed, domain.maxT]);

  // Old Donate links (#donate or ?tab=donate) open About and land on that section.
  useEffect(() => {
    const openDonate = () => {
      if (!donateRequested()) return;
      setPage("about");
      setScrollDonate(true);
    };
    window.addEventListener("hashchange", openDonate);
    window.addEventListener("popstate", openDonate);
    return () => {
      window.removeEventListener("hashchange", openDonate);
      window.removeEventListener("popstate", openDonate);
    };
  }, []);

  useEffect(() => {
    if (page !== "about" || !scrollDonate) return;
    const el = document.getElementById("donate");
    if (!el) return;
    el.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
    el.focus({ preventScroll: true });
    setScrollDonate(false);
  }, [page, scrollDonate, reducedMotion]);

  // Boot reveal.
  useEffect(() => {
    const t = setTimeout(() => setBooted(true), reducedMotion ? 100 : 620);
    return () => clearTimeout(t);
  }, [reducedMotion]);

  // Derived selections.
  const facetFiltered = useMemo(() => applyFacets(prepared, filters), [prepared, filters]);
  const visible = useMemo(
    () => facetFiltered.filter((c) => !Number.isFinite(c.t) || c.t <= scrubT),
    [facetFiltered, scrubT],
  );
  // Collapsed phone timeline is the live record, not whatever the scrubber last sat on.
  const shown = timelineCollapsed ? facetFiltered : visible;
  const inRange = useMemo(() => new Set(shown.map((c) => c.id)), [shown]);
  const counts = useMemo(() => facetCounts(prepared, filters), [prepared, filters]);
  const selected = useMemo(() => prepared.find((c) => c.id === selectedId) ?? null, [prepared, selectedId]);
  // Announce filter results.
  useEffect(() => {
    setAnnounce(`${facetFiltered.length} commitment${facetFiltered.length === 1 ? "" : "s"} match the current filters.`);
  }, [facetFiltered.length]);

  // Timeline playback. The scrubber advances by `speed` simulated months for
  // every real second, frame by frame, until it reaches the present.
  useEffect(() => {
    if (!playing || reducedMotion) return;
    let raf = 0;
    let last = 0;
    let running = true;
    const tick = (ts: number) => {
      if (!last) last = ts;
      const dt = Math.min(80, ts - last);
      last = ts;
      setScrubT((prev) => {
        const next = prev + speed * MONTH_MS * (dt / 1000);
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
  }, [playing, speed, reducedMotion, domain.maxT]);

  const onTogglePlay = useCallback(() => {
    if (reducedMotion) {
      setScrubT((t) => (t >= domain.maxT ? domain.minT : domain.maxT));
      return;
    }
    setPlaying((p) => {
      if (!p && scrubT >= domain.maxT) setScrubT(domain.minT);
      return !p;
    });
  }, [reducedMotion, scrubT, domain.maxT]);

  // Pick a speed and start playing. Restart from the beginning if parked at the present.
  const onSetSpeed = useCallback(
    (s: number) => {
      setSpeed(s);
      if (reducedMotion) {
        setScrubT(domain.maxT);
        return;
      }
      setScrubT((t) => (t >= domain.maxT ? domain.minT : t));
      setPlaying(true);
    },
    [reducedMotion, domain.maxT, domain.minT]
  );

  // Jump to the present and stop. This is the "Live" state.
  const onLive = useCallback(() => {
    setPlaying(false);
    setScrubT(domain.maxT);
  }, [domain.maxT]);

  // Rewind to the start of the record and stop.
  const onResetScrub = useCallback(() => {
    setPlaying(false);
    setScrubT(domain.minT);
  }, [domain.minT]);

  const onScrub = useCallback((t: number) => {
    setPlaying(false);
    setScrubT(t);
  }, []);

  const onToggleTimeline = useCallback(() => {
    setTimelineOpen((open) => !open);
  }, []);

  const onSelect = useCallback(
    (id: string | null) => {
      setSelectedId(id);
      if (id) {
        const c = prepared.find((x) => x.id === id);
        if (c) setAnnounce(`Selected ${c.project} by ${c.buyer}, ${formatPower(c.capacityMW)}.`);
      }
      if (isCompact) setDetailOpen(!!id);
    },
    [isCompact, prepared]
  );

  const clearFilters = useCallback(
    () => setFilters({ buyers: new Set(), techs: new Set(), statuses: new Set(), categories: new Set(), eras: new Set(), query: "" }),
    []
  );

  const onPageChange = useCallback((p: Page) => {
    setPage(p);
    setRailOpen(false);
    setDetailOpen(false);
  }, []);

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

  const showScrim = page === "atlas" && isCompact && (railOpen || detailOpen);

  return (
    <>
      <a className="skip-link" href="#map">
        Skip to map
      </a>

      <div className={`app${page === "atlas" && timelineCollapsed ? " app--tl-collapsed" : ""}`}>
        <TopBar
          page={page}
          onPageChange={onPageChange}
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
        />

        {page === "atlas" ? (
          <>
            <FilterRail
              filters={filters}
              counts={counts}
              buyers={domain.buyers}
              query={filters.query}
              onQuery={(q) => setFilters((f) => ({ ...f, query: q }))}
              open={railOpen}
              onToggleBuyer={(v) => setFilters((f) => ({ ...f, buyers: toggle(f.buyers, v) }))}
              onToggleTech={(v: TechType) => setFilters((f) => ({ ...f, techs: toggle(f.techs, v) }))}
              onToggleStatus={(v: Status) => setFilters((f) => ({ ...f, statuses: toggle(f.statuses, v) }))}
              onToggleCategory={(v: Category) => setFilters((f) => ({ ...f, categories: toggle(f.categories, v) }))}
              onToggleEra={(v: Era) => setFilters((f) => ({ ...f, eras: toggle(f.eras, v) }))}
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
              visible={shown}
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
              speed={speed}
              onSetSpeed={onSetSpeed}
              onLive={onLive}
              onReset={onResetScrub}
              atLive={scrubT >= domain.maxT}
              selectedId={selectedId}
              onSelect={onSelect}
              countInRange={shown.length}
              collapsed={timelineCollapsed}
              onToggleCollapsed={phoneLayout ? onToggleTimeline : undefined}
            />
          </>
        ) : (
          <div className="page-wrap" key={page}>
            {page === "datacenters" && <DataCentersView />}
            {page === "economics" && <EconomicsView />}
            {page === "history" && <HistoryView />}
            {page === "contested" && <ContestedView />}
            {page === "policy" && <PolicyView />}
            {page === "portfolio" && (
              <>
                <PortfolioView commitments={facetFiltered} />
                <ForecastView />
              </>
            )}
            {page === "about" && (
              <>
                <AboutView total={prepared.length} />
                <SourcesView commitments={facetFiltered} />
              </>
            )}
          </div>
        )}
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
