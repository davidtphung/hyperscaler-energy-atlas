import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { COMMITMENTS } from "./data/commitments";
import { prepare, domainOf, applyFacets, facetCounts, emptyFilters } from "./lib/select";
import { rankRows } from "./lib/search";
import { rankCatalog, type CatalogHit } from "./lib/signalSearch";
import type { FilterState } from "./lib/select";
import type { CountsFlag, NumberKind, TechType, Status, Category, Era } from "./types";
import { formatBoundPower } from "./lib/format";
import { PHONE_LAYOUT_QUERY, useMediaQuery, useReducedMotion } from "./lib/hooks";
import { readUrl, writeUrl } from "./lib/url";
import TopBar, { type Page } from "./components/TopBar";
import FilterRail from "./components/FilterRail";
import MapCanvas, { type MapView } from "./components/MapCanvas";
import Timeline from "./components/Timeline";
import DetailPanel from "./components/DetailPanel";
import TrustStrip from "./components/TrustStrip";
import KindStrip from "./components/KindStrip";

const PortfolioView = lazy(() => import("./components/PortfolioView"));
const SourcesView = lazy(() => import("./components/SourcesView"));
const AboutView = lazy(() => import("./components/AboutView"));
const DataCentersView = lazy(() => import("./components/DataCentersView"));
const ContestedView = lazy(() => import("./components/ContestedView"));
const PolicyView = lazy(() => import("./components/PolicyView"));
const ForecastView = lazy(() => import("./components/ForecastView"));
const EconomicsView = lazy(() => import("./components/EconomicsView"));
const HistoryView = lazy(() => import("./components/HistoryView"));
const SignalsView = lazy(() => import("./components/SignalsView"));

// Average month in ms. Playback speed is expressed as simulated months per real
// second, so "6mo/s" advances the scrubber six months for every wall-clock
// second, mirroring the speed-mode pill on a live tracker.
const MONTH_MS = 2.6298e9;

function currentUrl() {
  if (typeof window === "undefined") return readUrl("https://hypergrid.davidtphung.com/");
  return readUrl(window.location.href);
}

function toggle<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  next.has(value) ? next.delete(value) : next.add(value);
  return next;
}

export default function App() {
  const prepared = useMemo(() => prepare(COMMITMENTS), []);
  const domain = useMemo(() => domainOf(prepared), [prepared]);

  const [filters, setFilters] = useState<FilterState>(() => currentUrl().filters);
  const [page, setPage] = useState<Page>(() => (currentUrl().anchor ? "about" : "atlas"));
  const [anchor, setAnchor] = useState<"donate" | "what-counts" | null>(() => currentUrl().anchor);
  const [scrollDonate, setScrollDonate] = useState(() => currentUrl().anchor === "donate");
  const [scrollRule, setScrollRule] = useState(() => currentUrl().anchor === "what-counts");
  const [askQuestion, setAskQuestion] = useState(() => currentUrl().ask ?? "");
  const [view, setView] = useState<MapView>("us");
  const [selectedId, setSelectedId] = useState<string | null>(() => currentUrl().row);
  const [scrubT, setScrubT] = useState(domain.maxT);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(6); // simulated months per real second
  const [railOpen, setRailOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [booted, setBooted] = useState(false);
  const [announce, setAnnounce] = useState("");
  const [onsiteOpen, setOnsiteOpen] = useState(false);
  const [onsiteOnly, setOnsiteOnly] = useState(false);
  const [askHighlightIds, setAskHighlightIds] = useState<Set<string>>(new Set());
  const [ledgerFocusId, setLedgerFocusId] = useState<string | null>(null);
  const [signalAnchor, setSignalAnchor] = useState<string | null>(null);

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

  // Shared links (#donate, #what-counts, ?row=, filters, ask) reopen the same view.
  useEffect(() => {
    const apply = () => {
      const url = readUrl(window.location.href);
      setFilters(url.filters);
      setSelectedId(url.row);
      setAskQuestion(url.ask ?? "");
      setAnchor(url.anchor);
      if (url.anchor) {
        setPage("about");
        setScrollDonate(url.anchor === "donate");
        setScrollRule(url.anchor === "what-counts");
      }
      if (url.row) setDetailOpen(true);
    };
    window.addEventListener("hashchange", apply);
    window.addEventListener("popstate", apply);
    return () => {
      window.removeEventListener("hashchange", apply);
      window.removeEventListener("popstate", apply);
    };
  }, []);

  useEffect(() => {
    const next = writeUrl(
      {
        filters,
        row: page === "atlas" ? selectedId : null,
        ask: page === "atlas" && askQuestion.trim() ? askQuestion.trim() : null,
        anchor: page === "about" ? anchor : null,
      },
      window.location,
    );
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (next !== current) history.replaceState(null, "", next);
  }, [filters, selectedId, askQuestion, page, anchor]);

  useEffect(() => {
    if (page !== "about" || !scrollDonate) return;
    let tries = 0;
    let timer = 0;
    const tick = () => {
      const el = document.getElementById("donate");
      if (el) {
        el.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
        el.focus({ preventScroll: true });
        setScrollDonate(false);
        return;
      }
      if (tries++ < 20) timer = window.setTimeout(tick, 50);
    };
    tick();
    return () => window.clearTimeout(timer);
  }, [page, scrollDonate, reducedMotion]);

  useEffect(() => {
    if (page !== "about" || !scrollRule) return;
    let tries = 0;
    let timer = 0;
    const tick = () => {
      const el = document.getElementById("what-counts");
      if (el) {
        el.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
        setScrollRule(false);
        return;
      }
      if (tries++ < 20) timer = window.setTimeout(tick, 50);
    };
    tick();
    return () => window.clearTimeout(timer);
  }, [page, scrollRule, reducedMotion]);

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
  const onsiteIds = useMemo(() => {
    const ids = new Set<string>();
    for (const c of prepared) {
      if (c.numberKind === "btm_gen" && c.counts === "yes") ids.add(c.id);
    }
    return ids;
  }, [prepared]);
  const rankedMatches = useMemo(() => {
    const q = filters.query.trim();
    if (!q) return [];
    const base = applyFacets(prepared, { ...filters, query: "" });
    return rankRows(q, base).filter((hit) => hit.score > 0);
  }, [prepared, filters]);
  const catalogMatches = useMemo(() => rankCatalog(filters.query), [filters.query]);
  const highlightIds = useMemo(() => {
    const ids = new Set<string>();
    if (onsiteOpen || onsiteOnly) {
      for (const id of onsiteIds) ids.add(id);
    }
    for (const hit of rankedMatches) ids.add(hit.row.id);
    for (const id of askHighlightIds) ids.add(id);
    return ids;
  }, [onsiteOpen, onsiteOnly, onsiteIds, rankedMatches, askHighlightIds]);
  const mapRows = useMemo(
    () => (onsiteOnly ? prepared.filter((c) => onsiteIds.has(c.id)) : facetFiltered),
    [onsiteOnly, prepared, onsiteIds, facetFiltered],
  );
  const mapInRange = useMemo(() => {
    if (!onsiteOnly) return inRange;
    const ids = new Set<string>();
    for (const c of mapRows) {
      if (!Number.isFinite(c.t) || c.t <= scrubT) ids.add(c.id);
    }
    return ids;
  }, [onsiteOnly, inRange, mapRows, scrubT]);
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
        setLedgerFocusId(id);
        const c = prepared.find((x) => x.id === id);
        if (c) setAnnounce(`Selected ${c.project} by ${c.buyer}, ${formatBoundPower(c.capacityMW, c.bound)}.`);
      }
      if (isCompact) setDetailOpen(!!id);
    },
    [isCompact, prepared]
  );

  const clearFilters = useCallback(() => setFilters(emptyFilters()), []);

  const dataThrough = useMemo(() => {
    let best = "";
    for (const row of prepared) {
      if (row.date > best) best = row.date;
    }
    return best;
  }, [prepared]);
  const countedCount = useMemo(() => prepared.filter((row) => row.counts === "yes").length, [prepared]);

  const openedFromUrl = useRef(false);
  useEffect(() => {
    if (openedFromUrl.current || !selectedId || !isCompact) return;
    openedFromUrl.current = true;
    setDetailOpen(true);
  }, [selectedId, isCompact]);

  const onAskHighlight = useCallback((ids: string[]) => {
    setAskHighlightIds(new Set(ids));
  }, []);

  const clearOnsite = useCallback(() => {
    setOnsiteOnly(false);
    setOnsiteOpen(false);
  }, []);

  const onPageChange = useCallback((p: Page) => {
    setPage(p);
    if (p !== "about") setAnchor(null);
    if (p !== "signals") setSignalAnchor(null);
    setRailOpen(false);
    setDetailOpen(false);
  }, []);

  const onOpenExtra = useCallback((hit: CatalogHit) => {
    setPage("signals");
    setAnchor(null);
    setSignalAnchor(hit.anchor);
    setRailOpen(false);
    setDetailOpen(false);
  }, []);

  const onOpenRule = useCallback(() => {
    setPage("about");
    setAnchor("what-counts");
    setScrollRule(true);
    setRailOpen(false);
    setDetailOpen(false);
  }, []);

  // Escape closes overlays / clears selection.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (onsiteOnly) {
        setOnsiteOnly(false);
        return;
      }
      if (selectedId) {
        setSelectedId(null);
        if (isCompact) setDetailOpen(false);
        return;
      }
      if (onsiteOpen) {
        setOnsiteOpen(false);
        return;
      }
      if (railOpen || detailOpen) {
        setRailOpen(false);
        setDetailOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, railOpen, detailOpen, isCompact, onsiteOnly, onsiteOpen]);

  const showScrim = page === "atlas" && isCompact && (railOpen || detailOpen);

  return (
    <>
      <a className="skip-link" href="#map-marker">
        Skip to map
      </a>
      <a className="skip-link skip-link--next" href="#ledger">
        Skip to ledger
      </a>

      <div className={`app${page === "atlas" && timelineCollapsed ? " app--tl-collapsed" : ""}`}>
        <TopBar
          page={page}
          onPageChange={onPageChange}
          query={filters.query}
          onQuery={(q) => setFilters((f) => ({ ...f, query: q }))}
          ranked={rankedMatches}
          extras={catalogMatches}
          onSelect={onSelect}
          onOpenExtra={onOpenExtra}
          onToggleRail={() => {
            setRailOpen((v) => !v);
            setDetailOpen(false);
          }}
          onToggleDetail={() => {
            setDetailOpen((v) => !v);
            setRailOpen(false);
          }}
        />

        <TrustStrip
          dataThrough={dataThrough}
          rowCount={prepared.length}
          countedCount={countedCount}
          onOpenRule={onOpenRule}
        />
        {page === "atlas" && <KindStrip rows={prepared} />}

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
              onToggleKind={(v: NumberKind) => setFilters((f) => ({ ...f, kinds: toggle(f.kinds, v) }))}
              onToggleCounted={(v: CountsFlag) => setFilters((f) => ({ ...f, counted: toggle(f.counted, v) }))}
              onToggleState={(v: string) => setFilters((f) => ({ ...f, states: toggle(f.states, v) }))}
              onClear={clearFilters}
              onClose={() => setRailOpen(false)}
              ranked={rankedMatches}
              extras={catalogMatches}
              rows={prepared}
              onSelect={onSelect}
              onOpenExtra={onOpenExtra}
              askQuestion={askQuestion}
              onAskQuestion={setAskQuestion}
              onAskHighlight={onAskHighlight}
            />

            <MapCanvas
              commitments={mapRows}
              inRange={mapInRange}
              selectedId={selectedId}
              highlightIds={highlightIds}
              limitNote={
                onsiteOnly
                  ? { label: "Showing counted on-site holders only", onClear: clearOnsite }
                  : null
              }
              onSelect={onSelect}
              view={view}
              onViewChange={setView}
            />

            <DetailPanel
              selected={selected}
              visible={shown}
              catalog={prepared}
              totalAll={prepared.length}
              open={isCompact ? detailOpen : true}
              onSelect={onSelect}
              onClose={() => {
                setSelectedId(null);
                setDetailOpen(false);
              }}
              onToggleBuyer={(v) => setFilters((f) => ({ ...f, buyers: toggle(f.buyers, v) }))}
              buyersOn={filters.buyers}
              onsiteOpen={onsiteOpen}
              onOnsiteOpen={setOnsiteOpen}
              onsiteOnly={onsiteOnly}
              onOnsiteOnly={setOnsiteOnly}
              onClearOnsite={clearOnsite}
              ledgerFocusId={ledgerFocusId}
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
          <Suspense fallback={<div className="page-wrap" role="status">Loading.</div>}>
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
              {page === "signals" && <SignalsView anchor={signalAnchor} />}
              {page === "about" && (
                <>
                  <AboutView total={prepared.length} />
                  <SourcesView commitments={facetFiltered} />
                </>
              )}
            </div>
          </Suspense>
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
