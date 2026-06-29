import { useMemo } from "react";
import type { PreparedCommitment } from "../types";
import { downloadCSV } from "../lib/csv";

interface Props {
  commitments: PreparedCommitment[];
  all: PreparedCommitment[];
}

const REFERENCES: { name: string; what: string; url: string }[] = [
  { name: "Carnegie Endowment", what: "Research on hyperscaler power commitments and grid impact", url: "https://carnegieendowment.org/" },
  { name: "World Nuclear News", what: "Primary reporting on nuclear restarts, SMRs, and corporate PPAs", url: "https://www.world-nuclear-news.org/" },
  { name: "Data Center Dynamics", what: "Datacenter capacity, power deals, and campus announcements", url: "https://www.datacenterdynamics.com/" },
  { name: "U.S. Energy Information Administration", what: "Electricity demand, generation, and capacity data", url: "https://www.eia.gov/electricity/" },
  { name: "IEA, Electricity and data centres", what: "Global outlook on datacenter electricity demand", url: "https://www.iea.org/energy-system/buildings/data-centres-and-data-transmission-networks" },
  { name: "BloombergNEF", what: "Corporate clean energy procurement league tables", url: "https://about.bnef.com/" },
  { name: "carbonintensity.org.uk", what: "Live Great Britain grid carbon intensity and generation mix", url: "https://carbonintensity.org.uk/" },
];

export default function SourcesView({ commitments, all }: Props) {
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
          {" "}current view, the reference trackers that frame the space, and the underlying data to audit or export.
        </p>
        <div className="page__actions">
          <button className="btn-primary" onClick={() => downloadCSV(all)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 3v12m0 0l4-4m-4 4l-4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
            </svg>
            Export all {all.length} records (CSV)
          </button>
          {commitments.length !== all.length && (
            <button className="btn-ghost" onClick={() => downloadCSV(commitments, "hyperscaler-commitments-filtered.csv")}>
              Export {commitments.length} filtered
            </button>
          )}
        </div>
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
    </div>
  );
}
