// Core domain model for the Hyperscaler Energy Atlas.

export type TechType =
  | "nuclear-restart"
  | "nuclear-existing"
  | "smr"
  | "fusion"
  | "geothermal"
  | "solar"
  | "wind"
  | "hydro"
  | "gas"
  | "fuel-cell"
  | "storage"
  | "grid"
  | "datacenter"
  | "mixed-renewable";

/** Eras relative to the generative-AI boom (ChatGPT, late 2022). */
export type Era = "pre-ai" | "ai-onset" | "acceleration" | "current" | "forecast";

export type Category = "energy" | "datacenter";

export type Status =
  | "operational"
  | "construction"
  | "ppa-signed"
  | "announced"
  | "exploratory"
  | "cancelled";

export type Confidence = "high" | "medium" | "low";

export interface Commitment {
  id: string;
  /** The hyperscaler or AI compute buyer. */
  buyer: string;
  /** Energy provider, developer, or partner. Empty string when none. */
  counterparty: string;
  project: string;
  techType: TechType;
  category: Category;
  /** Electrical megawatts committed. null when genuinely unknown. */
  capacityMW: number | null;
  city: string;
  state: string;
  country: string;
  lat: number | null;
  lng: number | null;
  /** Announcement or signing date, YYYY-MM-DD or YYYY-MM. */
  date: string;
  status: Status;
  headline: string;
  summary: string;
  sourceName: string;
  sourceUrl: string;
  confidence: Confidence;
}

/** A commitment with derived, render-ready fields attached. */
export interface PreparedCommitment extends Commitment {
  /** Parsed timestamp (ms) of the commitment date. */
  t: number;
  year: number;
  era: Era;
  /** Projected screen coordinates for the active map projection, or null if off-map. */
  point: [number, number] | null;
}
