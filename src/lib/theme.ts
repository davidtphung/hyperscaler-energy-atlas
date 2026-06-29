import type { TechType, Status, Category, DCStatus, FacilityType, ContestedStatus, ContestationType } from "../types";

// Technology palette. Colors are tuned for AA contrast on the deep-ink ground
// and to stay distinguishable for the most common forms of color vision
// deficiency. Color is never the sole carrier of meaning: every marker also
// exposes a text label, and the legend pairs each hue with a name.
export const TECH: Record<
  TechType,
  { label: string; short: string; color: string; group: "nuclear" | "renewable" | "firm" | "build" }
> = {
  "nuclear-restart": { label: "Nuclear restart", short: "Restart", color: "#f2a93b", group: "nuclear" },
  "nuclear-existing": { label: "Nuclear (existing)", short: "Nuclear", color: "#f6c66b", group: "nuclear" },
  smr: { label: "Small modular reactor", short: "SMR", color: "#36c5bf", group: "nuclear" },
  fusion: { label: "Fusion", short: "Fusion", color: "#a78bfa", group: "nuclear" },
  geothermal: { label: "Geothermal", short: "Geo", color: "#ef6f53", group: "renewable" },
  solar: { label: "Solar", short: "Solar", color: "#f5d547", group: "renewable" },
  wind: { label: "Wind", short: "Wind", color: "#7fc4ec", group: "renewable" },
  hydro: { label: "Hydro", short: "Hydro", color: "#5aa9e6", group: "renewable" },
  "mixed-renewable": { label: "Mixed renewable", short: "Renewable", color: "#9ad17a", group: "renewable" },
  gas: { label: "Natural gas", short: "Gas", color: "#9aa3ad", group: "firm" },
  "fuel-cell": { label: "Fuel cells", short: "Fuel cell", color: "#e0916b", group: "firm" },
  storage: { label: "Storage", short: "Storage", color: "#6ee7b7", group: "firm" },
  grid: { label: "Grid / transmission", short: "Grid", color: "#c0c7d0", group: "firm" },
  datacenter: { label: "Datacenter campus", short: "Datacenter", color: "#c8f135", group: "build" },
};

export const TECH_ORDER: TechType[] = [
  "nuclear-restart",
  "nuclear-existing",
  "smr",
  "fusion",
  "geothermal",
  "solar",
  "wind",
  "hydro",
  "mixed-renewable",
  "gas",
  "fuel-cell",
  "storage",
  "grid",
  "datacenter",
];

// Higher-level energy-source buckets for the portfolio view. Datacenter load is
// demand, not supply, so it is tracked separately from the generation mix.
export type SourceGroup =
  | "Nuclear"
  | "Fusion"
  | "Geothermal"
  | "Solar and wind"
  | "Gas and fuel cells"
  | "Storage and grid"
  | "Datacenter load";

export const SOURCE_GROUP_ORDER: SourceGroup[] = [
  "Nuclear",
  "Geothermal",
  "Solar and wind",
  "Fusion",
  "Gas and fuel cells",
  "Storage and grid",
  "Datacenter load",
];

export const SOURCE_GROUP_COLOR: Record<SourceGroup, string> = {
  Nuclear: "#f2a93b",
  Fusion: "#a78bfa",
  Geothermal: "#ef6f53",
  "Solar and wind": "#f5d547",
  "Gas and fuel cells": "#9aa3ad",
  "Storage and grid": "#6ee7b7",
  "Datacenter load": "#c8f135",
};

export function sourceGroup(t: TechType): SourceGroup {
  switch (t) {
    case "nuclear-restart":
    case "nuclear-existing":
    case "smr":
      return "Nuclear";
    case "fusion":
      return "Fusion";
    case "geothermal":
      return "Geothermal";
    case "solar":
    case "wind":
    case "hydro":
    case "mixed-renewable":
      return "Solar and wind";
    case "gas":
    case "fuel-cell":
      return "Gas and fuel cells";
    case "storage":
    case "grid":
      return "Storage and grid";
    case "datacenter":
      return "Datacenter load";
  }
}

export const STATUS: Record<Status, { label: string; rank: number }> = {
  operational: { label: "Operational", rank: 0 },
  construction: { label: "Under construction", rank: 1 },
  "ppa-signed": { label: "PPA signed", rank: 2 },
  announced: { label: "Announced", rank: 3 },
  exploratory: { label: "Exploratory", rank: 4 },
  cancelled: { label: "Cancelled", rank: 5 },
};

export const CATEGORY: Record<Category, { label: string }> = {
  energy: { label: "Energy supply" },
  datacenter: { label: "Datacenter" },
};

// Accent color per buyer, used in the timeline ledger and detail header.
export const BUYER_ACCENT: Record<string, string> = {
  Microsoft: "#7fc4ec",
  Google: "#f5d547",
  "Google / Alphabet": "#f5d547",
  Alphabet: "#f5d547",
  Amazon: "#f2a93b",
  "Amazon / AWS": "#f2a93b",
  AWS: "#f2a93b",
  Meta: "#a78bfa",
  OpenAI: "#6ee7b7",
  Oracle: "#ef6f53",
  xAI: "#c0c7d0",
  Anthropic: "#d9a066",
  CoreWeave: "#9ad17a",
  SoftBank: "#8fa0ad",
  "Crusoe Energy": "#e08a5a",
  "Holtec International": "#cdb06a",
  "Undisclosed hyperscaler": "#8a929b",
};

export function buyerAccent(buyer: string): string {
  return BUYER_ACCENT[buyer] ?? "#c8f135";
}

// Data center directory.
export const DC_STATUS: Record<DCStatus, { label: string; color: string }> = {
  operating: { label: "Operating", color: "#c8f135" },
  construction: { label: "Under construction", color: "#36c5bf" },
  announced: { label: "Announced", color: "#7fc4ec" },
  proposed: { label: "Proposed", color: "#a78bfa" },
  paused: { label: "Paused", color: "#9aa3ad" },
};
export const DC_STATUS_ORDER: DCStatus[] = ["operating", "construction", "announced", "proposed", "paused"];

export const FACILITY_TYPE: Record<FacilityType, string> = {
  hyperscale: "Hyperscale",
  colocation: "Colocation",
  "cloud-region": "Cloud region",
  "ai-campus": "AI campus",
  enterprise: "Enterprise",
};
export const FACILITY_TYPE_ORDER: FacilityType[] = ["hyperscale", "ai-campus", "colocation", "cloud-region", "enterprise"];

// Contested projects.
export const CONTESTED_STATUS: Record<ContestedStatus, { label: string; color: string }> = {
  proposed: { label: "Proposed", color: "#7fc4ec" },
  stalled: { label: "Stalled", color: "#f5d547" },
  moratorium: { label: "Moratorium", color: "#f2a93b" },
  litigation: { label: "In litigation", color: "#a78bfa" },
  denied: { label: "Denied", color: "#ef6f53" },
  blocked: { label: "Blocked", color: "#e0533a" },
  withdrawn: { label: "Withdrawn", color: "#9aa3ad" },
  "approved-revised": { label: "Approved after revisions", color: "#9ad17a" },
  operating: { label: "Operating", color: "#c8f135" },
};
export const CONTESTED_STATUS_ORDER: ContestedStatus[] = [
  "blocked", "withdrawn", "denied", "moratorium", "litigation", "stalled", "proposed", "approved-revised", "operating",
];

export const CONTESTATION_LABEL: Record<ContestationType, string> = {
  nimby: "NIMBY / neighborhood",
  environmental: "Environmental",
  water: "Water scarcity",
  "grid-power": "Grid / power",
  "noise-traffic": "Noise / traffic",
  "zoning-denial": "Zoning denial",
  "state-review": "State review",
  referendum: "Referendum",
  moratorium: "Moratorium",
  litigation: "Litigation",
  "utility-delay": "Utility delay",
  "federal-review": "Federal review",
  "political-backlash": "Political backlash",
  "company-withdrawal": "Company withdrawal",
  uncertain: "Uncertain cause",
};

export function techColor(t: TechType): string {
  return TECH[t]?.color ?? "#c8f135";
}
