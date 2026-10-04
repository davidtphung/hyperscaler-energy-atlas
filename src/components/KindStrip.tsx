import type { Commitment } from "../types";
import { formatNumberKindShort, formatPower } from "../lib/format";
import { firmKindTotals } from "../lib/select";

interface Props {
  rows: readonly Pick<Commitment, "numberKind" | "counts" | "capacityMW" | "bound">[];
}

/** Five kind totals on the small-screen first view. They are never added. */
export default function KindStrip({ rows }: Props) {
  const kinds = firmKindTotals(rows);
  return (
    <section className="kind-strip" aria-label="Five separate totals. They are not added together.">
      {kinds.map((kind) => (
        <div className="kind-strip__item" key={kind.kind}>
          <span className="kind-strip__k">{formatNumberKindShort(kind.kind)}</span>
          <span className="kind-strip__v">{formatPower(kind.mw, kind.approx)}</span>
          <span className="kind-strip__n">{kind.rows} counted</span>
        </div>
      ))}
      <p className="kind-strip__note">Separate totals. Not added together.</p>
    </section>
  );
}
