import { useMemo } from "react";
import type { PreparedCommitment } from "../types";
import { financeSources } from "../lib/finance";

interface Props {
  commitments: PreparedCommitment[];
}

const REFERENCES: { name: string; what: string; url: string }[] = [
  { name: "Carnegie Endowment", what: "Research on hyperscaler power commitments and grid impact", url: "https://carnegieendowment.org/" },
  { name: "World Nuclear News", what: "Primary reporting on nuclear restarts, SMRs, and corporate PPAs", url: "https://www.world-nuclear-news.org/" },
  { name: "Data Center Dynamics", what: "Datacenter capacity, power deals, and campus announcements", url: "https://www.datacenterdynamics.com/" },
  { name: "U.S. Energy Information Administration", what: "Electricity demand, generation, and capacity data", url: "https://www.eia.gov/electricity/" },
  { name: "IEA, Electricity and data centres", what: "Global outlook on datacenter electricity demand", url: "https://www.iea.org/energy-system/buildings/data-centres-and-data-transmission-networks" },
  { name: "BloombergNEF", what: "Corporate clean energy procurement league tables", url: "https://about.bnef.com/" },
  { name: "carbonintensity.org.uk", what: "Live Great Britain grid carbon intensity and generation mix", url: "https://carbonintensity.org.uk/" },
  { name: "Tomasz Tunguz, Concrete, Silicon, & Leverage", what: "Analyst essay on a claimed $4T AI data-center debt wave (Finance tab)", url: "https://tomtunguz.com/the-4-trillion-dollar-ai-data-center-debt-wave/" },
  { name: "Tunguz on X", what: "Companion thread to the $4T debt essay", url: "https://x.com/ttunguz/status/2095915990106427550" },
  { name: "SIFMA, US corporate bonds", what: "US corporate bond outstanding stock $11.7T as of 1Q26 (Finance tab, primary)", url: "https://www.sifma.org/research/statistics/us-corporate-bonds-statistics" },
  { name: "SIFMA, US municipal bonds", what: "US municipal outstanding $4.5T as of 1Q26 (Finance tab, primary)", url: "https://www.sifma.org/research/statistics/us-municipal-bonds-statistics" },
  { name: "SIFMA Research Quarterly, FI outstanding", what: "US FI $50.5T and commercial paper $1.4T as of 1Q26 (Finance tab, primary)", url: "https://www.sifma.org/research/statistics/research-quarterly-fixed-income-outstanding" },
  { name: "Federal Reserve Z.1 F3.4.s", what: "US municipal securities outstanding, alternate Fed print (Finance tab, primary)", url: "https://www.federalreserve.gov/RELEASES/z1/current/html/F3_4_s.htm" },
  { name: "Microsoft FY26 Q3 / Q4 earnings", what: "AI ARR $37B (Apr) and FY26 Azure revenue surpassed $100B (Jul)", url: "https://news.microsoft.com/source/2026/04/29/microsoft-cloud-and-ai-strength-fuels-third-quarter-results/" },
  { name: "Amazon.com Q2 2026 results", what: "AWS AI ARR >$25B and chips ARR >$25B", url: "https://ir.aboutamazon.com/news-release/news-release-details/2026/Amazon-com-Announces-Second-Quarter-Results/" },
  { name: "Alphabet Q2 2026 Exhibit 99.1", what: "Google Cloud $24.8B / +82%", url: "https://www.sec.gov/Archives/edgar/data/1652044/000165204426000066/googexhibit991q22026.htm" },
  { name: "Alphabet Q2 2026 earnings call", what: "Google Cloud backlog $514B (IR call; not in EX-99.1)", url: "https://abc.xyz/investor/events/event-details/2026/2026-Q2-Earnings-Call-2026-GgTAq7Is0z/default.aspx" },
  { name: "Oracle FY26 results", what: "Cloud Infra $18.1B FY26 and RPO $638B", url: "https://investor.oracle.com/investor-news/news-details/2026/Oracle-Announces-Record-Q4-and-FY-2026-Results-Driven-by-Cloud-Infrastructure--Cloud-Applications/default.aspx" },
  { name: "J.P. Morgan AM, hyperscaler debt", what: "Claim: $5.5T AI investment, ~$1.4T leases, ~$1.5T purchases", url: "https://am.jpmorgan.com/gb/en/asset-management/adv/insights/market-insights/market-updates/on-the-minds-of-investors/hyperscaler-debt-issuance-ai-buildout/" },
  { name: "Fortune / JPM Global Research", what: "Claim restatement: $5.5T AI capex and $4.1T debt financing", url: "https://fortune.com/2026/06/25/what-bubble-jpmorgan-5-5-trillion-ai-capex-explosion-profitable-for-now/" },
  { name: "FSB private credit", what: "Primary: $1.5–2.0T private credit assets at end-2024", url: "https://www.fsb.org/2026/05/fsb-warns-on-private-credit-vulnerabilities/" },
  { name: "PIMCO private credit TAM", what: "Secondary triangulation ~$3.2T AUM; Preqin raw not found free", url: "https://www.pimco.com/nl/en/insights/how-large-is-private-credits-total-addressable-market-really" },
  { name: "CoreWeave DDTL 4.0", what: "Primary-press: $8.5B IG delayed-draw term loan (Mar 2026)", url: "https://www.businesswire.com/news/home/20260330529766/en/CoreWeave-Closes-Landmark-%248.5-Billion-Financing-Facility-Achieving-First-Investment-Grade-Rated-GPU-backed-Financing" },
  { name: "Gartner IT spending forecast", what: "Worldwide software and IT spending tables via Gartner press (Finance tab)", url: "https://www.businesswire.com/news/home/20260422301495/en/Gartner-Forecasts-Worldwide-IT-Spending-to-Grow-13.5-in-2026-Totaling-%246.31-Trillion" },
  { name: "Van Nieuwerburgh, Financing the AI Buildout", what: "Columbia paper on facility leverage, Beignet / Hyperion, and US capex scale", url: "https://business.columbia.edu/sites/default/files-efs/imce-uploads/svannieuwerburgh/papers/FinancingAIBuildout_03192026.pdf" },
  { name: "IRS Publication 4078", what: "Tax-exempt bond private-use tests that bound municipal funding of private campuses", url: "https://www.irs.gov/publications/p4078" },
];

export default function SourcesView({ commitments }: Props) {
  const finance = useMemo(() => financeSources(), []);
  const sources = useMemo(() => {
    const map = new Map<string, { url: string; count: number; high: number }>();
    for (const c of commitments) {
      const e = map.get(c.sourceName) ?? { url: c.sourceUrl, count: 0, high: 0 };
      e.count += 1;
      if (c.confidence === "high") e.high += 1;
      map.set(c.sourceName, e);
    }
    return [...map.entries()].sort((a, b) => b[1].count - a[1].count);
  }, [commitments]);

  return (
    <div className="page page--sources">
      <header className="page__head">
        <p className="overview__eyebrow">Provenance</p>
        <h1 className="page__title">Sources and evidence</h1>
        <p className="page__lead">
          Every commitment in the atlas links to a primary source. Below is the full list of sources behind the
          {" "}current view, the Finance-layer prints and claims, plus the reference trackers that frame the space.
        </p>
      </header>

      <div className="sources-cols">
        <section aria-label="Primary sources">
          <h2 className="sources-h">Primary sources in view ({sources.length})</h2>
          <ul className="source-list">
            {sources.map(([name, e]) => (
              <li key={name} className="source-row">
                <a className="source-row__link" href={e.url} target="_blank" rel="noopener noreferrer">
                  {name}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M7 17 17 7M9 7h8v8" />
                  </svg>
                </a>
                <span className="source-row__meta">
                  {e.count} record{e.count === 1 ? "" : "s"}
                  {e.high > 0 && <span className="source-row__hi">{e.high} high confidence</span>}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-label="Reference trackers">
          <h2 className="sources-h">Reference trackers and research</h2>
          <ul className="source-list">
            {REFERENCES.map((r) => (
              <li key={r.name} className="source-row">
                <a className="source-row__link" href={r.url} target="_blank" rel="noopener noreferrer">
                  {r.name}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M7 17 17 7M9 7h8v8" />
                  </svg>
                </a>
                <span className="source-row__meta">{r.what}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section aria-label="Finance layer sources" style={{ marginTop: 36 }}>
        <h2 className="sources-h">Finance layer ({finance.length})</h2>
        <p className="page__lead" style={{ fontSize: 13.5, marginBottom: 12 }}>
          Capital-market prints and claims used on the Finance tab. Primary means Fed, SIFMA, Gartner
          press, IRS, or a Columbia paper we opened. Claims stay labeled as claims.
        </p>
        <ul className="source-list">
          {finance.map((s) => (
            <li key={s.name} className="source-row">
              <a className="source-row__link" href={s.url} target="_blank" rel="noopener noreferrer">
                {s.name}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M7 17 17 7M9 7h8v8" />
                </svg>
              </a>
              <span className="source-row__meta">
                {s.count} metric{s.count === 1 ? "" : "s"}
                {s.primary > 0 && <span className="source-row__hi">{s.primary} primary</span>}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
