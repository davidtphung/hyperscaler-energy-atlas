import type {
  Commitment,
  DataCenter,
  FinanceConfidence,
  FinanceKind,
  FinanceMetric,
  FinanceStamp,
  NumberKind,
  RealEstateDeal,
  Status,
} from "../types";
import { FINANCE } from "../data/finance";
import { STATUS } from "./theme";

/** Legacy rows have no numberKind. Treat them as announcement / commitment electrical MW. */
export const DEFAULT_NUMBER_KIND: NumberKind = "announcement-electrical";

/** Kinds that must never enter Committed GW or status-operational GW. */
export const NON_POWER_NUMBER_KINDS: ReadonlySet<NumberKind> = new Set([
  "contracted-it",
  "energized",
  "oem-slot",
]);

export function commitmentNumberKind(c: Pick<Commitment, "numberKind">): NumberKind {
  return c.numberKind ?? DEFAULT_NUMBER_KIND;
}

/** True only for announcement / commitment electrical MW (or the legacy default). */
export function isAnnouncementElectrical(c: Pick<Commitment, "numberKind">): boolean {
  return commitmentNumberKind(c) === "announcement-electrical";
}

export function metricsByKind(kind: FinanceKind, rows: FinanceMetric[] = FINANCE): FinanceMetric[] {
  return rows.filter((r) => r.kind === kind);
}

export function metricById(id: string, rows: FinanceMetric[] = FINANCE): FinanceMetric | undefined {
  return rows.find((r) => r.id === id);
}

export function requireMetric(id: string, rows: FinanceMetric[] = FINANCE): FinanceMetric {
  const row = metricById(id, rows);
  if (!row) throw new Error(`Missing finance metric: ${id}`);
  return row;
}

export const FINANCE_STAMP: Record<FinanceStamp, { label: string; blurb: string }> = {
  cited: {
    label: "Cited",
    blurb: "A sourced print or an analyst cite. Still wears primary / secondary / claim.",
  },
  sample: {
    label: "Sample",
    blurb: "Scenario arithmetic on cited inputs (for example 70% × $5T). Not a market print.",
  },
};

export const FINANCE_CONFIDENCE: Record<FinanceConfidence, { label: string; blurb: string; color: string }> = {
  primary: {
    label: "Primary / verified",
    blurb: "Filings, Fed / Treasury / SIFMA prints, Gartner press tables, or a Columbia paper we opened.",
    color: "#c8f135",
  },
  secondary: {
    label: "Secondary",
    blurb: "A careful restatement of a primary we could not open ourselves.",
    color: "#7fc4ec",
  },
  claim: {
    label: "Analyst claim",
    blurb: "Tunguz, house research he cites, or arithmetic on those claims. Never treat as a hard print.",
    color: "#f2a93b",
  },
};

export interface WaterfallStep {
  id: string;
  title: string;
  display: string;
  assumption: string;
  row: FinanceMetric;
}

export function waterfallSteps(rows: FinanceMetric[] = FINANCE): WaterfallStep[] {
  const pick = (id: string, title: string, assumption: string): WaterfallStep => {
    const row = requireMetric(id, rows);
    return { id, title, display: row.display, assumption, row };
  };
  return [
    pick("stack-debt-4t", "Debt to service", "Headline $4T claim, not the $3.5T 70% case."),
    pick("wf-rate", "Coupon band", "Single rate applied to the whole stock. Not a forward curve."),
    pick("wf-interest", "Annual interest", "$4T × 6.5% = $260B; × 7.5% = $300B."),
    pick("wf-coverage", "IG coverage", "Teaching multiple. Covenants vary by deal."),
    pick("wf-op-profit", "Operating profit", "$260B × 3 = $780B, rounded to ~$800B; $300B × 3 = $900B."),
    pick("wf-gm", "Gross margin", "Cloud / AI GM assumption, not a measured mix."),
    pick("wf-revenue", "AI revenue", "Op profit ÷ GM. Published band $1.2T to $1.5T."),
  ];
}

export interface CreditCompareRow {
  id: string;
  market: string;
  stock: FinanceMetric;
  versus: string;
  note: string;
}

export function creditCompareRows(rows: FinanceMetric[] = FINANCE): CreditCompareRow[] {
  return [
    {
      id: "ai-debt",
      market: "Claimed AI data-center debt (multi-year flow)",
      stock: requireMetric("stack-debt-4t", rows),
      versus: "Reference bar",
      note: "Issuance over several years, not a stock already outstanding.",
    },
    {
      id: "corps",
      market: "US corporate bonds outstanding",
      stock: requireMetric("mkt-us-corp", rows),
      versus: requireMetric("cmp-corp-34", rows).display,
      note: requireMetric("cmp-corp-34", rows).notes,
    },
    {
      id: "munis",
      market: "US municipal securities outstanding",
      stock: requireMetric("mkt-us-muni-fed", rows),
      versus: requireMetric("cmp-muni-91", rows).display,
      note: requireMetric("cmp-muni-91", rows).notes,
    },
    {
      id: "pcred",
      market: "Global private credit AUM",
      stock: requireMetric("mkt-private-credit", rows),
      versus: "Larger than most private-credit tallies",
      note: requireMetric("mkt-private-credit", rows).notes,
    },
    {
      id: "cp",
      market: "US commercial paper outstanding",
      stock: requireMetric("mkt-us-cp", rows),
      versus: requireMetric("cmp-cp-triple", rows).display,
      note: requireMetric("cmp-cp-triple", rows).notes,
    },
  ];
}

export interface StackScenario {
  id: string;
  label: string;
  leveragePct: string;
  debt: FinanceMetric;
  equity: FinanceMetric;
  note: string;
}

export function stackScenarios(rows: FinanceMetric[] = FINANCE): StackScenario[] {
  return [
    {
      id: "mid",
      label: "70% facility case",
      leveragePct: "70%",
      debt: requireMetric("stack-debt-70", rows),
      equity: requireMetric("stack-equity-30", rows),
      note: "Midpoint of Tunguz 65% to 75% on his $5T envelope.",
    },
    {
      id: "headline",
      label: "Tunguz headline",
      leveragePct: "80%",
      debt: requireMetric("stack-debt-4t", rows),
      equity: requireMetric("stack-equity-20", rows),
      note: "$4T is 80% of $5T, closer to Columbia's 70% to 80% facility band or a book with 90% SPVs.",
    },
  ];
}

export interface CommitmentStatusRow {
  status: Status;
  count: number;
  mw: number;
}

export interface CommitmentBridge {
  count: number;
  energyCount: number;
  datacenterCount: number;
  withCapacityCount: number;
  /**
   * Sum of announcement-electrical capacityMW only.
   * Contracted-IT / energized / OEM-slot kinds are excluded. Missing numberKind
   * defaults to announcement-electrical. Not energized draw.
   */
  committedMW: number;
  operationalCount: number;
  /** Announcement-electrical MW on rows with status operational. Not metered. */
  operationalMW: number;
  /** Rows whose numberKind is contracted-it, energized, or oem-slot. */
  excludedKindCount: number;
  excludedKindMW: number;
  byStatus: CommitmentStatusRow[];
}

/**
 * Computed from `commitments.ts`. Does not blindly sum every capacityMW.
 * Committed GW and status-operational GW use announcement-electrical rows only.
 */
export function commitmentBridge(list: Commitment[]): CommitmentBridge {
  const byStatusMap = new Map<Status, { count: number; mw: number }>();
  let withCapacityCount = 0;
  let committedMW = 0;
  let energyCount = 0;
  let datacenterCount = 0;
  let operationalCount = 0;
  let operationalMW = 0;
  let excludedKindCount = 0;
  let excludedKindMW = 0;

  for (const c of list) {
    if (c.category === "energy") energyCount += 1;
    if (c.category === "datacenter") datacenterCount += 1;
    const mw = c.capacityMW ?? 0;
    if (c.capacityMW != null) withCapacityCount += 1;

    const power = isAnnouncementElectrical(c);
    if (!power) {
      excludedKindCount += 1;
      excludedKindMW += mw;
    } else {
      committedMW += mw;
      if (c.status === "operational") {
        operationalCount += 1;
        operationalMW += mw;
      }
    }

    const row = byStatusMap.get(c.status) ?? { count: 0, mw: 0 };
    row.count += 1;
    if (power) row.mw += mw;
    byStatusMap.set(c.status, row);
  }

  const byStatus = [...byStatusMap.entries()]
    .sort((a, b) => STATUS[a[0]].rank - STATUS[b[0]].rank)
    .map(([status, row]) => ({ status, count: row.count, mw: row.mw }));

  return {
    count: list.length,
    energyCount,
    datacenterCount,
    withCapacityCount,
    committedMW,
    operationalCount,
    operationalMW,
    excludedKindCount,
    excludedKindMW,
    byStatus,
  };
}

export interface DirectoryBridge {
  campusCount: number;
  disclosedCount: number;
  /** Sum of disclosed/estimated campus capacityMW. Headline size, not energized draw. */
  disclosedMW: number;
}

/** Computed from `datacenters.ts`. Campus headline size is not metered load. */
export function directoryBridge(list: DataCenter[]): DirectoryBridge {
  let disclosedCount = 0;
  let disclosedMW = 0;
  for (const d of list) {
    if (d.capacityMW == null) continue;
    disclosedCount += 1;
    disclosedMW += d.capacityMW;
  }
  return { campusCount: list.length, disclosedCount, disclosedMW };
}

export interface EconomicsPointer {
  dealCount: number;
  dealValueUSD: number;
}

/** Real-estate deals only. Construction benchmarks stay on Economics. */
export function economicsPointer(list: RealEstateDeal[]): EconomicsPointer {
  return {
    dealCount: list.length,
    dealValueUSD: list.reduce((acc, d) => acc + (d.priceUSD ?? 0), 0),
  };
}

export function moneyUnitLabel(m: FinanceMetric): string {
  if (m.unit === "USD") {
    if (m.kind === "runrate" || m.id === "wf-revenue") return "USD revenue";
    if (m.kind === "waterfall") return "USD credit / P&L sample";
    return "USD credit";
  }
  if (m.unit === "pct") return m.kind === "leverage" ? "percent leverage" : "percent";
  if (m.unit === "ratio") return "ratio";
  if (m.unit === "GW") return "GW (claim row; not plotted on USD axes)";
  return "text";
}

export type UnitKeySlot = "yes" | "no" | "bridge";

export const UNIT_KEY: { unit: string; onPane: UnitKeySlot; where: string }[] = [
  { unit: "USD credit / capex / market stock", onPane: "yes", where: "This pane. Labeled Cited or Sample." },
  { unit: "USD implied revenue / run-rate", onPane: "yes", where: "Waterfall only. Claim or sample, never COD." },
  {
    unit: "Announcement / commitment GW",
    onPane: "bridge",
    where: "Atlas bridge. Announcement-electrical capacityMW only (legacy default). Never on a USD axis.",
  },
  {
    unit: "Status-operational GW",
    onPane: "bridge",
    where: "Atlas bridge. Announcement-electrical MW on operational rows. Not metered draw.",
  },
  {
    unit: "Campus directory GW",
    onPane: "bridge",
    where: "Directory bridge, from datacenters.ts. Headline campus size, not energized.",
  },
  {
    unit: "Contracted IT MW",
    onPane: "no",
    where: "Excluded from Committed GW when numberKind is contracted-it. Untagged rows default to announcement-electrical.",
  },
  { unit: "Energized / metered MW", onPane: "no", where: "Not tracked. Operational status is not a meter reading." },
  { unit: "Firm OEM slots vs SRA", onPane: "no", where: "Not tracked on this pane." },
  { unit: "Physical COD", onPane: "no", where: "Not implied when a bond or credit clears." },
];

export function unitKeyLabel(slot: UnitKeySlot): string {
  if (slot === "yes") return "On pane";
  if (slot === "bridge") return "Bridge";
  return "Excluded";
}

const SOURCE_LABEL: Record<string, string> = {
  "https://tomtunguz.com/the-4-trillion-dollar-ai-data-center-debt-wave/": "Tomasz Tunguz, Concrete, Silicon, & Leverage",
  "https://x.com/ttunguz/status/2095915990106427550": "Tomasz Tunguz on X",
  "https://business.columbia.edu/sites/default/files-efs/imce-uploads/svannieuwerburgh/papers/FinancingAIBuildout_03192026.pdf":
    "Van Nieuwerburgh, Financing the AI Buildout (Columbia)",
  "https://www.sifma.org/research/statistics/us-corporate-bonds-statistics": "SIFMA, US corporate bonds outstanding",
  "https://www.sifma.org/research/statistics/research-quarterly-fixed-income-outstanding":
    "SIFMA Research Quarterly, fixed income outstanding",
  "https://www.federalreserve.gov/RELEASES/z1/current/html/F3_4_s.htm": "Federal Reserve Z.1, municipal securities",
  "https://www.federalreserve.gov/releases/CP/": "Federal Reserve, commercial paper outstanding",
  "https://www.businesswire.com/news/home/20260422301495/en/Gartner-Forecasts-Worldwide-IT-Spending-to-Grow-13.5-in-2026-Totaling-%246.31-Trillion":
    "Gartner worldwide IT spending forecast",
  "https://www.irs.gov/publications/p4078": "IRS Publication 4078 (tax-exempt private use)",
};

export function financeSources(rows: FinanceMetric[] = FINANCE): { name: string; url: string; count: number; primary: number }[] {
  const map = new Map<string, { name: string; count: number; primary: number }>();
  for (const r of rows) {
    const e = map.get(r.sourceUrl) ?? { name: SOURCE_LABEL[r.sourceUrl] ?? r.sourceName, count: 0, primary: 0 };
    e.count += 1;
    if (r.confidence === "primary") e.primary += 1;
    map.set(r.sourceUrl, e);
  }
  return [...map.entries()]
    .map(([url, e]) => ({ url, ...e }))
    .sort((a, b) => b.count - a.count);
}
