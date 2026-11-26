export interface ArchivedPrice {
  sku: string;
  name: string;
  chip: string;
  usdPerGpuHour: number;
  unit: string;
  detail: string;
}

const CHIPS = ["H100", "H200", "B200", "B300"];

function decode(value: string): string {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"');
}

function plain(html: string): string {
  return decode(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function keep(rows: ArchivedPrice[]): ArchivedPrice[] {
  const bySku = new Map<string, ArchivedPrice>();
  const rejected = new Set<string>();
  for (const row of rows) {
    if (rejected.has(row.sku)) continue;
    if (!CHIPS.includes(row.chip)) continue;
    if (!Number.isFinite(row.usdPerGpuHour) || row.usdPerGpuHour <= 0 || row.usdPerGpuHour > 400) continue;
    const prior = bySku.get(row.sku);
    if (prior && prior.usdPerGpuHour !== row.usdPerGpuHour) {
      bySku.delete(row.sku);
      rejected.add(row.sku);
      continue;
    }
    if (!prior) bySku.set(row.sku, row);
  }
  return [...bySku.values()];
}

export function parseLambdaGpuCloud(html: string): ArchivedPrice[] {
  const rows: ArchivedPrice[] = [];
  for (const row of html.match(/<tr\b[\s\S]*?<\/tr>/gi) ?? []) {
    const text = plain(row);
    const match = text.match(
      /^On-demand (\d+)x NVIDIA (H100|H200|B200|B300) (SXM|PCIe|NVL)\b.*\$([0-9]+(?:\.[0-9]+)?) \/ GPU \/ hr$/,
    );
    if (!match) continue;
    const count = Number(match[1]);
    const chip = match[2];
    const form = match[3].toLowerCase();
    rows.push({
      sku: `${chip.toLowerCase()}-${form}-${count}x`,
      name: `On-demand ${count}x ${chip} ${match[3]}`,
      chip,
      usdPerGpuHour: Number(match[4]),
      unit: "USD per GPU-hour",
      detail: "The archived page prints this as dollars per GPU per hour.",
    });
  }
  return keep(rows);
}

export function parseCoreweavePricing(html: string): ArchivedPrice[] {
  const start = html.indexOf("kubernetes-gpu-pricing");
  if (start < 0) return [];
  const cpu = html.indexOf("On-demand CPU instances", start);
  const section = html.slice(start, cpu > start ? cpu : start + 250000);
  const rows: ArchivedPrice[] = [];
  for (const row of section.match(/<div role="listitem"[\s\S]*?(?=<div role="listitem"|$)/g) ?? []) {
    const nameMatch = row.match(/class="table-model-name">([^<]+)<\/h3>/);
    if (!nameMatch) continue;
    const name = decode(nameMatch[1]).replace(/\s+/g, " ").trim();
    const chip = CHIPS.find((item) => new RegExp(`\\b${item}\\b`).test(name.toUpperCase()));
    if (!chip) continue;
    const cells = [...row.matchAll(/<div>([^<]+)<\/div>/g)].map((item) => decode(item[1]).replace(/\s+/g, " ").trim());
    const countCell = cells.find((cell) => /^\d+$/.test(cell));
    const priceCell = cells.find((cell) => /^\$[0-9]+(?:\.[0-9]+)?$/.test(cell));
    if (!countCell || !priceCell) continue;
    if (cells.filter((cell) => /^\$[0-9]+(?:\.[0-9]+)?$/.test(cell)).length !== 1) continue;
    const count = Number(countCell);
    const instance = Number(priceCell.slice(1));
    if (!Number.isInteger(count) || count < 1 || count > 16 || !Number.isFinite(instance)) continue;
    rows.push({
      sku: `${chip.toLowerCase()}-${count}gpu`,
      name: `${name}, ${count} GPU`,
      chip,
      usdPerGpuHour: instance,
      unit: `USD per node-hour (${count} GPU)`,
      detail: `The page prints $${instance} per hour for the ${count} GPU instance. This point is that printed instance price.`,
    });
  }
  return keep(rows);
}

export function parseSfFromPrice(html: string): ArchivedPrice[] {
  const rows: ArchivedPrice[] = [];
  for (const match of html.matchAll(/Buy (H100|H200|B200|B300)s from \$([0-9]+(?:\.[0-9]+)?)\/hr/g)) {
    rows.push({
      sku: `${match[1].toLowerCase()}-from`,
      name: `${match[1]} from price`,
      chip: match[1],
      usdPerGpuHour: Number(match[2]),
      unit: "USD per GPU-hour",
      detail: "The page prints this as a from price, the advertised floor for that chip.",
    });
  }
  return keep(rows);
}
