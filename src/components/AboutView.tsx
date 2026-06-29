import { ERA, ERA_ORDER } from "../lib/era";

interface Props {
  total: number;
  totalGW: string;
}

export default function AboutView({ total, totalGW }: Props) {
  return (
    <div className="page page--about">
      <header className="page__head">
        <p className="overview__eyebrow">About</p>
        <h1 className="page__title">How this atlas is built</h1>
        <p className="page__lead">
          HYPERGRID maps the energy and datacenter commitments behind the AI build. It tracks {total} source-backed
          commitments totaling about {totalGW} GW of committed capacity, across time, space, and energy source.
        </p>
      </header>

      <div className="about-grid">
        <section className="prose">
          <h2>What counts as a commitment</h2>
          <p>
            A commitment is a publicly announced agreement, filing, or pledge that ties a hyperscaler or AI compute
            buyer to specific energy or datacenter capacity. That includes nuclear restarts and small modular reactor
            deals, fusion and geothermal offtake, solar and wind PPAs, gas and fuel cell supply, grid agreements, and
            gigawatt-scale datacenter campuses. Each record carries a buyer, counterparty, technology, capacity,
            location, date, status, era, confidence, and a link to a primary source.
          </p>

          <h2>Eras</h2>
          <p>Commitments are placed in eras anchored to the generative-AI inflection in late 2022.</p>
          <ul className="about-eras">
            {ERA_ORDER.map((e) => (
              <li key={e}>
                <span className="about-eras__dot" style={{ background: ERA[e].color }} />
                <span>
                  <b>{ERA[e].label}.</b> {ERA[e].blurb}
                </span>
              </li>
            ))}
          </ul>

          <h2>Confidence and firmness</h2>
          <p>
            Confidence reflects how well the reported figures are sourced, from high (company release or filing with a
            clear capacity) to low (early or estimated). Firmness is separate: it reflects contract maturity, from
            operational and under construction through signed PPA, announced, and exploratory. A deal can be real but
            still speculative on capacity, and the interface keeps those two ideas distinct.
          </p>

          <h2>Live grid input</h2>
          <p>
            The Portfolio view includes a live reading of the Great Britain national grid from the free, keyless
            carbonintensity.org.uk API. It is not a hyperscaler feed. It is shown as a real-time anchor for what an
            actual national grid generates right now, so the committed portfolio can be read for scale.
          </p>
        </section>

        <aside className="prose prose--side">
          <h2>Data schema</h2>
          <p>Each record is normalized to these fields:</p>
          <ul className="schema-list">
            {[
              "buyer", "counterparty", "project", "category", "techType (energy source)",
              "capacityMW", "status", "era", "confidence", "date", "city / state / country",
              "lat / lng", "summary", "sourceName", "sourceUrl",
            ].map((f) => (
              <li key={f}><code>{f}</code></li>
            ))}
          </ul>

          <h2>Scope and limits</h2>
          <p>
            Capacity figures are headline program sizes in electrical megawatts, not instantaneous nameplate
            generation, so very large framework and supply agreements read as intent and momentum rather than a
            generation ledger. Per-tenant cloud spend programs such as Microsoft MACC, Azure savings plans, and AWS
            savings plans are private billing metrics and are not tracked here. Public, primary-source-backed
            commitments are. The dataset lives in one typed file and is designed to grow as more public sources are
            added.
          </p>

          <p className="about-credit">
            Built by{" "}
            <a href="https://x.com/davidtphung" target="_blank" rel="noopener noreferrer">
              David T Phung
            </a>
            .
          </p>
        </aside>
      </div>
    </div>
  );
}
