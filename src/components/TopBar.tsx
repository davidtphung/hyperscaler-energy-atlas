import { useEffect, useRef, useState } from "react";
import type { RouteSection } from "../lib/routes";

export type Page =
  | "atlas"
  | "datacenters"
  | "economics"
  | "history"
  | "forecast"
  | "contested"
  | "policy"
  | "portfolio"
  | "about";

export type PageChange = (page: Page, section?: RouteSection) => void;

interface Props {
  page: Page;
  aboutSection?: RouteSection;
  onPageChange: PageChange;
  query: string;
  onQuery: (q: string) => void;
  onToggleRail: () => void;
  onToggleDetail: () => void;
}

const PRIMARY: { id: Page; label: string }[] = [
  { id: "atlas", label: "Atlas" },
  { id: "forecast", label: "Forecast Lab" },
  { id: "about", label: "About" },
];

const MORE: { id: Page; label: string; section?: RouteSection }[] = [
  { id: "datacenters", label: "Data Centers" },
  { id: "economics", label: "Economics" },
  { id: "history", label: "History" },
  { id: "contested", label: "Contested" },
  { id: "policy", label: "Policy" },
  { id: "portfolio", label: "Analysis" },
  { id: "about", label: "Support", section: "support" },
];

const MORE_PAGE_IDS = new Set<Page>(["datacenters", "economics", "history", "contested", "policy", "portfolio"]);

export default function TopBar({
  page,
  aboutSection,
  onPageChange,
  query,
  onQuery,
  onToggleRail,
  onToggleDetail,
}: Props) {
  const onAtlas = page === "atlas";
  const moreActive = MORE_PAGE_IDS.has(page);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!moreOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMoreOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [moreOpen]);

  const go = (id: Page, section?: RouteSection) => {
    setMoreOpen(false);
    onPageChange(id, section);
  };

  return (
    <header className="topbar">
      {onAtlas && (
        <button className="icon-btn menu-toggle" onClick={onToggleRail} aria-label="Open filters">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="4" y1="7" x2="20" y2="7" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="17" x2="14" y2="17" />
          </svg>
        </button>
      )}

      <button className="brand" type="button" onClick={() => go("atlas")} aria-label="HYPERGRID home">
        <span className="brand__mark" aria-hidden="true">
          <svg width="17" height="17" viewBox="0 0 32 32" fill="currentColor">
            <path d="M17.5 4 7 18h6.5L12 28l12-14h-7z" />
          </svg>
        </span>
        <span className="brand__text">
          <span className="brand__name">HYPERGRID</span>
          <span className="brand__sub">Hyperscaler Energy Atlas</span>
        </span>
      </button>

      <nav className="nav-tabs" aria-label="Views">
        {PRIMARY.map((p) => (
          <button
            key={p.id}
            className="nav-tab"
            aria-current={page === p.id ? "page" : undefined}
            onClick={() => go(p.id)}
          >
            {p.label}
          </button>
        ))}
        <div className="nav-more" ref={moreRef}>
          <button
            type="button"
            className="nav-tab"
            aria-haspopup="menu"
            aria-expanded={moreOpen}
            aria-current={moreActive ? "true" : undefined}
            onClick={() => setMoreOpen((v) => !v)}
          >
            More
          </button>
          {moreOpen && (
            <div className="nav-more__menu" role="menu" aria-label="More views">
              {MORE.map((p) => {
                const current =
                  p.section === "support"
                    ? page === "about" && (aboutSection === "support" || aboutSection === "donate")
                    : page === p.id && !(p.id === "about");
                return (
                  <button
                    key={`${p.id}-${p.section ?? "page"}`}
                    type="button"
                    role="menuitem"
                    className="nav-more__item"
                    aria-current={current ? "page" : undefined}
                    onClick={() => go(p.id, p.section)}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </nav>

      <div className="topbar__spacer" />

      {onAtlas && (
        <div className="search" role="search">
          <span className="search__icon" aria-hidden="true">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.5" y2="16.5" />
            </svg>
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Search projects, buyers, places"
            aria-label="Search commitments"
          />
          {query && (
            <button className="search__clear" onClick={() => onQuery("")} aria-label="Clear search">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="18" y1="6" x2="6" y2="18" />
              </svg>
            </button>
          )}
        </div>
      )}

      {onAtlas && (
        <button className="icon-btn menu-toggle" onClick={onToggleDetail} aria-label="Open insights panel">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="6" y1="20" x2="6" y2="13" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="18" y1="20" x2="18" y2="9" />
          </svg>
        </button>
      )}

      <span className="byline">
        Built by{" "}
        <a href="https://x.com/davidtphung" target="_blank" rel="noopener noreferrer">
          David T Phung
        </a>
      </span>
    </header>
  );
}
