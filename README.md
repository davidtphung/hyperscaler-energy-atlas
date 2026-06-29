# HYPERGRID — Hyperscaler Energy Atlas

An interactive atlas of the energy and datacenter commitments powering the AI era. Explore how the hyperscalers and frontier AI compute buyers (Microsoft, Google, Amazon, Meta, OpenAI, Oracle, xAI, Anthropic, CoreWeave) are buying the future of energy: nuclear restarts, small modular reactors, fusion, geothermal, gigawatt datacenter campuses, and renewable portfolios, mapped across time and space.

**Live:** https://davidtphung.github.io/hyperscaler-energy-atlas/

Built by [David T Phung](https://x.com/davidtphung).

---

## What it does

- **Map** a curated set of real, sourced commitments across the United States and the world, sized by committed capacity and colored by technology.
- **Scrub the timeline** to watch the buildout accumulate gigawatt by gigawatt from 2021 to today, or press play to animate it.
- **Filter** by buyer, technology, status, and category, with live counts.
- **Search** projects, buyers, and places.
- **Select** any site for a detail panel with capacity, status, counterparty, announcement date, and a link to the primary source.

## Data

Each row is a publicly announced commitment with a primary source (company press releases, Reuters, AP, CNBC, World Nuclear News, DOE, and utility investor-relations pages). Capacities are electrical megawatts reflecting reported headline figures. The dataset was compiled and cross-checked through a multi-agent research and verification pass and lives in a single typed file: [`src/data/commitments.ts`](src/data/commitments.ts). It is designed to be appended to over time.

Capacity figures for very large framework and supply agreements (for example multi-gigawatt renewable frameworks or module supply alliances) represent the headline program size, not instantaneous nameplate generation. Treat the atlas as a directional map of intent and momentum, not a generation accounting ledger.

## Architecture

A single-page app, no backend, deployable as static files.

- **Vite + React + TypeScript** for a clean, typed, componentized build.
- **d3-geo** for projection and path geometry. `geoAlbersUsa` for the US view, `geoNaturalEarth1` for the world view. Geography (`us-atlas`, `world-atlas` TopoJSON) is bundled, so there are no map tiles, API keys, or third-party runtime dependencies.
- **Custom SVG rendering** for markers and the timeline, with screen-space pan and zoom (wheel, pinch, buttons, double-click) and capacity-proportional marker areas (`d3-scale` square-root scale).
- **State** is plain React hooks. Derivations (facet filtering, live counts, the cumulative buildout curve) are memoized selectors in [`src/lib/select.ts`](src/lib/select.ts).

```
src/
  data/commitments.ts   the dataset (single source of truth)
  lib/                   geo, scales, formatting, selectors, theme tokens, hooks
  components/            TopBar, FilterRail, MapCanvas, Timeline, DetailPanel
  App.tsx                orchestrator: state, playback, responsive shell
  index.css             design system + responsive + reduced-motion
```

## Accessibility

- Semantic landmarks (`header`, `nav`, `main`, `aside`, `section`) and a logical heading order.
- Full keyboard support: focusable markers (Enter/Space to select), an ARIA slider for the timeline (arrow keys, Page Up/Down, Home/End), operable filters, and an Escape key that clears selection or closes overlays.
- A skip link, a visible focus ring on every interactive element, and a polite live region that announces filter results and selections.
- The detail panel's overview includes a text ledger of every visible commitment, so the spatial map is never the only way to reach the data.
- 44 px minimum touch targets, AA-contrast color, color never used as the sole carrier of meaning (every marker also exposes a label), and full `prefers-reduced-motion` support.
- Responsive reflow from a three-column desktop layout to a single-column mobile layout with a bottom sheet for detail.

## Develop

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build to dist/
npm run preview    # serve the production build
```

## Deploy

The build is path-agnostic (`base: "./"`), so it runs unchanged at a GitHub Pages project path, a custom domain root, or local preview.

```bash
npm run build
npm run deploy     # publishes dist/ to the gh-pages branch
```

## License

MIT
