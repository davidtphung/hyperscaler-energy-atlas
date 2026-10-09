import fs from "node:fs";
import { COMMITMENTS } from "../src/data/commitments.ts";
import { ask, ASK_EXAMPLES, ASK_FOOTER } from "../src/lib/ask.ts";
import { evidenceFor } from "../src/lib/evidence.ts";
import { formatPower } from "../src/lib/format.ts";
import { rankRows } from "../src/lib/search.ts";
import { applyFacets, firmKindTotals } from "../src/lib/select.ts";
import type { Commitment } from "../src/types.ts";

const errors: string[] = [];
const SOCRATES = ["meta-socrates-north-btm-200", "meta-socrates-south-btm-200"].sort();

function fail(msg: string) {
  errors.push(msg);
}

function hasLongDash(value: string): boolean {
  return value.includes("\u2014") || value.includes("\u2013");
}

const btm = COMMITMENTS.filter((c) => c.numberKind === "btm_gen" && c.counts === "yes");
const btmIds = btm.map((c) => c.id).sort();
if (btmIds.join("|") !== SOCRATES.join("|")) fail(`counted btm_gen ids: ${btmIds.join(", ")}`);
const btmMw = btm.reduce((sum, c) => sum + (c.capacityMW ?? 0), 0);
if (btmMw !== 400) fail(`counted btm_gen MW is ${btmMw}, expected 400`);
const btmTotal = firmKindTotals(COMMITMENTS).find((k) => k.kind === "btm_gen");
if (!btmTotal || btmTotal.mw !== 400 || btmTotal.rows !== 2) {
  fail(`firmKindTotals btm_gen is ${btmTotal?.mw} MW, ${btmTotal?.rows} rows`);
}

for (const id of SOCRATES) {
  const row = COMMITMENTS.find((c) => c.id === id);
  if (!row) {
    fail(`missing ${id}`);
    continue;
  }
  const ev = evidenceFor(row);
  if (ev.mw.mark !== "EMPTY PRIMARY") fail(`${id} MW evidence is ${ev.mw.mark}`);
  if (hasLongDash(ev.mw.reason) || hasLongDash(ev.status.reason)) fail(`${id} evidence text has a long dash`);
}

const holders = ask("who has the on-site generation", COMMITMENTS);
const holderIds = holders.groups.flatMap((g) => g.hits.map((h) => h.id)).sort();
if (holderIds.join("|") !== SOCRATES.join("|")) fail(`on-site ask ids: ${holderIds.join(", ")}`);
if (holders.groups.length !== 1 || holders.groups[0]?.totalMw !== 400) {
  fail(`on-site ask total is ${holders.groups[0]?.totalMw} across ${holders.groups.length} groups`);
}
if (holders.groups.some((g) => g.hits.some((h) => h.mwEvidence !== "EMPTY PRIMARY"))) {
  fail("on-site ask MW evidence was not EMPTY PRIMARY");
}
if (holders.footer !== ASK_FOOTER) fail("on-site ask footer changed");

const texas = ask("which rows are in Texas over 500 MW", COMMITMENTS);
const texasHits = texas.groups.flatMap((g) => g.hits);
const texasExpected = COMMITMENTS.filter((c) => {
  const state = c.state.trim().toLowerCase();
  return (state === "tx" || state === "texas") && c.capacityMW != null && c.capacityMW > 500;
});
const texasIds = texasHits.map((h) => h.id).sort();
const texasWant = texasExpected.map((c) => c.id).sort();
if (texasIds.join("|") !== texasWant.join("|")) {
  fail(`Texas over 500 MW ids differ (got ${texasIds.length}, want ${texasWant.length})`);
}
for (const hit of texasHits) {
  const row = COMMITMENTS.find((c) => c.id === hit.id);
  if (!row) {
    fail(`Texas hit missing row ${hit.id}`);
    continue;
  }
  const state = row.state.trim().toLowerCase();
  if (state !== "tx" && state !== "texas") fail(`${hit.id} state is ${row.state}`);
  if (row.capacityMW == null || row.capacityMW <= 500) fail(`${hit.id} MW is ${row.capacityMW}`);
  if (!hit.sourceUrl) fail(`${hit.id} has no source link`);
  const group = texas.groups.find((g) => g.hits.some((h) => h.id === hit.id));
  if (!group || group.kind !== row.numberKind) fail(`${hit.id} is in the wrong kind group`);
}
if (texas.groups.some((g) => g.totalMw != null || g.totalText != null)) fail("Texas answer has a kind total");
const texasSum = texasExpected.reduce((sum, c) => sum + (c.capacityMW ?? 0), 0);
const texasBlob = `${texas.lead}\n${texas.separation ?? ""}\n${texas.groups.map((g) => g.totalText ?? "").join("\n")}`;
const texasSumLabel = formatPower(texasSum);
if (texas.groups.length > 1 && texasSumLabel !== formatPower(500) && texasBlob.includes(texasSumLabel)) {
  fail(`Texas answer includes a cross kind total ${texasSumLabel}`);
}
const kindSet = new Set(texas.groups.map((g) => g.kind));
if (kindSet.size !== texas.groups.length) fail("Texas groups repeat a kind");

const it = ask("what is counted IT load", COMMITMENTS);
const itTotal = firmKindTotals(COMMITMENTS).find((k) => k.kind === "it_capacity");
if (!itTotal) fail("missing it_capacity total");
else if (it.groups.length !== 1 || it.groups[0]?.totalMw !== itTotal.mw || it.groups[0]?.hits.length !== itTotal.rows) {
  fail(`counted IT load total ${it.groups[0]?.totalMw} rows ${it.groups[0]?.hits.length}, expected ${itTotal.mw} / ${itTotal.rows}`);
}
if (it.groups.some((g) => g.kind !== "it_capacity" || g.hits.some((h) => !h.counted))) {
  fail("counted IT load included another kind or an uncounted row");
}

const rankedEmpty = rankRows("", COMMITMENTS);
if (rankedEmpty.length !== COMMITMENTS.length) fail("empty query did not return every row");
if (rankedEmpty.some((hit) => hit.score !== 0)) fail("empty query ranked a row");
if (rankedEmpty.map((hit) => hit.row.id).join("|") !== COMMITMENTS.map((c) => c.id).join("|")) {
  fail("empty query changed row order");
}

function fixture(partial: Pick<Commitment, "id" | "project" | "buyer"> & Partial<Commitment>): Commitment {
  return {
    counterparty: "",
    techType: "gas",
    category: "energy",
    capacityMW: null,
    city: "",
    state: "",
    country: "",
    lat: null,
    lng: null,
    date: "",
    status: "announced",
    headline: "",
    summary: "",
    sourceName: "",
    sourceUrl: "https://example.invalid/row",
    confidence: "low",
    numberKind: "it_capacity",
    counts: "no",
    bound: "exact",
    ...partial,
  };
}

const rankProbe = rankRows("Atlas Probe", [
  fixture({ id: "sub", project: "The Atlas Probe Yard", buyer: "Other" }),
  fixture({ id: "pre", project: "Atlas Probe Extended", buyer: "Other" }),
  fixture({ id: "exact", project: "Atlas Probe", buyer: "Other" }),
]);
if (rankProbe[0]?.row.id !== "exact") fail(`exact project did not rank first (${rankProbe[0]?.row.id})`);
if (!(rankProbe[0]!.score > rankProbe[1]!.score && rankProbe[1]!.score > rankProbe[2]!.score)) {
  fail("exact, prefix, and substring scores are out of order");
}
const buyerProbe = rankRows("Fluidstack", [
  fixture({ id: "mention", project: "Fluidstack mention site", buyer: "Other" }),
  fixture({ id: "buyer", project: "Other campus", buyer: "Fluidstack" }),
]);
if (buyerProbe[0]?.row.id !== "buyer") fail("exact buyer did not rank first");
if (rankRows("Fluidstack", COMMITMENTS)[0]?.row.buyer !== "Fluidstack") fail("Fluidstack search did not lead with that buyer");

const mw999 = formatPower(999);
const mw1000 = formatPower(1000);
if (!mw999.endsWith("MW") || mw999.includes("GW")) fail(`999 rendered as ${mw999}`);
if (!mw1000.includes("GW") || mw1000.includes("MW")) fail(`1000 rendered as ${mw1000}`);

const samples = [
  holders,
  texas,
  it,
  ask("what is the weather tomorrow", COMMITMENTS),
  ask("what is under construction in Ohio", COMMITMENTS),
  ask("what does Meta have", COMMITMENTS),
  ask("show Fluidstack", COMMITMENTS),
  ask("which rows are in Texas over 1 GW", COMMITMENTS),
  ...ASK_EXAMPLES.map((q) => ask(q, COMMITMENTS)),
];
for (const sample of samples) {
  const text = JSON.stringify(sample);
  if (hasLongDash(text)) fail("an ask result contains a long dash");
  if (!sample.footer.includes("No data left your browser.")) fail("footer missing the browser line");
}
const unknown = ask("what is the weather tomorrow", COMMITMENTS);
if (unknown.ok || unknown.groups.length !== 0) fail("unknown question returned rows");

const ohio = ask("what is under construction in Ohio", COMMITMENTS);
const ohioIds = new Set(ohio.groups.flatMap((g) => g.hits.map((h) => h.id)));
if (!ohioIds.has("meta-socrates-north-btm-200")) fail("Ohio construction missed Socrates North");
if (ohioIds.has("meta-socrates-south-btm-200")) fail("Ohio construction included Socrates South");
for (const id of ohioIds) {
  const row = COMMITMENTS.find((c) => c.id === id);
  if (!row || row.status !== "construction" || row.state.trim().toLowerCase() !== "oh") {
    fail(`Ohio construction hit ${id} is ${row?.status} ${row?.state}`);
  }
}

const overGw = ask("which rows are in Texas over 1 GW", COMMITMENTS);
for (const hit of overGw.groups.flatMap((g) => g.hits)) {
  const row = COMMITMENTS.find((c) => c.id === hit.id);
  const state = row?.state.trim().toLowerCase();
  if (!row || (state !== "tx" && state !== "texas") || row.capacityMW == null || row.capacityMW <= 1000) {
    fail(`over 1 GW hit ${hit.id} failed the GW compare`);
  }
}

if (applyFacets(COMMITMENTS.map((c) => ({ ...c, actorKind: c.actorKind ?? "Undisclosed", t: 0, year: 0, era: "current", point: null })), {
  buyers: new Set(),
  techs: new Set(),
  statuses: new Set(),
  categories: new Set(),
  eras: new Set(),
  query: "",
}).length !== 160) {
  fail("empty filters no longer return 160 rows");
}

const vanBuren = COMMITMENTS.find((c) => c.id === "google-van-buren-dte-u22058");
if (!vanBuren) fail("missing Google Van Buren");
else {
  if (vanBuren.numberKind !== "utility_load" || vanBuren.counts !== "no" || vanBuren.status !== "contracted") {
    fail("Van Buren kind, counts, or status changed");
  }
  if (vanBuren.capacityMW !== 1000) fail("Van Buren capacity is not the company-stated 1000 MW");
  if (vanBuren.energizedMW != null || vanBuren.onlineDate) fail("Van Buren energized MW or COD was filled");
  if (vanBuren.lat != null || vanBuren.lng != null) fail("Van Buren pin was invented");
  if (!vanBuren.sourceUrl2?.includes("dtebusinessupdate92826fi.htm")) fail("Van Buren is missing the DTE 8-K source");
  const ev = evidenceFor(vanBuren);
  if (ev.mw.mark !== "CLAIM" || !ev.mw.reason.includes("company-stated (DTE 8-K)")) {
    fail("Van Buren MW is not labeled company-stated (DTE 8-K)");
  }
  if (ev.mw.reason.includes("MPSC-stated") && !ev.mw.reason.includes("not MPSC-stated")) {
    fail("Van Buren 1000 MW was labeled MPSC-stated");
  }
  if (hasLongDash(ev.mw.reason) || hasLongDash(vanBuren.summary)) fail("Van Buren copy has a long dash");
}

const nebiusClt = COMMITMENTS.find((c) => c.id === "nebius-aib-clt01-sc-50");
if (!nebiusClt) fail("missing Nebius CLT-01");
else {
  if (nebiusClt.numberKind !== "it_capacity" || nebiusClt.counts !== "no" || nebiusClt.status !== "contracted") {
    fail("Nebius CLT-01 kind, counts, or status changed");
  }
  if (nebiusClt.capacityMW !== 50) fail("Nebius CLT-01 capacity is not 50 MW");
  if (nebiusClt.energizedMW != null || nebiusClt.onlineDate) fail("Nebius CLT-01 energized MW or COD was filled");
  if (nebiusClt.summary.includes("50+65") || nebiusClt.summary.includes("115")) fail("Nebius CLT-01 copy adds 50 and 65");
  if (hasLongDash(nebiusClt.summary) || hasLongDash(nebiusClt.headline)) fail("Nebius CLT-01 copy has a long dash");
}

const pointBeach = COMMITMENTS.find((c) => c.id === "oracle-we-energies-point-beach");
if (!pointBeach) fail("missing Point Beach");
else {
  if (pointBeach.numberKind !== "offtake_existing" || pointBeach.counts !== "no" || pointBeach.status !== "announced") {
    fail("Point Beach kind, counts, or status changed");
  }
  if (pointBeach.capacityMW != null) fail("Point Beach stored an MW figure");
  if (pointBeach.energizedMW != null || pointBeach.onlineDate) fail("Point Beach energized MW or COD was filled");
  const ev = evidenceFor(pointBeach);
  if (ev.mw.mark !== "EMPTY PRIMARY") fail("Point Beach MW is not EMPTY PRIMARY");
  if (hasLongDash(pointBeach.summary) || hasLongDash(ev.mw.reason)) fail("Point Beach copy has a long dash");
}

const byIdGuard = new Map(COMMITMENTS.map((c) => [c.id, c]));
const guard = (id: string) => {
  const row = byIdGuard.get(id);
  if (!row) fail(`missing ${id}`);
  return row;
};
const calvertA = guard("amazon-constellation-calvert-cliffs-existing-500");
if (calvertA) {
  if (calvertA.numberKind !== "offtake_existing" || calvertA.counts !== "yes" || calvertA.capacityMW !== 500) fail("Calvert A is not 500 MW counted existing-plant");
  if (calvertA.energizedMW != null || calvertA.onlineDate) fail("Calvert A energized MW or COD was filled");
}
const calvertB = guard("amazon-constellation-calvert-cliffs-uprate-190");
if (calvertB) {
  if (calvertB.numberKind !== "offtake_new" || calvertB.counts !== "no" || calvertB.capacityMW !== 190) fail("Calvert B is not 190 MW uncounted new-plant");
}
for (const c of [calvertA, calvertB]) {
  if (c && (c.numberKind === "it_capacity" || /\b500 ?\+ ?190\b|\b690 MW (is )?counted/.test(c.summary))) fail(`${c.id} filed as IT or combines 500 and 190`);
}
const g890 = guard("google-constellation-pjm-uprates-890");
if (g890) {
  if (g890.numberKind !== "offtake_new" || g890.counts !== "no" || g890.capacityMW !== 890 || g890.status !== "ppa-signed") fail("Google 890 kind, counts, MW, or status changed");
  if (g890.lat != null || g890.lng != null || g890.city || g890.state) fail("Google 890 was pinned or given a city or state");
  if (!g890.summary.startsWith("IL, PA, NJ (PJM), 11 units at 6 sites")) fail("Google 890 summary lead changed");
  if (/3,?590/.test(g890.summary)) fail("Google 890 summed with 2,700");
}
const bh = guard("google-black-hills-cheyenne-lpcsa-590");
if (bh) {
  if (bh.numberKind !== "utility_load" || bh.counts !== "no" || bh.capacityMW !== 590 || bh.status !== "contracted") fail("Black Hills Cheyenne kind, counts, MW, or status changed");
  if (bh.lat != null || bh.lng != null) fail("Black Hills Cheyenne was pinned");
  if (bh.energizedMW != null || bh.onlineDate) fail("Black Hills Cheyenne energized MW or COD was filled");
  if (/\b590 ?\+|\+ ?2,?100|\b2,?690\b|\b590 MW plus/.test(bh.summary)) fail("Black Hills Cheyenne shows a combined figure");
}
const cwCheyenne = guard("coreweave-related-cheyenne-it-88");
if (cwCheyenne && (cwCheyenne.capacityMW !== 88 || cwCheyenne.status !== "construction" || cwCheyenne.counts !== "yes" || cwCheyenne.numberKind !== "it_capacity")) fail("CoreWeave Cheyenne 88 MW row changed");
const ell = guard("coreweave-applied-digital-ellendale");
if (ell) {
  if (ell.capacityMW !== 250 || ell.status !== "operational" || ell.counts !== "yes" || ell.numberKind !== "it_capacity") fail("Ellendale is not 250 MW operational counted IT");
  if (ell.energizedMW != null) fail("Ellendale energized MW was filled");
  if (/250 ?\+ ?150/.test(ell.summary)) fail("Ellendale combines 250 and 150");
}
const ga = guard("google-georgia-power-vogtle-hatch-uprate-96");
if (ga) {
  if (ga.counts !== "no" || ga.status !== "announced" || ga.excludeReason !== "zec_only") fail("Georgia 96 counts, status, or excludeReason changed");
  if (!ga.sourceUrl2?.includes("documentId=229054")) fail("Georgia 96 is missing PSC Document 229054");
}
const saline = guard("stargate-saline-michigan-related");
if (saline && (saline.counterparty !== "Green Chile Ventures LLC" || saline.counts !== "no")) fail("Saline counterparty or counts changed");
for (const id of ["amazon-constellation-calvert-cliffs-existing-500", "amazon-constellation-calvert-cliffs-uprate-190", "google-constellation-pjm-uprates-890", "google-black-hills-cheyenne-lpcsa-590", "coreweave-applied-digital-ellendale", "google-georgia-power-vogtle-hatch-uprate-96", "stargate-saline-michigan-related"]) {
  const row = byIdGuard.get(id);
  if (row && (hasLongDash(row.summary) || hasLongDash(row.headline) || hasLongDash(row.project) || hasLongDash(row.counterparty))) fail(`${id} copy has a long dash`);
}

const onSiteOhio = rankRows("kind:on_site state:OH", COMMITMENTS).map((hit) => hit.row.id).sort();
const onSiteOhioWant = COMMITMENTS.filter((c) => c.numberKind === "btm_gen" && (c.state.trim().toLowerCase() === "oh" || c.state.trim().toLowerCase() === "ohio"))
  .map((c) => c.id)
  .sort();
if (onSiteOhio.join("|") !== onSiteOhioWant.join("|")) fail("kind:on_site state:OH did not match on-site Ohio rows");
if (rankRows("counted:yes", COMMITMENTS).length !== 24) fail("counted:yes result count changed");
const texasCode = rankRows("state:TX", COMMITMENTS).map((hit) => hit.row.id).sort().join("|");
const texasName = rankRows("state:Texas", COMMITMENTS).map((hit) => hit.row.id).sort().join("|");
if (!texasCode || texasCode !== texasName) fail("Texas and TX are not one filter value");

const pins: Record<string, [number, number]> = {
  "fluidstack-lake-mariner-it-378": [43.3472, -78.5553],
  "fluidstack-abernathy-it-168": [33.8323, -101.8427],
  "fluidstack-barber-lake-it-168": [32.3882, -100.8621],
  "fluidstack-river-bend-it-245": [30.7572, -91.3334],
  "fluidstack-meridian-arc-indiana-it-430": [39.0406, -87.4403],
};
for (const [id, [lat, lng]] of Object.entries(pins)) {
  const row = COMMITMENTS.find((c) => c.id === id);
  if (!row || row.lat !== lat || row.lng !== lng) fail(`${id} pin moved (${row?.lat}, ${row?.lng})`);
}

const scanned = [
  "src/lib/evidence.ts",
  "src/lib/search.ts",
  "src/lib/ask.ts",
  "src/components/AskAtlas.tsx",
  "src/components/DetailPanel.tsx",
  "src/components/FilterRail.tsx",
  "src/components/MapCanvas.tsx",
  "src/App.tsx",
  "src/lib/select.ts",
  "src/lib/recordMeta.ts",
  "src/lib/url.ts",
  "src/components/SearchBox.tsx",
  "src/components/TrustStrip.tsx",
  "src/components/KindStrip.tsx",
  "src/index.css",
];
const networkCall = new RegExp("\\bfetch\\s*\\(|XMLHttpRequest|new WebSocket|sendBeacon");
for (const file of scanned) {
  const text = fs.readFileSync(file, "utf8");
  if (hasLongDash(text)) fail(`${file} contains a long dash`);
  if (networkCall.test(text)) fail(`${file} has a network call`);
}
const selfText = fs.readFileSync("scripts/check-search-ask.ts", "utf8");
if (hasLongDash(selfText)) fail("scripts/check-search-ask.ts contains a long dash");

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log("search and ask ok (on-site 400 MW, kinds stay separate, no network)");
