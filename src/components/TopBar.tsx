import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type FocusEvent as ReactFocusEvent, type KeyboardEvent as ReactKeyboardEvent } from "react";

export type Page = "atlas" | "datacenters" | "economics" | "history" | "contested" | "policy" | "portfolio" | "about";

interface Props {
  page: Page;
  onPageChange: (p: Page) => void;
  query: string;
  onQuery: (q: string) => void;
  onToggleRail: () => void;
  onToggleDetail: () => void;
}

const STORY_PAGES: { id: Page; label: string }[] = [
  { id: "economics", label: "Economics" },
  { id: "history", label: "History" },
  { id: "contested", label: "Contested" },
  { id: "policy", label: "Policy" },
];

export default function TopBar({ page, onPageChange, query, onQuery, onToggleRail, onToggleDetail }: Props) {
  const onAtlas = page === "atlas";
  const storyCurrent = STORY_PAGES.find((p) => p.id === page) ?? null;
  const [storyOpen, setStoryOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const storyBtnRef = useRef<HTMLButtonElement>(null);
  const storyPanelRef = useRef<HTMLDivElement | null>(null);
  const pendingFocus = useRef<number | null>(null);
  const panelRef = useCallback((node: HTMLDivElement | null) => {
    if (node && node.getAttribute("popover") !== "manual") node.setAttribute("popover", "manual");
    storyPanelRef.current = node;
  }, []);
  const storyPanelId = useId();

  useEffect(() => {
    setStoryOpen(false);
  }, [page]);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const current = nav.querySelector<HTMLElement>("[data-nav-current='true']");
    if (!current) return;
    const navBox = nav.getBoundingClientRect();
    const box = current.getBoundingClientRect();
    if (box.left < navBox.left + 4) nav.scrollBy({ left: box.left - navBox.left - 8 });
    else if (box.right > navBox.right - 4) nav.scrollBy({ left: box.right - navBox.right + 8 });
  }, [page]);

  useLayoutEffect(() => {
    const panel = storyPanelRef.current;
    if (!panel) return;
    if (!storyOpen) {
      if (panel.matches(":popover-open")) panel.hidePopover();
      return;
    }
    if (typeof panel.showPopover === "function" && !panel.matches(":popover-open")) {
      panel.showPopover();
    }
    placeStoryPanel(storyBtnRef.current, panel);
    const idx = pendingFocus.current;
    pendingFocus.current = null;
    if (idx != null) {
      panel.querySelectorAll<HTMLButtonElement>("button")[idx]?.focus();
    }
    const onMove = () => placeStoryPanel(storyBtnRef.current, panel);
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    return () => {
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
  }, [storyOpen]);

  useEffect(() => {
    if (!storyOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      setStoryOpen(false);
      storyBtnRef.current?.focus();
    };
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (storyBtnRef.current?.contains(target) || storyPanelRef.current?.contains(target)) return;
      setStoryOpen(false);
    };
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [storyOpen]);

  function openStory(focusIndex: number) {
    if (storyOpen) {
      storyPanelRef.current?.querySelectorAll<HTMLButtonElement>("button")[focusIndex]?.focus();
      return;
    }
    pendingFocus.current = focusIndex;
    setStoryOpen(true);
  }

  function onStoryKeyDown(e: ReactKeyboardEvent<HTMLButtonElement>) {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const index = e.key === "ArrowDown" ? 0 : STORY_PAGES.length - 1;
    openStory(index);
  }

  function onPanelBlur(e: ReactFocusEvent<HTMLDivElement>) {
    const next = e.relatedTarget as Node | null;
    if (next && (storyPanelRef.current?.contains(next) || storyBtnRef.current?.contains(next))) return;
    setStoryOpen(false);
  }

  function onPanelKeyDown(e: ReactKeyboardEvent<HTMLDivElement>) {
    const buttons = storyPanelRef.current?.querySelectorAll<HTMLButtonElement>("button");
    if (!buttons || buttons.length === 0) return;
    const items = Array.from(buttons);
    const current = items.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const delta = e.key === "ArrowDown" ? 1 : -1;
      const next = current < 0 ? 0 : (current + delta + items.length) % items.length;
      items[next]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      items[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      items[items.length - 1]?.focus();
    }
  }

  return (
    <header className="topbar">
      {onAtlas && (
        <button className="icon-btn menu-toggle" onClick={onToggleRail} aria-label="Open filters" type="button">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="4" y1="7" x2="20" y2="7" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="17" x2="14" y2="17" />
          </svg>
        </button>
      )}

      <div className="brand">
        <span className="brand__mark" aria-hidden="true">
          <svg width="17" height="17" viewBox="0 0 32 32" fill="currentColor">
            <path d="M17.5 4 7 18h6.5L12 28l12-14h-7z" />
          </svg>
        </span>
        <span className="brand__text">
          <span className="brand__name">HYPERGRID</span>
          <span className="brand__sub">Hyperscaler Energy Atlas</span>
        </span>
      </div>

      <nav className="nav-tabs" aria-label="Views" ref={navRef}>
        <div className="nav-primary">
          <div className="nav-group" role="group" aria-label="Map">
            <NavTab id="atlas" label="Atlas" page={page} onPageChange={onPageChange} lead />
          </div>
          <span className="nav-sep" aria-hidden="true" />
          <div className="nav-group" role="group" aria-label="Sites">
            <NavTab id="datacenters" label="Data Centers" page={page} onPageChange={onPageChange} />
          </div>
          <span className="nav-sep" aria-hidden="true" />
          <div className="nav-group nav-story" role="group" aria-label="Story">
            <button
              ref={storyBtnRef}
              type="button"
              className={`nav-tab nav-tab--story${storyCurrent ? " is-current" : ""}`}
              aria-expanded={storyOpen}
              aria-controls={storyPanelId}
              aria-haspopup="true"
              aria-current={!storyOpen && storyCurrent ? "page" : undefined}
              aria-label={storyCurrent ? `Story, ${storyCurrent.label}` : "Story"}
              data-nav-current={storyCurrent ? "true" : undefined}
              onClick={() => setStoryOpen((open) => !open)}
              onKeyDown={onStoryKeyDown}
            >
              <span>{storyCurrent ? storyCurrent.label : "Story"}</span>
              <svg className="nav-caret" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
                <path d="M6 10l6 6 6-6" />
              </svg>
            </button>
            <div
              id={storyPanelId}
              ref={panelRef}
              className={`nav-story__panel${storyOpen ? " is-open" : ""}`}
              role="group"
              aria-label="Story"
              onKeyDown={onPanelKeyDown}
              onBlur={onPanelBlur}
            >
              <p className="nav-story__label">Story</p>
              {STORY_PAGES.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="nav-story__item"
                  aria-current={page === p.id ? "page" : undefined}
                  onClick={() => {
                    onPageChange(p.id);
                    setStoryOpen(false);
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <span className="nav-sep" aria-hidden="true" />
          <div className="nav-group" role="group" aria-label="Analysis">
            <NavTab id="portfolio" label="Analysis" page={page} onPageChange={onPageChange} />
          </div>
        </div>

        <span className="nav-sep nav-sep--meta" aria-hidden="true" />
        <div className="nav-group nav-group--meta" role="group" aria-label="Meta">
          <NavTab id="about" label="About" page={page} onPageChange={onPageChange} quiet />
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
            placeholder="Search projects, actors, places"
            aria-label="Search commitments"
          />
          {query && (
            <button className="search__clear" onClick={() => onQuery("")} aria-label="Clear search" type="button">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="18" y1="6" x2="6" y2="18" />
              </svg>
            </button>
          )}
        </div>
      )}

      {onAtlas && (
        <button className="icon-btn menu-toggle" onClick={onToggleDetail} aria-label="Open insights panel" type="button">
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

function NavTab({
  id,
  label,
  page,
  onPageChange,
  quiet,
  lead,
}: {
  id: Page;
  label: string;
  page: Page;
  onPageChange: (p: Page) => void;
  quiet?: boolean;
  lead?: boolean;
}) {
  const current = page === id;
  return (
    <button
      type="button"
      className={`nav-tab${lead ? " nav-tab--lead" : ""}${quiet ? " nav-tab--quiet" : ""}`}
      aria-current={current ? "page" : undefined}
      data-nav-current={current ? "true" : undefined}
      onClick={() => onPageChange(id)}
    >
      {label}
    </button>
  );
}

function placeStoryPanel(button: HTMLButtonElement | null, panel: HTMLDivElement) {
  if (!button) return;
  const rect = button.getBoundingClientRect();
  const width = panel.offsetWidth || 200;
  const margin = 8;
  let left = rect.left;
  if (left + width > window.innerWidth - margin) left = window.innerWidth - margin - width;
  left = Math.max(margin, left);
  let top = rect.bottom + 6;
  const height = panel.offsetHeight || 180;
  if (top + height > window.innerHeight - margin) top = Math.max(margin, rect.top - height - 6);
  panel.style.top = `${Math.round(top)}px`;
  panel.style.left = `${Math.round(left)}px`;
}
