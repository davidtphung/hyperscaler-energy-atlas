export type Page = "atlas" | "datacenters" | "contested" | "policy" | "portfolio" | "about" | "donate";

interface Props {
  page: Page;
  onPageChange: (p: Page) => void;
  query: string;
  onQuery: (q: string) => void;
  onToggleRail: () => void;
  onToggleDetail: () => void;
}

const PAGES: { id: Page; label: string }[] = [
  { id: "atlas", label: "Atlas" },
  { id: "datacenters", label: "Data Centers" },
  { id: "contested", label: "Contested" },
  { id: "policy", label: "Policy" },
  { id: "portfolio", label: "Analysis" },
  { id: "about", label: "About" },
  { id: "donate", label: "Donate" },
];

export default function TopBar({ page, onPageChange, query, onQuery, onToggleRail, onToggleDetail }: Props) {
  const onAtlas = page === "atlas";
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

      <nav className="nav-tabs" aria-label="Views">
        {PAGES.map((p) => (
          <button
            key={p.id}
            className="nav-tab"
            aria-current={page === p.id ? "page" : undefined}
            onClick={() => onPageChange(p.id)}
          >
            {p.label}
          </button>
        ))}
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
