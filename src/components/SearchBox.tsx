import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import type { PreparedCommitment } from "../types";
import { formatBoundPower, formatNumberKindShort } from "../lib/format";
import {
  highlightParts,
  parseSearchQuery,
  queryTerms,
  withoutChip,
  type Ranked,
} from "../lib/search";
import { STATUS } from "../lib/theme";

interface Props {
  label: string;
  placeholder: string;
  query: string;
  onQuery: (q: string) => void;
  results: Ranked<PreparedCommitment>[];
  onSelect: (id: string) => void;
  variant: "bar" | "rail";
}

export default function SearchBox({ label, placeholder, query, onQuery, results, onSelect, variant }: Props) {
  const listId = useId();
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const open = query.trim().length > 0;
  const parsed = parseSearchQuery(query);
  const terms = queryTerms(query);
  const count = results.length;
  const shown = results.slice(0, 30);
  const activeIndex = shown.length === 0 ? -1 : Math.min(active, shown.length - 1);
  const activeId = activeIndex >= 0 ? `${listId}-opt-${activeIndex}` : undefined;

  useEffect(() => {
    setActive(0);
  }, [query]);

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (shown.length === 0) return;
      setActive((i) => (i + 1) % shown.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (shown.length === 0) return;
      setActive((i) => (i - 1 + shown.length) % shown.length);
    } else if (e.key === "Home") {
      if (!open) return;
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End") {
      if (!open) return;
      e.preventDefault();
      setActive(Math.max(0, shown.length - 1));
    } else if (e.key === "Enter") {
      const hit = shown[activeIndex];
      if (!hit) return;
      e.preventDefault();
      onSelect(hit.row.id);
    } else if (e.key === "Escape") {
      if (!query) return;
      e.preventDefault();
      e.stopPropagation();
      onQuery("");
    }
  };

  return (
    <div className={`searchbox searchbox--${variant}`}>
      <div className={variant === "bar" ? "search" : "rail__search"} role="search">
        <span className="search__icon" aria-hidden="true">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.5" y2="16.5" />
          </svg>
        </span>
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={open ? activeId : undefined}
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          aria-label={label}
        />
        {variant === "bar" && query && (
          <button className="search__clear" onClick={() => onQuery("")} aria-label="Clear search" type="button">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        )}
      </div>
      {parsed.chips.length > 0 && (
        <div className="search-chips">
          {parsed.chips.map((chip) => (
            <button
              key={`${chip.key}-${chip.start}`}
              type="button"
              className="search-chip"
              onClick={() => onQuery(withoutChip(query, chip))}
            >
              {chip.label}
              <span aria-hidden="true"> ×</span>
              <span className="sr-only">Remove {chip.label}</span>
            </button>
          ))}
        </div>
      )}
      {open && (
        <div className={`search-results${variant === "bar" ? " search-results--pop" : ""}`} id={listId}>
          <div className="search-results__bar" aria-live="polite">
            <span>
              {count} ranked {count === 1 ? "match" : "matches"}
            </span>
            <button type="button" onClick={() => onQuery("")}>
              Clear
            </button>
          </div>
          {shown.length === 0 ? (
            <p className="search-empty" role="status">
              No rows match. Try a name, a source, or a chip such as kind:on_site state:OH counted:yes.
            </p>
          ) : (
            <ul className="search-results__list" role="listbox" aria-label={label}>
              {shown.map((hit, index) => {
                const kind = formatNumberKindShort(hit.row.numberKind);
                return (
                  <li key={hit.row.id} role="presentation">
                    <button
                      type="button"
                      id={`${listId}-opt-${index}`}
                      role="option"
                      aria-selected={index === activeIndex}
                      className={`search-hit${index === activeIndex ? " search-hit--active" : ""}`}
                      onMouseEnter={() => setActive(index)}
                      onClick={() => onSelect(hit.row.id)}
                    >
                      <span className="search-hit__buyer">
                        <Mark text={hit.row.buyer} terms={terms} />
                      </span>
                      <span className="search-hit__project">
                        <Mark text={hit.row.project} terms={terms} />
                      </span>
                      <span className="search-hit__meta">
                        {formatBoundPower(hit.row.capacityMW, hit.row.bound)}
                        {" · "}
                        {kind}
                        {" · "}
                        {STATUS[hit.row.status].label}
                        {hit.row.state ? ` · ${hit.row.state}` : ""}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {count > shown.length && (
            <p className="search-empty">Showing {shown.length} of {count}.</p>
          )}
        </div>
      )}
    </div>
  );
}

function Mark({ text, terms }: { text: string; terms: string[] }) {
  const parts = highlightParts(text, terms);
  return (
    <>
      {parts.map((part, index) =>
        part.hit ? (
          <mark key={index} className="search-mark">
            {part.text}
          </mark>
        ) : (
          <span key={index}>{part.text}</span>
        ),
      )}
    </>
  );
}
