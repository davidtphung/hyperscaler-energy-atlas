import { formatFullDate } from "../lib/format";
import { FIELD_DICTIONARY } from "../lib/recordMeta";

interface Props {
  dataThrough: string;
  rowCount: number;
  countedCount: number;
  onOpenRule: () => void;
}

function buildLabel(): string {
  const raw = typeof __ATLAS_BUILD_DATE__ === "string" ? __ATLAS_BUILD_DATE__ : "";
  if (!raw) return "not recorded";
  return formatFullDate(raw);
}

export default function TrustStrip({ dataThrough, rowCount, countedCount, onOpenRule }: Props) {
  const through = dataThrough ? formatFullDate(dataThrough) : "not recorded";
  return (
    <section className="trust-strip" aria-label="Atlas status">
      <p className="trust-strip__line">
        <span>Data through {through}.</span>
        <span>Built {buildLabel()}.</span>
        <span>
          {rowCount} rows, {countedCount} counted.
        </span>
        <button type="button" className="trust-strip__link" onClick={onOpenRule}>
          What counts
        </button>
        <a className="trust-strip__link" href="data.json" download>
          Download JSON
        </a>
        <a className="trust-strip__link" href="signals.json" download>
          Download signals JSON
        </a>
        <a className="trust-strip__link" href="data.csv" download>
          Download CSV
        </a>
      </p>
      <details className="trust-dict">
        <summary>Field dictionary</summary>
        <dl>
          {FIELD_DICTIONARY.map((field) => (
            <div key={field.name}>
              <dt>{field.name}</dt>
              <dd>{field.description}</dd>
            </div>
          ))}
        </dl>
      </details>
    </section>
  );
}
