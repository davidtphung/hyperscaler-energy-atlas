import { useCallback, useEffect, useRef, useState } from "react";

// A live reference grid. carbonintensity.org.uk is a free, keyless, CORS-enabled
// API for the Great Britain national grid. It is not a hyperscaler feed; it is
// shown as a real-time anchor for what an actual national grid is generating
// right now, against which the committed portfolio can be read for scale.

interface FuelSlice {
  fuel: string;
  perc: number;
}

interface GridState {
  mix: FuelSlice[];
  intensity: number | null;
  index: string | null;
  from: string | null;
}

const FUEL_LABEL: Record<string, string> = {
  gas: "Gas",
  coal: "Coal",
  nuclear: "Nuclear",
  wind: "Wind",
  solar: "Solar",
  hydro: "Hydro",
  biomass: "Biomass",
  imports: "Imports",
  other: "Other",
};

const FUEL_COLOR: Record<string, string> = {
  gas: "#9aa3ad",
  coal: "#5b5048",
  nuclear: "#f2a93b",
  wind: "#7fc4ec",
  solar: "#f5d547",
  hydro: "#5aa9e6",
  biomass: "#9ad17a",
  imports: "#a78bfa",
  other: "#6b7480",
};

const LOW_CARBON = new Set(["nuclear", "wind", "solar", "hydro", "biomass"]);
const REFRESH_MS = 5 * 60 * 1000;

export default function LiveGrid() {
  const [state, setState] = useState<GridState | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const timer = useRef<number | null>(null);

  const load = useCallback(async () => {
    const ctrl = new AbortController();
    try {
      if (!state) setStatus("loading");
      const [genRes, intRes] = await Promise.all([
        fetch("https://api.carbonintensity.org.uk/generation", { signal: ctrl.signal }),
        fetch("https://api.carbonintensity.org.uk/intensity", { signal: ctrl.signal }),
      ]);
      if (!genRes.ok || !intRes.ok) throw new Error("bad response");
      const gen = await genRes.json();
      const int = await intRes.json();
      const mix: FuelSlice[] = (gen?.data?.generationmix ?? [])
        .filter((f: FuelSlice) => f.perc > 0)
        .sort((a: FuelSlice, b: FuelSlice) => b.perc - a.perc);
      const intel = int?.data?.[0]?.intensity;
      setState({
        mix,
        intensity: intel?.actual ?? intel?.forecast ?? null,
        index: intel?.index ?? null,
        from: gen?.data?.from ?? null,
      });
      setStatus("ready");
    } catch (e) {
      if ((e as Error).name !== "AbortError") setStatus((s) => (state ? s : "error"));
    }
    return () => ctrl.abort();
  }, [state]);

  useEffect(() => {
    load();
    timer.current = window.setInterval(load, REFRESH_MS);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lowCarbon = state
    ? Math.round(state.mix.filter((f) => LOW_CARBON.has(f.fuel)).reduce((a, f) => a + f.perc, 0))
    : 0;

  const time = state?.from
    ? new Date(state.from).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) + " UTC"
    : "";

  return (
    <section className="livegrid" aria-label="Live reference grid">
      <div className="livegrid__head">
        <div>
          <h3 className="card__title">Live grid input</h3>
          <p className="card__sub">
            Great Britain national grid, generating now. Source: carbonintensity.org.uk
          </p>
        </div>
        <span className={`live-dot live-dot--${status}`} aria-hidden="true" />
      </div>

      {status === "loading" && (
        <div className="livegrid__state" role="status">
          <span className="spinner" aria-hidden="true" />
          Reading the grid
        </div>
      )}

      {status === "error" && (
        <div className="livegrid__state livegrid__state--err" role="status">
          <p>Live grid feed is unreachable right now.</p>
          <button className="btn-ghost" onClick={() => load()}>
            Retry
          </button>
        </div>
      )}

      {status === "ready" && state && (
        <>
          <div className="livegrid__metrics">
            <div className="livegrid__metric">
              <span className="livegrid__big">{lowCarbon}<small>%</small></span>
              <span className="livegrid__label">Low carbon now</span>
            </div>
            <div className="livegrid__metric">
              <span className="livegrid__big">
                {state.intensity ?? "n/a"}
                <small> gCO2</small>
              </span>
              <span className="livegrid__label">
                Carbon intensity {state.index ? `(${state.index})` : ""}
              </span>
            </div>
          </div>

          <div className="livegrid__bar" role="img" aria-label={`Live generation mix: ${state.mix.map((f) => `${FUEL_LABEL[f.fuel] ?? f.fuel} ${Math.round(f.perc)} percent`).join(", ")}`}>
            {state.mix.map((f) => (
              <span
                key={f.fuel}
                className="livegrid__seg"
                style={{ width: `${f.perc}%`, background: FUEL_COLOR[f.fuel] ?? "#6b7480" }}
                title={`${FUEL_LABEL[f.fuel] ?? f.fuel} ${f.perc.toFixed(1)}%`}
              />
            ))}
          </div>

          <ul className="livegrid__legend">
            {state.mix.slice(0, 6).map((f) => (
              <li key={f.fuel}>
                <span className="livegrid__swatch" style={{ background: FUEL_COLOR[f.fuel] ?? "#6b7480" }} />
                {FUEL_LABEL[f.fuel] ?? f.fuel}
                <b>{Math.round(f.perc)}%</b>
              </li>
            ))}
          </ul>
          {time && <p className="livegrid__time">Updated {time}, refreshes every 5 minutes</p>}
        </>
      )}
    </section>
  );
}
