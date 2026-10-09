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
  "oracle-we-energies-point-beach":
    "The 2 Oct 2026 Oracle announcement does not state a megawatt figure (EMPTY PRIMARY for the figure). A trade share is not stored. This is a subscription to existing Point Beach output and it does not count.",
};

/**
 * google-van-buren-dte-u22058: 1,000 MW is company-stated in the DTE 8-K.
 * The 1 Oct 2026 MPSC release does not state a megawatt size.
 * The row stays utility load and does not count.
 */
const CLAIM_MW_REASON: Record<string, string> = {
  "google-van-buren-dte-u22058":
    "The 1,000 MW stored on this row is company-stated (DTE 8-K), not MPSC-stated. The 1 Oct 2026 MPSC release does not state a megawatt size. Up to 1,600 MW of renewables and 480 MW of storage stay note-only and are not stored as capacity.",
  "google-nv-energy-clean-transition-tariff-corsac":
    "Tariff approval only. The cited link does not show a plant being built or running.",
  "coreweave-applied-digital-ellendale":
    "CLAIM. These are company statements. 400 MW contracted across three leases. 250 MW counted, inside the 400 MW. Applied Digital says Ready for Service on 1 Oct 2026 brought fully operational critical IT load at the campus to 250 MW. That is a company statement, not measured energized load, so Energized MW is empty. The last 150 MW is not counted on this row.",
  "google-black-hills-cheyenne-lpcsa-590":
    "Company wording is up to 590 MW of grid-connected energy service. This is utility load and does not count. Plant nameplate, third-party resources, and the total resource mix are note-only and are not stored as capacity.",
  "google-georgia-power-vogtle-hatch-uprate-96":
    "About 96 MW is the approximate uprate capacity the zero-emission credits are tied to. The 6 Oct 2026 filing says no energy or capacity is sold to Google. ZEC subscription only; no energy or capacity offtake. Not counted.",
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
