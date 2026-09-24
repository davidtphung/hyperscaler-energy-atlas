import { COMMITMENTS } from "../data/commitments";
import { formatExactMW, formatNumberKind, formatPower } from "../lib/format";
import { firmKindTotals } from "../lib/select";

export default function ForecastView() {
  const kinds = firmKindTotals(COMMITMENTS);

  return (
    <div className="page page--forecast">
      <header className="page__head">
        <p className="overview__eyebrow">Forecast</p>
        <h1 className="page__title">No single capacity forecast</h1>
        <p className="page__lead">
          The atlas used to extend one blended capacity total into a growth cone. That total mixed different kinds of
          megawatts. This page now shows the same firm totals as the atlas, each on its own line. It does not project
          them forward and it does not add them together.
        </p>
      </header>

      <div className="dc-stats">
        {kinds.map((k) => (
          <div className="dc-stat" key={k.kind}>
            <span className="dc-stat__v">{formatPower(k.mw)}{k.mw >= 1000 ? <> <small>{formatExactMW(k.mw)}</small></> : null}</span>
            <span className="dc-stat__l">{formatNumberKind(k.kind)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
