import { useEffect, useMemo, useState } from "react";
import { COMMITMENTS } from "../data/commitments";
import { ACTORS, CONTRACTS, GLOSSARY, ONTOLOGY } from "../data/computeOntology";
import { TIMELINE } from "../data/computeTimeline";
import { formatExactMW, formatKindTotal, formatPower } from "../lib/format";
import {
  DROPPED_SOURCES,
  POLY_PAGE,
  RUNPOD_PAGE,
  SF_CHANGELOG,
  SF_HOME,
  VAST_PAGE,
  formatChance,
  formatHourly,
  formatPacific,
  formatVolume,
  formatVramMb,
  hypergridTie,
  parsePolymarketPayload,
  polymarketKeysetUrl,
  publicDataUrl,
  readLatest,
  snapshotFromLatest,
  type ComputeSnapshot,
  type PolyMarket,
} from "../lib/computeMarket";

const PAGE_CAP = 4;

type LivePoly =
  | { status: "loading" }
  | { status: "live"; fetchedAt: string; markets: PolyMarket[] }
  | { status: "stale"; asOf: string; markets: PolyMarket[]; message: string }
  | { status: "error"; message: string };

type SnapState =
  | { status: "loading" }
  | { status: "ready"; data: ComputeSnapshot }
  | { status: "error"; message: string };

function kindFigure(mw: number, approx: boolean): string {
  if (!approx) return formatKindTotal(mw);
  const headline = formatPower(mw, true);
  if (mw < 1000) return headline;
  return `${headline} (${formatExactMW(mw)})`;
}

async function loadPolymarket(): Promise<PolyMarket[]> {
  const markets: PolyMarket[] = [];
  const seen = new Set<string>();
  let cursor: string | null = null;
  for (let page = 0; page < PAGE_CAP; page += 1) {
    const response = await fetch(polymarketKeysetUrl(cursor), { headers: { accept: "application/json" } });
    if (!response.ok) throw new Error(`Polymarket returned ${response.status}`);
    const parsed = parsePolymarketPayload(await response.json());
    for (const market of parsed.markets) {
      if (seen.has(market.id)) continue;
      seen.add(market.id);
      markets.push(market);
    }
    if (!parsed.nextCursor || parsed.nextCursor === cursor || parsed.markets.length === 0) break;
    cursor = parsed.nextCursor;
  }
  return markets;
}

export default function ComputeMarketView() {
  const tie = useMemo(() => hypergridTie(COMMITMENTS), []);
  const [openLayers, setOpenLayers] = useState<Set<string>>(() => new Set(["power"]));
  const [query, setQuery] = useState("");
  const [live, setLive] = useState<LivePoly>({ status: "loading" });
  const [snap, setSnap] = useState<SnapState>({ status: "loading" });
  const [sourceNotes, setSourceNotes] = useState<{ source: string; mode: string; url: string; note: string }[]>([]);

  useEffect(() => {
    let cancel = false;
    const snapshotUrl = publicDataUrl("data/compute-market/latest.json");
    fetch(snapshotUrl)
      .then(async (response) => {
        if (!response.ok) throw new Error(`Snapshot returned ${response.status}`);
        const latest = readLatest(await response.json());
        if (!latest) throw new Error("Snapshot did not match the expected shape");
        const data = snapshotFromLatest(latest);
        if (!cancel) {
          setSourceNotes(latest.sources);
          setSnap({ status: "ready", data });
        }
        return data;
      })
      .catch(() => {
        if (!cancel) {
          setSnap({
            status: "error",
            message: "The saved price file could not be read. No stand-in price is shown.",
          });
        }
        return null;
      })
      .then((data) => {
        loadPolymarket()
          .then((markets) => {
            if (cancel) return;
            setLive({ status: "live", fetchedAt: new Date().toISOString(), markets });
          })
          .catch(() => {
            if (cancel) return;
            const saved = data?.polymarket;
            if (saved && saved.status === "ok" && saved.markets.length > 0 && saved.asOf) {
              setLive({
                status: "stale",
                asOf: saved.asOf,
                markets: saved.markets,
                message: "The live feed failed. Showing the saved snapshot. No new number was filled in.",
              });
              return;
            }
            setLive({
              status: "error",
              message: "The live feed failed and the snapshot has no markets. No probability is shown.",
            });
          });
      });
    return () => {
      cancel = true;
    };
  }, []);

  const liveMarkets = live.status === "live" || live.status === "stale" ? live.markets : [];
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return liveMarkets;
    return liveMarkets.filter((market) =>
      `${market.eventTitle} ${market.question}`.toLowerCase().includes(needle),
    );
  }, [liveMarkets, query]);
  const groups = useMemo(() => {
    const order: { title: string; url: string; markets: PolyMarket[] }[] = [];
    const index = new Map<string, number>();
    for (const market of filtered) {
      const key = market.eventSlug || market.eventTitle;
      const at = index.get(key);
      if (at == null) {
        index.set(key, order.length);
        order.push({ title: market.eventTitle, url: market.url, markets: [market] });
      } else {
        order[at].markets.push(market);
      }
    }
    return order;
  }, [filtered]);

  return (
    <div className="page page--compute">
      <header className="page__head">
        <p className="overview__eyebrow">Compute as a commodity</p>
        <h1 className="page__title">Compute Market</h1>
        <p className="page__lead">
          Compute is bought and sold in layers. A megawatt of IT load is not a megawatt of generation. A GPU-hour is not a token.
          Each layer below says what is traded and in what unit.
        </p>
        <p className="cm-note">
          This tab reads latest.json first. Polymarket is then requested in the browser, because that API allows it.
          Vast, RunPod, and the Autoresearch pages stay on the saved file, because the browser blocks those hosts.
          Times are shown in America/Los_Angeles.
        </p>
      </header>

      <div className="cm-stack">
        <section className="cm-block" aria-labelledby="cm-ontology">
          <h2 id="cm-ontology">Ontology</h2>
          <p className="cm-note">Open a layer to read its unit and what changes hands. Power stays split on purpose.</p>
          <div className="cm-tree">
            {ONTOLOGY.map((layer) => {
              const open = openLayers.has(layer.id);
              const panelId = `cm-layer-${layer.id}`;
              return (
                <article className="cm-layer" key={layer.id}>
                  <h3>
                    <button
                      type="button"
                      className="cm-layer__btn"
                      aria-expanded={open}
                      aria-controls={panelId}
                      onClick={() => {
                        setOpenLayers((current) => {
                          const next = new Set(current);
                          if (next.has(layer.id)) next.delete(layer.id);
                          else next.add(layer.id);
                          return next;
                        });
                      }}
                    >
                      <span className="cm-layer__title">{layer.title}</span>
                      <span className="cm-layer__unit">{layer.unit}</span>
                    </button>
                  </h3>
                  {open && (
                    <div className="cm-layer__body" id={panelId}>
                      <p className="cm-note">{layer.traded}</p>
                      <p className="cm-note">{layer.note}</p>
                      {layer.nodes && (
                        <div className="cm-nodes">
                          {layer.nodes.map((node) => (
                            <article className="cm-node" key={node.id}>
                              <h4>{node.title}</h4>
                              <p className="cm-note">Unit: {node.unit}</p>
                              <p className="cm-note">{node.traded}</p>
                            </article>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        <section className="cm-block" aria-labelledby="cm-contracts">
          <h2 id="cm-contracts">Contract types</h2>
          <dl className="cm-glossary">
            {CONTRACTS.map((item) => (
              <div key={item.id}>
                <dt>{item.term}</dt>
                <dd>{item.detail}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="cm-block" aria-labelledby="cm-actors">
          <h2 id="cm-actors">Actor types</h2>
          <dl className="cm-glossary">
            {ACTORS.map((item) => (
              <div key={item.id}>
                <dt>{item.term}</dt>
                <dd>{item.detail}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="cm-block" aria-labelledby="cm-glossary">
          <h2 id="cm-glossary">Glossary</h2>
          <dl className="cm-glossary">
            {GLOSSARY.map((item) => (
              <div key={item.id}>
                <dt>{item.term}</dt>
                <dd>{item.detail}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="cm-block" aria-labelledby="cm-timeline">
          <h2 id="cm-timeline">Timeline</h2>
          <p className="cm-note">Every dated line links to the source. If a date was not confirmed, it is not printed.</p>
          {TIMELINE.map((era) => (
            <article className="cm-era" key={era.id}>
              <h3>{era.title}</h3>
              <p className="cm-note">{era.summary}</p>
              {era.events.map((event) => (
                <article className="cm-event" key={event.id}>
                  <p className="cm-event__date">{event.dateLabel || "Date not confirmed"}</p>
                  <h4>{event.title}</h4>
                  <p className="cm-note">
                    <span className="sig-tag">FACT</span>
                    {event.detail}
                  </p>
                  {event.sourceUrl && event.sourceName && (
                    <p className="cm-note">
                      <a href={event.sourceUrl}>{event.sourceName}</a>
                    </p>
                  )}
                </article>
              ))}
            </article>
          ))}
        </section>

        <section className="cm-block" aria-labelledby="cm-poly">
          <h2 id="cm-poly">Polymarket compute markets</h2>
          <p className="cm-note">
            <span className="sig-tag">CLAIM</span>
            Each chance is the market's implied probability. It is not a fact about the world.
            The list is the open Compute tag, ordered by volume, and it can be shorter than the whole site.
          </p>
          <p className="cm-note">
            Source: <a href={POLY_PAGE}>polymarket.com/tech/compute</a>
          </p>
          {live.status === "loading" && <p className="cm-status">Loading the live feed.</p>}
          {live.status === "error" && (
            <p className="cm-status">
              {live.message} <a href={POLY_PAGE}>Open Polymarket</a>
            </p>
          )}
          {(live.status === "live" || live.status === "stale") && (
            <>
              <p className="cm-status">
                {live.status === "live"
                  ? `Using the live Gamma API. Fetched ${formatPacific(live.fetchedAt)}.`
                  : `Using latest.json. ${live.message} Saved value time ${formatPacific(live.asOf)}.`}
              </p>
              <label className="cm-search-label" htmlFor="cm-market-search">
                Filter markets
              </label>
              <input
                id="cm-market-search"
                className="cm-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search questions"
                type="search"
              />
              <p className="cm-status">
                {filtered.length} markets in {groups.length} events.
              </p>
              {groups.map((group, index) => (
                <details
                  className="cm-market"
                  key={`${group.url}-${query.trim() ? "filtered" : "all"}`}
                  open={query.trim() !== "" || index === 0}
                >
                  <summary>
                    {group.title} ({group.markets.length} {group.markets.length === 1 ? "market" : "markets"})
                  </summary>
                  <p className="cm-note">
                    <a href={group.url}>Open this event</a>
                  </p>
                  {group.markets.map((market) => (
                    <div className="cm-quote" key={market.id}>
                      <p>
                        <span className="sig-tag">CLAIM</span>
                        {market.question}
                      </p>
                      <p>
                        {market.outcome} {formatChance(market.probability)}
                        {market.volumeUsd == null ? "" : ` · Volume ${formatVolume(market.volumeUsd)}`}
                        {market.endDate ? ` · Ends ${formatPacific(market.endDate)}` : ""}
                      </p>
                    </div>
                  ))}
                </details>
              ))}
              {filtered.length === 0 && <p className="cm-status">No market question matched that filter.</p>}
            </>
          )}
        </section>

        <section className="cm-block" aria-labelledby="cm-vast">
          <h2 id="cm-vast">Vast.ai posted asks</h2>
          <p className="cm-note">
            <span className="sig-tag">FACT</span>
            Lowest posted on-demand ask for one GPU with the whole card offered. This is a listed price, not a cleared trade and not an index.
            The browser cannot read this host, so the figure is a snapshot taken at build time.
          </p>
          <p className="cm-note">
            Source: <a href={VAST_PAGE}>vast.ai</a>
          </p>
          <SnapshotNotice snap={snap} section="vast" />
          {snap.status === "ready" && snap.data.vast.status === "error" && (
            <p className="cm-status">{snap.data.vast.error || "Vast had no saved offers."} No price is shown.</p>
          )}
          {snap.status === "ready" && snap.data.vast.status === "ok" && (
            <div>
              {snap.data.vast.rows.map((row) => (
                <div className="cm-row" key={row.gpuName}>
                  <span>{row.gpuName}</span>
                  <span>
                    {row.usdPerHour == null ? (
                      "No rentable one-GPU on-demand offer came back. No price is shown."
                    ) : (
                      <>
                        <span className="sig-tag">FACT</span>
                        {formatHourly(row.usdPerHour)}
                        {row.vramMb != null ? ` · ${formatVramMb(row.vramMb)}` : ""}
                        {row.place ? ` · ${row.place}` : ""}
                        {row.offerId != null ? ` · offer ${row.offerId}` : ""}
                      </>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="cm-block" aria-labelledby="cm-runpod">
          <h2 id="cm-runpod">RunPod posted catalog</h2>
          <p className="cm-note">
            <span className="sig-tag">FACT</span>
            Posted catalog prices from the public RunPod list. A zero in the feed is treated as not listed. The browser cannot read this host, so the figure is a snapshot.
          </p>
          <p className="cm-note">
            Source: <a href={RUNPOD_PAGE}>runpod.io</a>
          </p>
          <SnapshotNotice snap={snap} section="runpod" />
          {snap.status === "ready" && snap.data.runpod.status === "error" && (
            <p className="cm-status">{snap.data.runpod.error || "RunPod had no saved prices."} No price is shown.</p>
          )}
          {snap.status === "ready" && snap.data.runpod.status === "ok" && (
            <div>
              {snap.data.runpod.rows.map((row) => (
                <div className="cm-row" key={row.id}>
                  <span>
                    {row.name}
                    {row.memoryGb != null ? ` · ${row.memoryGb} GB` : ""}
                  </span>
                  <span>
                    {row.secureUsdPerHour == null && row.communityUsdPerHour == null ? (
                      "Not listed. No price is shown."
                    ) : (
                      <>
                        <span className="sig-tag">FACT</span>
                        {row.secureUsdPerHour == null ? "Secure not listed" : `Secure ${formatHourly(row.secureUsdPerHour)}`}
                        {" · "}
                        {row.communityUsdPerHour == null
                          ? "Community not listed"
                          : `Community ${formatHourly(row.communityUsdPerHour)}`}
                      </>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="cm-block" aria-labelledby="cm-sf">
          <h2 id="cm-sf">SF Compute Autoresearch list prices</h2>
          <p className="cm-note">
            These are posted list prices from public Autoresearch pages. They are not the SF Compute order book.
            The browser cannot read the pages directly, so this block is a snapshot.
          </p>
          <p className="cm-note">
            Homepage: <a href={SF_HOME}>autoresearch.sfcompute.com</a>
            {" · "}
            Changelog: <a href={SF_CHANGELOG}>changelog</a>
          </p>
          <SnapshotNotice snap={snap} section="sfcompute" />
          {snap.status === "ready" && snap.data.sfcompute.status === "error" && (
            <p className="cm-status">{snap.data.sfcompute.error || "The Autoresearch pages were not saved."} No price is shown.</p>
          )}
          {snap.status === "ready" && snap.data.sfcompute.status === "ok" && (
            <div>
              {snap.data.sfcompute.conflict && (
                <p className="cm-note">
                  The homepage table and the changelog do not name the same current H100 list price. This page shows both. It does not pick one.
                </p>
              )}
              {snap.data.sfcompute.table.map((row) => (
                <div className="cm-row" key={`${row.item}-${row.rateText}`}>
                  <span>{row.item}</span>
                  <span>
                    <span className="sig-tag">FACT</span>
                    {row.rateText}
                    {row.hourSource === "calculated" && row.usdPerHour != null
                      ? ` · CALCULATED ${formatHourly(row.usdPerHour)} from the per-minute rate`
                      : ""}
                  </span>
                </div>
              ))}
              {snap.data.sfcompute.changelog && (
                <article className="cm-event">
                  <p className="cm-event__date">{formatPacific(snap.data.sfcompute.changelog.iso)}</p>
                  <h3>{snap.data.sfcompute.changelog.title}</h3>
                  <p className="cm-note">
                    <span className="sig-tag">FACT</span>
                    {snap.data.sfcompute.changelog.statement}
                  </p>
                  <p className="cm-note">
                    <a href={snap.data.sfcompute.changelog.url}>Changelog entry</a>
                  </p>
                </article>
              )}
              {snap.data.sfcompute.sample && (
                <p className="cm-note">
                  <span className="sig-tag">FACT</span>
                  {snap.data.sfcompute.sample.context} The printed rate is {snap.data.sfcompute.sample.rateText}.
                </p>
              )}
            </div>
          )}
        </section>

        <section className="cm-block" aria-labelledby="cm-tie">
          <h2 id="cm-tie">Hypergrid tie-in</h2>
          <p className="cm-note">
            Each line is the counted total for that kind only. The kinds are not added. Filters on the atlas do not change these figures.
          </p>
          {tie.map((row) => (
            <div className="cm-row" key={row.kind}>
              <span>
                {row.node}
                <br />
                {row.layer}
              </span>
              <span>
                <span className="sig-tag">FACT</span>
                {kindFigure(row.mw, row.approx)} · {row.rows} {row.rows === 1 ? "row" : "rows"}
                <br />
                {row.note}
              </span>
            </div>
          ))}
        </section>

        <section className="cm-block" aria-labelledby="cm-sources">
          <h2 id="cm-sources">Where the numbers come from</h2>
          {sourceNotes.map((item) => (
            <div className="cm-row" key={`${item.source}-${item.url}`}>
              <span>
                <a href={item.url}>{item.source}</a>
              </span>
              <span>
                {item.mode}. {item.note}
              </span>
            </div>
          ))}
          {sourceNotes.length === 0 && <p className="cm-status">The source list loads with latest.json.</p>}
        </section>

        <section className="cm-block" aria-labelledby="cm-dropped">
          <h2 id="cm-dropped">Sources left out</h2>
          {DROPPED_SOURCES.map((item) => (
            <div className="cm-row" key={item.url}>
              <span>
                <a href={item.url}>{item.name}</a>
              </span>
              <span>{item.reason}</span>
            </div>
          ))}
        </section>

        <p className="cm-credit">
          Built by{" "}
          <a href="https://x.com/davidtphung" target="_blank" rel="noopener noreferrer">
            David T Phung
          </a>
        </p>
      </div>
    </div>
  );
}

function SnapshotNotice({ snap, section }: { snap: SnapState; section: "vast" | "runpod" | "sfcompute" }) {
  if (snap.status === "loading") return <p className="cm-status">Loading the saved snapshot.</p>;
  if (snap.status === "error") return <p className="cm-status">{snap.message}</p>;
  const block = snap.data[section];
  if (!block.asOf) return null;
  return (
    <p className="cm-status">
      Using latest.json. Saved {formatPacific(block.asOf)}
      {block.stale ? ". Stale: the latest fetch failed, so the last good value was kept." : "."}
    </p>
  );
}
