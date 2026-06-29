import type { FilterState, FacetCounts } from "../lib/select";
import type { TechType, Status, Category, Era } from "../types";
import { TECH, TECH_ORDER, STATUS, CATEGORY, techColor, buyerAccent } from "../lib/theme";
import { ERA, ERA_ORDER } from "../lib/era";

interface Props {
  filters: FilterState;
  counts: FacetCounts;
  buyers: string[];
  query: string;
  onQuery: (q: string) => void;
  open: boolean;
  onToggleBuyer: (v: string) => void;
  onToggleTech: (v: TechType) => void;
  onToggleStatus: (v: Status) => void;
  onToggleCategory: (v: Category) => void;
  onToggleEra: (v: Era) => void;
  onClear: () => void;
  onClose: () => void;
}

const STATUS_ORDER: Status[] = ["operational", "construction", "ppa-signed", "announced", "exploratory"];
const CAT_ORDER: Category[] = ["energy", "datacenter"];

export default function FilterRail({
  filters,
  counts,
  buyers,
  query,
  onQuery,
  open,
  onToggleBuyer,
  onToggleTech,
  onToggleStatus,
  onToggleCategory,
  onToggleEra,
  onClear,
  onClose,
}: Props) {
  const anyActive =
    filters.buyers.size + filters.techs.size + filters.statuses.size + filters.categories.size + filters.eras.size > 0;

  return (
    <nav className={`rail${open ? " rail--open" : ""}`} aria-label="Filters" id="filters">
      <div className="rail__search" role="search">
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
          placeholder="Search commitments"
          aria-label="Search commitments"
        />
      </div>

      <div className="rail__group">
        <div className="rail__head">
          <h2 className="rail__title">Filter</h2>
          <button className="rail__reset" onClick={onClear} disabled={!anyActive} style={{ opacity: anyActive ? 1 : 0.4 }}>
            Reset all
          </button>
        </div>
      </div>

      <div className="rail__group">
        <div className="rail__head">
          <h3 className="rail__title">Buyer</h3>
        </div>
        <div className="chips">
          {buyers.map((b) => {
            const on = filters.buyers.has(b);
            const n = counts.buyers[b] ?? 0;
            return (
              <button key={b} className="chip" aria-pressed={on} onClick={() => onToggleBuyer(b)}>
                <span className="chip__dot" style={{ background: buyerAccent(b) }} />
                {b}
                <span className="chip__count">{n}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rail__group">
        <div className="rail__head">
          <h3 className="rail__title">Era</h3>
        </div>
        <div className="chips">
          {ERA_ORDER.filter((e) => (counts.eras[e] ?? 0) > 0 || filters.eras.has(e)).map((e) => {
            const on = filters.eras.has(e);
            const n = counts.eras[e] ?? 0;
            return (
              <button key={e} className="chip" aria-pressed={on} onClick={() => onToggleEra(e)} title={ERA[e].blurb}>
                <span className="chip__dot" style={{ background: ERA[e].color }} />
                {ERA[e].short}
                <span className="chip__count">{n}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rail__group">
        <div className="rail__head">
          <h3 className="rail__title">Technology</h3>
        </div>
        <div className="legend">
          {TECH_ORDER.filter((t) => (counts.techs[t] ?? 0) > 0 || filters.techs.has(t)).map((t) => {
            const on = filters.techs.has(t);
            const n = counts.techs[t] ?? 0;
            return (
              <button key={t} className="legend__row" aria-pressed={on} onClick={() => onToggleTech(t)}>
                <span className="legend__swatch" style={{ background: techColor(t) }} />
                <span className="legend__label">{TECH[t].label}</span>
                <span className="legend__val">{n}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rail__group">
        <div className="rail__head">
          <h3 className="rail__title">Status</h3>
        </div>
        <div className="chips">
          {STATUS_ORDER.map((s) => {
            const on = filters.statuses.has(s);
            const n = counts.statuses[s] ?? 0;
            return (
              <button key={s} className="chip" aria-pressed={on} onClick={() => onToggleStatus(s)}>
                {STATUS[s].label}
                <span className="chip__count">{n}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rail__group">
        <div className="rail__head">
          <h3 className="rail__title">Category</h3>
        </div>
        <div className="chips">
          {CAT_ORDER.map((c) => {
            const on = filters.categories.has(c);
            const n = counts.categories[c] ?? 0;
            return (
              <button key={c} className="chip" aria-pressed={on} onClick={() => onToggleCategory(c)}>
                {CATEGORY[c].label}
                <span className="chip__count">{n}</span>
              </button>
            );
          })}
        </div>
      </div>

      <button className="icon-btn menu-toggle" style={{ width: "100%", justifyContent: "center" }} onClick={onClose}>
        Done
      </button>
    </nav>
  );
}
