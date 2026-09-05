import type { Commitment, FinanceConfidence, FinanceKind, FinanceMetric, Status } from "../types";
import { FINANCE } from "../data/finance";
import { sumMW } from "./select";

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

export interface CommitmentBridge {
  count: number;
  disclosed: number;
  undisclosed: number;
  mw: number;
  energyMW: number;
  datacenterMW: number;
  energyCount: number;
  datacenterCount: number;
  byBuyer: { buyer: string; count: number; mw: number }[];
  byStatus: { status: Status; count: number; mw: number }[];
}

export function commitmentBridge(list: Commitment[]): CommitmentBridge {
  const disclosed = list.filter((c) => c.capacityMW != null).length;
  const byBuyerMap = new Map<string, { count: number; mw: number }>();
  const byStatusMap = new Map<Status, { count: number; mw: number }>();
  let energyMW = 0;
  let datacenterMW = 0;
  let energyCount = 0;
  let datacenterCount = 0;
  for (const c of list) {
    const mw = c.capacityMW ?? 0;
    const b = byBuyerMap.get(c.buyer) ?? { count: 0, mw: 0 };
    b.count += 1;
    b.mw += mw;
    byBuyerMap.set(c.buyer, b);
    const s = byStatusMap.get(c.status) ?? { count: 0, mw: 0 };
    s.count += 1;
    s.mw += mw;
    byStatusMap.set(c.status, s);
    if (c.category === "energy") {
      energyCount += 1;
      energyMW += mw;
    } else {
      datacenterCount += 1;
      datacenterMW += mw;
    }
  }
  const byBuyer = [...byBuyerMap.entries()]
    .map(([buyer, v]) => ({ buyer, ...v }))
    .sort((a, b) => b.mw - a.mw || b.count - a.count);
  const byStatus = [...byStatusMap.entries()]
    .map(([status, v]) => ({ status, ...v }))
    .sort((a, b) => b.mw - a.mw);
  return {
    count: list.length,
    disclosed,
    undisclosed: list.length - disclosed,
    mw: sumMW(list),
    energyMW,
    datacenterMW,
    energyCount,
    datacenterCount,
    byBuyer,
    byStatus,
  };
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
