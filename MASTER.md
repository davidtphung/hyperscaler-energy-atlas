# HYPERGRID · Master Document

**Version 1.2 · 2026-06-29**

The Hyperscaler Energy Atlas. A premium, source-backed, interactive mission dashboard mapping the energy, infrastructure, real estate, and policy behind the AI buildout, from the 1940s origins of computing to the gigawatt AI factories of today.

- **Live:** https://hypergrid.davidtphung.com
- **Repository:** https://github.com/davidtphung/hyperscaler-energy-atlas (public)
- **Built by:** [David T Phung](https://x.com/davidtphung)
- **License:** MIT

---

## 1. Overview

HYPERGRID is a single static single-page application that unifies several source-backed datasets about the AI data center and energy buildout into one explorable product. Every record links to a primary source and carries a confidence level. There is no backend, no paywall, no ads, and no user tracking.

---

## 2. Views (9 tabs)

| Tab | What it does |
|---|---|
| **Atlas** | Interactive map plus timeline of 104 hyperscaler energy and datacenter commitments. Speed-mode playback pill (Live / 1mo/s / 6mo/s / 1yr/s), cumulative buildout reveal, filters (buyer, era, technology, status, category), search, detail panel with stats and ledger. Map views: United States, China, Global. |
| **Data Centers** | Searchable, sortable global directory of 260 facilities across 46 countries (93 in China). Map views Global / China / US, click a dot for a facility info card, top-countries breakdown, click-to-sort columns (MW top and least, undisclosed last). |
| **Economics** | 25 real estate transactions (M&A, take-privates, sale-leasebacks, land) on a deal map with sortable table, a price-per-square-foot scatter, construction cost benchmarks (USD millions per MW by market), and a long-lead equipment chart (transformers 128 to 210 weeks, generators, switchgear, chillers, UPS). |
| **History** | 28 source-backed milestones from ENIAC (1945) through carrier hotels, colocation, cloud and hyperscale, edge, and the AI factory era, grouped on an editorial timeline by era. |
| **Contested** | Investigative tracker of 23 data center projects that were blocked, stalled, denied, withdrawn, put under moratorium, or litigated. Severity scored 1 to 5, US and world maps, contestation themes. |
| **Policy** | 41 for / against / mixed AI data center policy actions (FERC RM26-4, White House ratepayer pledge, Texas SB6, Ireland CRU and LEAP, Virginia bills) with a stance map, balance bar, and level filters. |
| **Analysis** | Energy source portfolio (donut, firm vs speculative, evidence strength, before and after the AI boom era comparison), a live Great Britain national grid generation feed, and a forecast fan chart (constrained / base / aggressive) of committed capacity to 2031. |
| **About** | Methodology, data schema, scope and limits, plus the full source and provenance list. |
| **Donate** | Crypto wallets (Bitcoin, cbBTC, USDC, Ethereum) with copy-to-clipboard, Venmo, and disclaimers. |

---

## 3. Data inventory

| Dataset | File | Records |
|---|---|---|
| Commitments | `src/data/commitments.ts` | 104 |
| Data centers | `src/data/datacenters.ts` | 260 (93 China, 8 historical landmarks) |
| Real estate deals | `src/data/realestate.ts` | 25 |
| Construction (materials + cost) | `src/data/construction.ts` | 20 (13 materials, 7 benchmarks) |
| History milestones | `src/data/history.ts` | 28 |
| Contested projects | `src/data/contested.ts` | 23 |
| Policy actions | `src/data/policy.ts` | 41 |

Coverage spans 1945 to 2031 (forecast). Every record carries `sourceUrl` and `confidence`.

---

## 4. Core entities

- **Commitment** — buyer, counterparty, project, technology, category, capacity (MW), location, date, status, era, confidence, source.
- **DataCenter** — facility, operator, parent, country/region/city, lat/lng, status, facility type, capacity, AI orientation, year operational, power source, source.
- **RealEstateDeal** — project, buyer, seller, operator, location, deal date, deal type, gross sqft, land acres, price, price per sqft, size MW, cap rate, source.
- **ConstructionRecord** — kind (material or cost), category, market, lead time range (weeks), unit cost, cost per MW, cost per sqft, source.
- **HistoryMilestone** — year, era, title, description, type, source.
- **ContestedProject** — project, company, location, status, contestation types, opposition actors, government body, capex, severity, source.
- **PolicyRecord** — title, jurisdiction, level, stance (for/against/mixed), category, date, source.

---

## 5. Tech stack

- **Vite + React + TypeScript** (static SPA, `base: "./"` so it is path-agnostic).
- **d3-geo** for projections: `geoAlbersUsa` (US), `geoMercator` framed to China (China), `geoNaturalEarth1` (Global). Geography is bundled `us-atlas` and `world-atlas` TopoJSON, so there are no map tiles, no API keys, and deterministic offline rendering.
- **Custom SVG** rendering for markers (capacity-sized via `d3-scale` sqrt, glossy highlight and glow), the timeline scrubber, donut, fan chart, and bar charts.
- **Fonts:** Inter and JetBrains Mono.
- **Live data:** Great Britain national grid generation mix via the keyless, CORS-enabled carbonintensity.org.uk API (clearly labeled as a reference grid).

---

## 6. Accessibility

Semantic landmarks and heading order, full keyboard support (focusable map markers, an ARIA slider timeline, sortable headers with `aria-sort`, Escape to close), a skip link, a single visible focus ring, a polite live region, 44px touch targets, AA contrast, color never used as the sole signal, a text ledger as a screen-reader path to the map data, responsive reflow to a mobile bottom sheet, and full `prefers-reduced-motion` support.

---

## 7. Deployment

GitHub Pages, custom domain, HTTPS enforced (Let's Encrypt).

```bash
npm install
npm run dev        # local dev
npm run build      # type-check + production build to dist/
npm run preview    # serve the production build
npx gh-pages -d dist -b gh-pages   # publish
```

DNS: GoDaddy CNAME `hypergrid` to `davidtphung.github.io` (GitHub Pages, not the Vercel A record).

---

## 8. Methodology and limits

- Capacity figures are headline program sizes in electrical megawatts, not instantaneous nameplate generation.
- Confidence reflects how well figures are sourced; firmness (status) is tracked separately from confidence.
- Per-tenant cloud spend programs (Microsoft MACC, Azure and AWS savings plans) are private billing metrics and are intentionally out of scope. Public, primary-source-backed commitments are tracked.
- The forecast is a transparent compound-growth model, not a source-backed projection.
- The directory is a curated, source-backed subset of the many thousands of facilities worldwide.

---

## 9. Changelog

### v1.2 — 2026-06-29
- Added **Economics** view: 25 real estate deals, deal map, $/sqft scatter, construction cost benchmarks, long-lead equipment lead-time chart.
- Added **History** view: 28 milestones from the mainframe era to AI factories.
- Added a **China map view** to the Atlas and Data Centers, with a facility info card on click and click-to-sort table columns.
- Fixed Atlas map zoom: a non-passive wheel listener now prevents the browser page zoom from fighting the map (no more jumping to another location).
- Rebuilt the **Donate** page to copy-to-clipboard crypto wallets plus Venmo.
- Added a themed `og:image` social card and a brand-matched favicon.
- Wired the custom domain `hypergrid.davidtphung.com` with enforced HTTPS.

### v1.1
- Added **Data Centers** directory (expanded to 260 facilities, 93 China), **Contested**, **Policy**, and **Forecast** views.
- Switched fonts to Inter and JetBrains Mono; added the live GB grid feed.
- Added xAI Colossus 1, Colossus 2, and Macrohard; eras model and rail filter.
- Simplified navigation (merged Forecast into Analysis, Sources into About).

### v1.0
- Initial release: Atlas map plus timeline of hyperscaler energy commitments, Portfolio, Sources, About, with the speed-mode playback pill and verified source-backed data.

---

## 10. Credits

Built by **David T Phung** (https://x.com/davidtphung). Data compiled and cross-checked across company press releases, government and regulatory filings, utility and grid records, reputable journalism, and public trackers including datacentermap.com. Every nontrivial fact carries a source.
