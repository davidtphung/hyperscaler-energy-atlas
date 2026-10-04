import type { FilterState, FacetCounts } from "../lib/select";
import { FIRM_KIND_ORDER, stateFacets } from "../lib/select";
import type { Ranked } from "../lib/search";
import type { CountsFlag, NumberKind, TechType, Status, Category, Era, ActorKind, PreparedCommitment } from "../types";
import { TECH, TECH_ORDER, STATUS, CATEGORY, techColor, buyerAccent } from "../lib/theme";
import { ERA, ERA_ORDER } from "../lib/era";
import { ACTOR_KIND_ORDER, actorKindForBuyer } from "../lib/actors";
import { formatNumberKindShort } from "../lib/format";
import AskAtlas from "./AskAtlas";
import SearchBox from "./SearchBox";

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
  onToggleKind: (v: NumberKind) => void;
  onToggleCounted: (v: CountsFlag) => void;
  onToggleState: (v: string) => void;
  onClear: () => void;
  onClose: () => void;
  ranked: Ranked<PreparedCommitment>[];
  rows: PreparedCommitment[];
  onSelect: (id: string) => void;
  askQuestion: string;
  onAskQuestion: (q: string) => void;
  onAskHighlight: (ids: string[]) => void;
}

const KIND_FILTERS: NumberKind[] = [
  ...FIRM_KIND_ORDER,
  "utility_load",
  "program",
  "equipment_supply",
  "storage",
  "unresolved",
];

const STATUS_ORDER: Status[] = ["operational", "construction", "permitted", "contracted", "ppa-signed", "announced", "exploratory"];
const CAT_ORDER: Category[] = ["energy", "datacenter"];

function groupActors(buyers: string[]): { kind: ActorKind; buyers: string[] }[] {
  const groups = new Map<ActorKind, string[]>();
  for (const buyer of buyers) {
    const kind = actorKindForBuyer(buyer);
    const list = groups.get(kind);
    if (list) list.push(buyer);
    else groups.set(kind, [buyer]);
  }
  return ACTOR_KIND_ORDER.filter((kind) => groups.has(kind)).map((kind) => ({
    kind,
    buyers: groups.get(kind) ?? [],
  }));
}

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
  onToggleKind,
  onToggleCounted,
  onToggleState,
  onClear,
  onClose,
  ranked,
  rows,
  onSelect,
  askQuestion,
  onAskQuestion,
  onAskHighlight,
}: Props) {
  const places = stateFacets(rows);
  const anyActive =
    filters.buyers.size +
      filters.techs.size +
      filters.statuses.size +
      filters.categories.size +
      filters.eras.size +
      filters.kinds.size +
      filters.counted.size +
      filters.states.size >
    0;

  return (
    <nav className={`rail${open ? " rail--open" : ""}`} aria-label="Filters" id="filters">
      <SearchBox
        variant="rail"
        label="Search atlas rows in the filter list"
        placeholder="Search rows, or kind:on_site state:OH"
        query={query}
        onQuery={onQuery}
        results={ranked}
        onSelect={onSelect}
      />

      <AskAtlas
        rows={rows}
        question={askQuestion}
        onQuestion={onAskQuestion}
        onSelect={onSelect}
        onHighlight={onAskHighlight}
      />

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
          <h3 className="rail__title">Kind</h3>
        </div>
        <div className="chips">
          {KIND_FILTERS.map((kind) => {
            const on = filters.kinds.has(kind);
            const n = counts.kinds[kind] ?? 0;
            return (
              <button key={kind} className="chip" aria-pressed={on} onClick={() => onToggleKind(kind)}>
                {formatNumberKindShort(kind)}
                <span className="chip__count">{n}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rail__group">
        <div className="rail__head">
          <h3 className="rail__title">Counted</h3>
        </div>
        <div className="chips">
          {(["yes", "no"] as CountsFlag[]).map((flag) => {
            const on = filters.counted.has(flag);
            const n = counts.counted[flag] ?? 0;
            return (
              <button key={flag} className="chip" aria-pressed={on} onClick={() => onToggleCounted(flag)}>
                {flag === "yes" ? "Counted" : "Not counted"}
                <span className="chip__count">{n}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rail__group">
        <div className="rail__head">
          <h3 className="rail__title">State</h3>
        </div>
        <div className="chips">
          {places.filter((place) => (counts.states[place.key] ?? 0) > 0 || filters.states.has(place.key)).map((place) => {
            const on = filters.states.has(place.key);
            const n = counts.states[place.key] ?? 0;
            return (
              <button key={place.key} className="chip" aria-pressed={on} onClick={() => onToggleState(place.key)}>
                {place.label}
                <span className="chip__count">{n}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rail__group">
        <div className="rail__head">
          <h3 className="rail__title">Actor</h3>
        </div>
        <div className="chip-groups">
          {groupActors(buyers).map((group) => (
            <div key={group.kind}>
              <div className="chip-group__label">{group.kind}</div>
              <div className="chips">
                {group.buyers.map((b) => {
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
          ))}
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
