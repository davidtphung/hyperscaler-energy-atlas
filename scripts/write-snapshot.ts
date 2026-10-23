/**
 * Write data/history/YYYY-MM-DD.json from committed rows.
 * Does not fetch news and does not edit commitment rows.
 *
 *   node --experimental-strip-types scripts/write-snapshot.ts
 *   node --experimental-strip-types scripts/write-snapshot.ts --date 2026-10-08 --input public/data.json
 */
import fs from "node:fs";
import path from "node:path";
import { COMMITMENTS } from "../src/data/commitments.ts";
import { buildSnapshot, pacificDate, type SnapshotInputRow } from "./snapshot.ts";

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

function rowsFromDataJson(file: string): SnapshotInputRow[] {
  const payload = JSON.parse(fs.readFileSync(file, "utf8")) as { rows?: SnapshotInputRow[] };
  if (!payload.rows) throw new Error(`${file} has no rows array`);
  return payload.rows.map((row) => ({
    id: row.id,
    status: row.status,
    capacityMW: row.capacityMW,
    counts: row.counts,
    numberKind: row.numberKind,
  }));
}

const input = arg("--input");
const date = arg("--date") ?? pacificDate();
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
  console.error(`write-snapshot: bad date ${date}`);
  process.exit(1);
}

const rows = input ? rowsFromDataJson(input) : COMMITMENTS;
const source = input ? path.posix.join(...input.split(path.sep)) : "src/data/commitments.ts";
const snapshot = buildSnapshot(rows, date, source);
const dir = path.resolve("data/history");
fs.mkdirSync(dir, { recursive: true });
const out = path.join(dir, `${date}.json`);
const next = `${JSON.stringify(snapshot, null, 2)}\n`;
const prev = fs.existsSync(out) ? fs.readFileSync(out, "utf8") : "";
if (prev !== next) fs.writeFileSync(out, next);
console.log(`${prev === next ? "unchanged" : "wrote"} ${path.relative(process.cwd(), out)} (${snapshot.rowCount} rows)`);
