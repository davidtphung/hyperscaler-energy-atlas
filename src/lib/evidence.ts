import type { Commitment } from "../types";

export type EvidenceMark = "FACT" | "EMPTY PRIMARY" | "CLAIM";

export interface FieldEvidence {
  mark: EvidenceMark;
  reason: string;
}

export interface RowEvidence {
  status: FieldEvidence;
  mw: FieldEvidence;
}

/**
 * Allowlist of rows whose cited link states no per-plant MW.
 * meta-socrates-south-btm-200: Cited filing gives 556 MW combined for both plants, no per-plant MW, and does not name the customer.
 * meta-socrates-north-btm-200: Cited filing gives 556 MW combined for both plants, no per-plant MW, and does not name the customer.
 */
const EMPTY_PRIMARY_MW_REASON: Record<string, string> = {
  "meta-socrates-south-btm-200":
    "Cited filing gives 556 MW combined for both plants, no per-plant MW, and does not name the customer",
  "meta-socrates-north-btm-200":
    "Cited filing gives 556 MW combined for both plants, no per-plant MW, and does not name the customer",
  "stargate-port-washington-wisconsin-vantage":
    "The cited 27 April 2026 release shows no MW figure (EMPTY PRIMARY for the figure). The campus page states 902 MW of critical IT load and is undated. That figure does not count.",
  "bloom-brookfield-fuel-cells":
    "The 13 October 2025 release does not state a megawatt figure for the partnership (EMPTY PRIMARY for the figure). The 1,000 MW stored on this row is not in that release.",
};

/**
 * google-van-buren-dte-u22058: the 1 Oct 2026 MPSC release does not state a megawatt size.
 * A 1.0 GW facility figure is a CLAIM and is not stored on the row.
 */
const CLAIM_MW_REASON: Record<string, string> = {
  "google-van-buren-dte-u22058":
    "The 1 Oct 2026 MPSC release does not state a megawatt size. A 1.0 GW facility figure is a CLAIM and is not stored on this row.",
  "google-nv-energy-clean-transition-tariff-corsac":
    "Tariff approval only. The cited link does not show a plant being built or running.",
  "coreweave-applied-digital-ellendale":
    "CLAIM. These are company statements. 400 MW contracted across three leases. 250 MW counted. The last 150 MW is not counted: the FY2026 10-K says under construction in Item 1 (printed p.6) and currently in the design phase in Note 17 (printed p.119). It returns to the count only when a primary shows work at that hall.",
};

export function emptyPrimaryMwIds(): string[] {
  return Object.keys(EMPTY_PRIMARY_MW_REASON);
}

/** Status and MW evidence from the row and the allowlist. No new facts. */
export function evidenceFor(
  row: Pick<Commitment, "id" | "counts" | "capacityMW">,
): RowEvidence {
  const emptyMw = EMPTY_PRIMARY_MW_REASON[row.id];
  const claimMw = CLAIM_MW_REASON[row.id];
  const status: FieldEvidence =
    row.counts === "yes"
      ? { mark: "FACT", reason: "This row counts, so its cited link supports the status." }
      : { mark: "CLAIM", reason: "Status is stored on the row and is not treated as cited status evidence here." };

  let mw: FieldEvidence;
  if (emptyMw) {
    mw = { mark: "EMPTY PRIMARY", reason: emptyMw };
  } else if (claimMw) {
    mw = { mark: "CLAIM", reason: claimMw };
  } else if (row.capacityMW == null) {
    mw = { mark: "CLAIM", reason: "No MW is stored on this row." };
  } else if (row.counts === "yes") {
    mw = { mark: "FACT", reason: "MW is the figure stored on this counted row." };
  } else {
    mw = { mark: "CLAIM", reason: "MW is stored on the row and is not in a counted total." };
  }

  return { status, mw };
}
