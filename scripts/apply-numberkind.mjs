import fs from "node:fs";

const csvPath = new URL("../src/data/numberkind-mapping.csv", import.meta.url);
const dataPath = new URL("../src/data/commitments.ts", import.meta.url);

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else inQuotes = false;
      } else cell += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (ch !== "\r") cell += ch;
  }
  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }
  const [header, ...body] = rows.filter((r) => r.length > 1 || r[0]);
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ""])));
}

const labels = parseCsv(fs.readFileSync(csvPath, "utf8"));
const byId = new Map(labels.map((r) => [r.id, r]));

const src = fs.readFileSync(dataPath, "utf8");
const start = src.indexOf("= [") + 2;
const end = src.lastIndexOf("]");
const commitments = JSON.parse(src.slice(start, end + 1));
const liveIds = new Set(commitments.map((c) => c.id));

const missing = [...byId.keys()].filter((id) => !liveIds.has(id));
const extra = [...liveIds].filter((id) => !byId.has(id));
if (extra.length) {
  console.error("Live ids missing from CSV", extra);
  process.exit(1);
}

function applyLabel(row) {
  const label = byId.get(row.id);
  if (!label) throw new Error(`No label for ${row.id}`);
  row.numberKind = label.numberKind;
  row.counts = label.counts;
  row.bound = label.bound;
  if (label.parentId) row.parentId = label.parentId;
  else delete row.parentId;
  if (label.excludeReason) row.excludeReason = label.excludeReason;
  else delete row.excludeReason;
}

for (const row of commitments) applyLabel(row);

const kilby = commitments.find((c) => c.id === "microsoft-chevron-west-texas-gas");
kilby.capacityMW = 2670;
kilby.sourceName = "Chevron";
kilby.sourceUrl = "https://www.chevron.com/newsroom/2026/q2/chevron-signs-20-year-power-agreement-with-microsoft-for-west-texas-data-center";
kilby.project = "Project Kilby (Energy Forge One)";
kilby.counterparty = "Energy Forge One (Chevron / Joulent JV)";
kilby.city = "Reeves County";
kilby.state = "Texas";
kilby.lat = 31.308366;
kilby.lng = -103.712706;
kilby.date = "2026-06-22";
kilby.status = "announced";
kilby.confidence = "high";
kilby.headline = "Chevron signs a 20-year PPA for about 2.67 GW at Project Kilby";
kilby.summary = "On 22 June 2026 Chevron said Energy Forge One signed a 20-year power purchase agreement with Microsoft for Project Kilby, a co-located gas plant expected to deliver approximately 2.67 gigawatts. The project page describes generation behind the meter in Reeves County, Texas. ERCOT GIS for August 2026 lists Kilby with no interconnection agreement. The 2,377 MW gas figure is a studied maximum net export, not plant size. The map pin is the U.S. Census internal point for Reeves County (31.308366 N, 103.712706 W), a county reference point, not a surveyed plant site. Energized MW and COD are empty. This row is announced on-site generation and is not in the firm on-site total.";
kilby.energizedMW = null;
kilby.daysToCod = null;

const crusoe = commitments.find((c) => c.id === "microsoft-crusoe-abilene-2-btm-900");
crusoe.status = "announced";
crusoe.headline = "900 MW of on-site generation announced at Abilene campus 2";
crusoe.summary = "On 27 March 2026 Crusoe said the new Microsoft campus in Abilene includes 900 megawatts of new on-site power generation and a 900 MW on-site power plant. The only construction line in that release is land clearing and site preparation for the campus, which is not plant construction. Status is announced. Energized MW and COD are empty. The 672 MW critical IT row is separate and unchanged.";

const abilene = commitments.find((c) => c.id === "abilene-onsite-gas-turbines-permit");
abilene.capacityMW = 360.5;
abilene.status = "construction";
abilene.headline = "TCEQ permit lists 360.5 MW of on-site turbines at Abilene";
abilene.summary = "TCEQ Standard Permit Registration 177263 lists five 38 MW turbines and five 34.1 MW turbines, 360.5 MW, to generate power for onsite use only. Live status stays construction. A Texas Tribune and Floodlight report that turbines were built is secondary, not a primary construction or operation notice. Energized MW and COD are empty. This row does not count until a primary shows the turbines under construction or running.";
abilene.energizedMW = null;

const ellendale = commitments.find((c) => c.id === "coreweave-applied-digital-ellendale");
ellendale.energizedMW = 175;
ellendale.status = "construction";
ellendale.summary = "CoreWeave signed three long-term leases totaling about 400 MW at Applied Digital's Polaris Forge 1 campus in Ellendale, North Dakota, including an additional 150 MW finalized in August 2025. Applied Digital said 175 MW at Polaris Forge 1 was already live as of 1 July 2026. That 175 MW is the energized figure. The rest of the 400 MW lease stays construction. COD is empty.";

const palisades = commitments.find((c) => c.id === "holtec-palisades-restart");
palisades.headline = "Palisades restart is in progress";
palisades.summary = "Holtec's Palisades plant in Covert Township, Michigan, about 805 MW nameplate, is a restart in progress. It is not shown as operating, and energized MW is empty. The restart is backed by a DOE loan guarantee. This row is offtake from an existing plant and is not in the firm offtake total.";
if ("energizedMW" in palisades) palisades.energizedMW = null;

const colossus = commitments.find((c) => c.id === "xai-colossus-1");
colossus.energizedMW = 150;
colossus.summary = "xAI converted the former Electrolux factory at 3231 Riverport Rd in South Memphis into Colossus, its first AI training supercomputer for Grok. This is the canonical IT row for Colossus 1. Energized MW is the MLGW figure of 150 MW at Paul Lowry. COD is empty. The separate MLGW row does not count.";

const visa = commitments.find((c) => c.id === "google-adani-airtel-visakhapatnam-ai-hub");
visa.capacityMW = null;
visa.summary = "Google, AdaniConneX, and Airtel announced a gigawatt-scale AI hub in Visakhapatnam. The release says gigawatt-scale and does not state a megawatt figure, so capacity is empty. This row does not count.";

const chindata = commitments.find((c) => c.id === "chindata-100-renewable-2030");
chindata.sourceName = "PR Newswire (Chindata)";
chindata.sourceUrl = "https://www.prnewswire.com/news-releases/chindata-group-releases-2030-carbon-neutral-roadmap-301208160.html";
chindata.confidence = "high";

const sec = "https://www.sec.gov/Archives/edgar/data/1839341/000119312526165121/d149019dex992.htm";

function baseRow(partial) {
  return {
    actorKind: undefined,
    constructionStart: null,
    onlineDate: null,
    energizedMW: null,
    daysToCod: null,
    lat: null,
    lng: null,
    confidence: "high",
    ...partial,
  };
}

const appends = [
  baseRow({
    id: "coreweave-cs-denton-262",
    buyer: "CoreWeave",
    counterparty: "Core Scientific",
    project: "Denton critical IT (Core Scientific)",
    techType: "datacenter",
    category: "datacenter",
    capacityMW: 262,
    city: "Denton",
    state: "Texas",
    country: "United States",
    date: "2026-04",
    status: "construction",
    headline: "Core Scientific lists 262 MW critical IT at Denton",
    summary: "Core Scientific Exhibit 99.2 lists Denton, Texas at 262 MW critical IT capacity contracted with CoreWeave. The filing says 132 MW were billable as of March 2026, which is not an energized figure. Energized MW and COD are empty. Grid capacity on the same line is not on this row. Do not add this site to the 1,300 MW Core Scientific row.",
    sourceName: "Core Scientific Exhibit 99.2",
    sourceUrl: sec,
  }),
  baseRow({
    id: "coreweave-cs-dalton-175",
    buyer: "CoreWeave",
    counterparty: "Core Scientific",
    project: "Dalton critical IT (Core Scientific)",
    techType: "datacenter",
    category: "datacenter",
    capacityMW: 175,
    city: "Dalton",
    state: "Georgia",
    country: "United States",
    date: "2026-04",
    status: "construction",
    headline: "Core Scientific lists 175 MW critical IT at Dalton",
    summary: "One row for Dalton, Georgia. Exhibit 99.2 lists Dalton 1 at 30 MW critical IT and Dalton 4 at 145 MW critical IT, 175 MW together. Phases stay in this note and are not separate rows. Status is construction from the filing schedule. Energized MW and COD are empty. Do not add this site to the 1,300 MW Core Scientific row.",
    sourceName: "Core Scientific Exhibit 99.2",
    sourceUrl: sec,
  }),
  baseRow({
    id: "coreweave-cs-muskogee-70",
    buyer: "CoreWeave",
    counterparty: "Core Scientific",
    project: "Muskogee critical IT (Core Scientific)",
    techType: "datacenter",
    category: "datacenter",
    capacityMW: 70,
    city: "Muskogee",
    state: "Oklahoma",
    country: "United States",
    date: "2026-04",
    status: "construction",
    headline: "Core Scientific lists 70 MW critical IT at Muskogee",
    summary: "Core Scientific Exhibit 99.2 lists Muskogee, Oklahoma at 70 MW critical IT capacity contracted with CoreWeave. Status is construction from the filing. Energized MW and COD are empty. Grid capacity on the same line is not on this row. Do not add this site to the 1,300 MW Core Scientific row.",
    sourceName: "Core Scientific Exhibit 99.2",
    sourceUrl: sec,
  }),
  baseRow({
    id: "coreweave-cs-marble-65",
    buyer: "CoreWeave",
    counterparty: "Core Scientific",
    project: "Marble critical IT (Core Scientific)",
    techType: "datacenter",
    category: "datacenter",
    capacityMW: 65,
    city: "Marble",
    state: "North Carolina",
    country: "United States",
    date: "2026-04",
    status: "construction",
    headline: "Core Scientific lists 65 MW critical IT at Marble",
    summary: "Core Scientific Exhibit 99.2 lists Marble, North Carolina at 65 MW critical IT capacity contracted with CoreWeave. Status is construction from the filing. Energized MW and COD are empty. Grid capacity on the same line is not on this row. Do not add this site to the 1,300 MW Core Scientific row.",
    sourceName: "Core Scientific Exhibit 99.2",
    sourceUrl: sec,
  }),
  baseRow({
    id: "coreweave-cs-austin-16-5",
    buyer: "CoreWeave",
    counterparty: "Core Scientific",
    project: "Austin critical IT (Core Scientific)",
    techType: "datacenter",
    category: "datacenter",
    capacityMW: 16.5,
    city: "Austin",
    state: "Texas",
    country: "United States",
    date: "2026-04",
    status: "operational",
    headline: "Core Scientific lists 16.5 MW critical IT at Austin",
    summary: "Core Scientific Exhibit 99.2 lists Austin, Texas at 16.5 MW critical IT capacity contracted with CoreWeave. The filing says the Austin campus was completed in 2024, so status is operational. Energized MW and COD are empty because the filing does not state delivered MW. Do not add this site to the 1,300 MW Core Scientific row.",
    sourceName: "Core Scientific Exhibit 99.2",
    sourceUrl: sec,
  }),
  baseRow({
    id: "fermi-matador-gas-6000",
    buyer: "Fermi",
    counterparty: "",
    project: "Matador gas plant (TCEQ nameplate)",
    techType: "gas",
    category: "energy",
    capacityMW: 6000,
    city: "Carson County",
    state: "Texas",
    country: "United States",
    date: "",
    status: "announced",
    headline: "TCEQ review lists about 6,000 MW at Matador",
    summary: "A TCEQ technical review says the project's nominal generation capacity will be approximately 6,000 MW, solely onsite. Status is announced. The permit is not construction. Energized MW and COD are empty. No map pin: the filing does not give a site coordinate. Do not add this plant to the TensorWave 222 MW facility row.",
    sourceName: "TCEQ technical review",
    sourceUrl: "https://records.tceq.texas.gov/cs/idcplg?allowInterrupt=1&dDocName=8281238&dID=9562398&IdcService=GET_FILE",
    confidence: "medium",
  }),
  baseRow({
    id: "amazon-gw-ranch-gas-5000",
    buyer: "Pacifico GW LLC",
    counterparty: "",
    project: "GW Ranch Energy Center gas plant",
    techType: "gas",
    category: "energy",
    capacityMW: 5000,
    city: "Pecos County",
    state: "Texas",
    country: "United States",
    date: "",
    status: "announced",
    headline: "Air permit lists 5,000 MW at GW Ranch",
    summary: "The air permit technical review says Pacifico GW LLC proposes 35 natural gas-fired simple-cycle turbines at the GW Ranch Energy Center in Pecos County, with a nominal output of 5,000 megawatts. The plant is described as off-grid. This is not an Amazon IT row. Status is announced. Energized MW and COD are empty. No map pin: the filing does not give a site coordinate.",
    sourceName: "TCEQ air permit technical review",
    sourceUrl: "https://ukozvhzgrcnkcatjqfoo.supabase.co/storage/v1/object/public/03-00-air-construction/2026_01_21_GW_Ranch_Energy_Center_181033__PSDTX167_f6c9943f.pdf",
    confidence: "medium",
  }),
  baseRow({
    id: "goodnight-one-crusoe-265-5",
    buyer: "Crusoe",
    counterparty: "GOODNIT1",
    project: "Goodnight One large load",
    techType: "grid",
    category: "energy",
    capacityMW: 265.5,
    city: "",
    state: "Texas",
    country: "United States",
    date: "",
    status: "announced",
    headline: "PUCT study lists a 265.5 MW large load at Goodnight One",
    summary: "A PUCT and ERCOT study describes the net metering arrangement between GOODNIT1 and the 265.5 MW large load. This is utility load for Crusoe One, on hold, and announced. It is not IT capacity and it is not the 265.5 MW wind nameplate in the same report. Energized MW and COD are empty. No map pin: the study does not give a site coordinate in the cited line.",
    sourceName: "PUCT docket 59220",
    sourceUrl: "https://interchange.puc.texas.gov/Documents/59220_16_1650244.PDF",
  }),
  baseRow({
    id: "goodnight-two-ensign-260",
    buyer: "Ensign",
    counterparty: "Crusoe",
    project: "Goodnight Two large load",
    techType: "grid",
    category: "energy",
    capacityMW: 260,
    city: "",
    state: "Texas",
    country: "United States",
    date: "",
    status: "announced",
    headline: "PUCT study lists a 260 MW data center load at Goodnight Two",
    summary: "A PUCT and ERCOT study describes a new 260 MW artificial-intelligence data-center complex. This is utility load for Ensign and Crusoe Two, on hold, and announced. It is not IT capacity and it is not a wind nameplate. Energized MW and COD are empty. No map pin: the study does not give a site coordinate in the cited line.",
    sourceName: "PUCT docket 59220",
    sourceUrl: "https://interchange.puc.texas.gov/Documents/59220_16_1650244.PDF",
  }),
  baseRow({
    id: "nebius-independence-200",
    buyer: "Nebius",
    counterparty: "Independence Power and Light",
    project: "Independence utility delivery",
    techType: "grid",
    category: "energy",
    capacityMW: 200,
    city: "Independence",
    state: "Missouri",
    country: "United States",
    date: "",
    status: "announced",
    headline: "Independence plans for IPL to deliver 200 MW",
    summary: "The City of Independence deck says IPL is to deliver 200 MW in late Q3 2026. This is utility delivery, on hold, and announced. It is not IT capacity and it is not the 1.2 GW design held separately. Energized MW and COD are empty. No map pin: the deck does not give a site coordinate in the cited line.",
    sourceName: "City of Independence",
    sourceUrl: "https://www.independencemo.gov/sites/default/files/2026-02/Nebius%20x%20Independence%2C%20MO.cleaned.pdf",
  }),
];

if (missing.sort().join() !== appends.map((a) => a.id).sort().join()) {
  console.error("CSV ids not in live data do not match the 10 append specs", missing);
  process.exit(1);
}

for (const row of appends) {
  delete row.actorKind;
  applyLabel(row);
  commitments.push(row);
}

const COUNTABLE = new Set(["it_capacity", "grid_gen_for_dc", "btm_gen", "offtake_new", "offtake_existing"]);
const totals = {};
for (const row of commitments) {
  if (row.counts !== "yes") continue;
  const bucket = totals[row.numberKind] ?? { n: 0, mw: 0, ids: [] };
  bucket.n += 1;
  bucket.mw += row.capacityMW ?? 0;
  bucket.ids.push(`${row.id} ${row.capacityMW} ${row.status}`);
  totals[row.numberKind] = bucket;
}
console.log(JSON.stringify(totals, null, 2));
console.log("rows", commitments.length, "countable check", [...COUNTABLE]);

const header = `import type { Commitment } from "../types";

// HYPERGRID dataset: publicly announced energy and datacenter commitments tied
// to hyperscalers, labs, neoclouds, and other actors. Figures are electrical
// megawatts. Each row carries a primary source and a number kind.
// Kinds are not added together. Firm totals count only rows with counts "yes".

export const COMMITMENTS: Commitment[] = `;

fs.writeFileSync(dataPath, header + JSON.stringify(commitments, null, 2) + ";\n");
console.log("wrote", commitments.length);
