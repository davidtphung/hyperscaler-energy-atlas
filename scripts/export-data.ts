import fs from "node:fs";
import { COMMITMENTS } from "../src/data/commitments.ts";
import { evidenceFor } from "../src/lib/evidence.ts";
import { FIELD_DICTIONARY } from "../src/lib/recordMeta.ts";
import { sourceDomain } from "../src/lib/search.ts";
import type { Commitment } from "../src/types.ts";

function rowOut(row: Commitment) {
  const evidence = evidenceFor(row);
  return {
    id: row.id,
    buyer: row.buyer,
    actorKind: row.actorKind ?? "",
    counterparty: row.counterparty,
    project: row.project,
    techType: row.techType,
    category: row.category,
    capacityMW: row.capacityMW,
    mwBasis: row.mwBasis ?? "",
    city: row.city,
    state: row.state,
    country: row.country,
    lat: row.lat,
    lng: row.lng,
    locationApprox: Boolean(row.locationApprox),
    date: row.date,
    constructionStart: row.constructionStart ?? "",
    onlineDate: row.onlineDate ?? "",
    status: row.status,
    headline: row.headline,
    summary: row.summary,
    sourceName: row.sourceName,
    sourceUrl: row.sourceUrl,
    sourceDomain: sourceDomain(row.sourceUrl),
    sourceName2: row.sourceName2 ?? "",
    sourceUrl2: row.sourceUrl2 ?? "",
    sourceDomain2: sourceDomain(row.sourceUrl2),
    confidence: row.confidence,
    numberKind: row.numberKind,
    parentId: row.parentId ?? "",
    counts: row.counts,
    bound: row.bound,
    excludeReason: row.excludeReason ?? "",
    energizedMW: row.energizedMW ?? "",
    daysToCod: row.daysToCod ?? "",
    checkedOn: row.checkedOn ?? "",
    evidenceStatus: evidence.status.mark,
    evidenceMw: evidence.mw.mark,
  };
}

function csvCell(value: unknown): string {
  if (value == null) return "";
  const text = String(value);
  if (/[",\n\r]/.test(text) || /^[=+\-@]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

const rows = COMMITMENTS.map(rowOut);
const payload = {
  rowCount: rows.length,
  note: "Kinds are not added together. Only rows with counts yes enter a firm total.",
  fields: FIELD_DICTIONARY,
  rows,
};
fs.writeFileSync("public/data.json", `${JSON.stringify(payload, null, 2)}\n`);

const header = Object.keys(rows[0] ?? {});
const lines = [header.join(",")];
for (const row of rows) {
  lines.push(header.map((key) => csvCell(row[key as keyof typeof row])).join(","));
}
fs.writeFileSync("public/data.csv", `${lines.join("\n")}\n`);

const count = String(COMMITMENTS.length);

function stamp(file: string, pattern: RegExp, next: string) {
  const text = fs.readFileSync(file, "utf8");
  if (!pattern.test(text)) {
    console.error(`export-data: pattern missing in ${file}`);
    process.exit(1);
  }
  const updated = text.replace(pattern, next);
  if (updated !== text) fs.writeFileSync(file, updated);
}

stamp("index.html", /mapped\. \d+ commitment rows/, `mapped. ${count} commitment rows`);
stamp("README.md", /The atlas holds \d+ commitment rows/, `The atlas holds ${count} commitment rows`);
stamp("MASTER.md", /timeline of \d+ hyperscaler/, `timeline of ${count} hyperscaler`);
stamp(
  "MASTER.md",
  /\| Commitments \| `src\/data\/commitments\.ts` \| \d+ \|/,
  `| Commitments | \`src/data/commitments.ts\` | ${count} |`,
);

console.log(`exported ${count} rows to public/data.json and public/data.csv`);
