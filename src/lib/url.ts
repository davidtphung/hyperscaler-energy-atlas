import type { Category, CountsFlag, Era, NumberKind, Status, TechType } from "../types";
import { emptyFilters, type FilterState } from "./select.ts";

const KINDS = new Set<NumberKind>([
  "it_capacity",
  "grid_gen_for_dc",
  "btm_gen",
  "offtake_existing",
  "offtake_new",
  "utility_load",
  "program",
  "equipment_supply",
  "storage",
  "unresolved",
]);

const STATUSES = new Set<Status>([
  "operational",
  "construction",
  "permitted",
  "contracted",
  "ppa-signed",
  "announced",
  "exploratory",
  "cancelled",
]);

const TECHS = new Set<TechType>([
  "nuclear-restart",
  "nuclear-existing",
  "smr",
  "fusion",
  "geothermal",
  "solar",
  "wind",
  "hydro",
  "gas",
  "fuel-cell",
  "storage",
  "grid",
  "datacenter",
  "mixed-renewable",
]);

const ERAS = new Set<Era>(["pre-ai", "ai-onset", "acceleration", "current", "forecast"]);
const CATS = new Set<Category>(["energy", "datacenter"]);

export interface UrlView {
  filters: FilterState;
  row: string | null;
  ask: string | null;
  anchor: "donate" | "what-counts" | null;
}

function keep<T extends string>(values: string[], allowed: Set<T>): Set<T> {
  const out = new Set<T>();
  for (const value of values) {
    if (allowed.has(value as T)) out.add(value as T);
  }
  return out;
}

export function readUrl(href: string): UrlView {
  const url = new URL(href, "https://hypergrid.davidtphung.com");
  const params = url.searchParams;
  const filters = emptyFilters(params.get("q") ?? "");
  for (const buyer of params.getAll("buyer")) {
    if (buyer) filters.buyers.add(buyer);
  }
  filters.techs = keep(params.getAll("tech"), TECHS);
  filters.statuses = keep(params.getAll("status"), STATUSES);
  filters.categories = keep(params.getAll("category"), CATS);
  filters.eras = keep(params.getAll("era"), ERAS);
  filters.kinds = keep(params.getAll("kind"), KINDS);
  const counted = new Set<CountsFlag>();
  for (const value of params.getAll("counted")) {
    if (value === "yes" || value === "no") counted.add(value);
  }
  filters.counted = counted;
  for (const state of params.getAll("state")) {
    if (state) filters.states.add(state);
  }
  const hash = url.hash.replace(/^#/, "");
  const hashKey = hash.toLowerCase();
  let row = params.get("row");
  let anchor: UrlView["anchor"] = null;
  if (hashKey === "donate" || params.get("tab")?.toLowerCase() === "donate") anchor = "donate";
  else if (hashKey === "what-counts") anchor = "what-counts";
  else if (hashKey.startsWith("row=")) row = decodeURIComponent(hash.slice(4)) || row;
  return {
    filters,
    row: row || null,
    ask: params.get("ask"),
    anchor,
  };
}

export function writeUrl(view: UrlView, current: { pathname: string }): string {
  const params = new URLSearchParams();
  if (view.filters.query) params.set("q", view.filters.query);
  for (const buyer of view.filters.buyers) params.append("buyer", buyer);
  for (const tech of view.filters.techs) params.append("tech", tech);
  for (const status of view.filters.statuses) params.append("status", status);
  for (const category of view.filters.categories) params.append("category", category);
  for (const era of view.filters.eras) params.append("era", era);
  for (const kind of view.filters.kinds) params.append("kind", kind);
  for (const counted of view.filters.counted) params.append("counted", counted);
  for (const state of view.filters.states) params.append("state", state);
  if (view.row) params.set("row", view.row);
  if (view.ask) params.set("ask", view.ask);
  const hash = view.anchor === "donate" ? "#donate" : view.anchor === "what-counts" ? "#what-counts" : "";
  const search = params.toString();
  return `${current.pathname}${search ? `?${search}` : ""}${hash}`;
}
