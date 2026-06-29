import { useState } from "react";

// The donate flow opens a prefilled support email. Swap SUPPORT_LINK for a
// Stripe / payment-link URL to take card payments directly.
const SUPPORT_EMAIL = "contactdavidtphung@gmail.com";
const SUPPORT_LINK = "";

const TIERS = [10, 25, 50, 100];

const FUNDS = [
  { k: "Source-backed research", v: "Tracking every new deal, contested project, and datacenter to a primary source." },
  { k: "An open, free atlas", v: "No paywall, no ads, no account. The data stays public and auditable." },
  { k: "Live data and hosting", v: "Keeping the maps, the live grid feed, and the directory fast and online." },
];

export default function DonateView() {
  const [freq, setFreq] = useState<"once" | "monthly">("monthly");
  const [amount, setAmount] = useState<number>(25);
  const [custom, setCustom] = useState<string>("");

  const value = custom ? Math.max(1, Math.round(Number(custom) || 0)) : amount;

  const onSupport = () => {
    const label = freq === "monthly" ? "monthly" : "one time";
    if (SUPPORT_LINK) {
      window.open(SUPPORT_LINK, "_blank", "noopener,noreferrer");
      return;
    }
    const subject = encodeURIComponent(`Support HYPERGRID: $${value} ${label}`);
    const body = encodeURIComponent(
      `I would like to support HYPERGRID with $${value} ${label}.\n\nName:\nMessage:`
    );
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
  };

  return (
    <div className="page page--donate">
      <header className="page__head">
        <p className="overview__eyebrow">Support the work</p>
        <h1 className="page__title">Keep the atlas open and independent</h1>
        <p className="page__lead">
          HYPERGRID is an independent, source-backed map of the energy and infrastructure behind the AI build.
          It has no paywall and no ads. If it is useful to you, a contribution helps keep the research going and
          the data free for everyone.
        </p>
      </header>

      <div className="donate-grid">
        <section className="donate-card" aria-label="Make a contribution">
          <div className="seg-toggle" role="group" aria-label="Frequency">
            <button className="seg-toggle__btn" aria-pressed={freq === "once"} onClick={() => setFreq("once")}>
              One time
            </button>
            <button className="seg-toggle__btn" aria-pressed={freq === "monthly"} onClick={() => setFreq("monthly")}>
              Monthly
            </button>
          </div>

          <fieldset className="amount-grid">
            <legend className="sr-only">Choose an amount</legend>
            {TIERS.map((t) => (
              <button
                key={t}
                className="amount-btn"
                aria-pressed={!custom && amount === t}
                onClick={() => {
                  setAmount(t);
                  setCustom("");
                }}
              >
                ${t}
              </button>
            ))}
          </fieldset>

          <label className="amount-custom">
            <span className="amount-custom__sign">$</span>
            <input
              type="number"
              min={1}
              inputMode="numeric"
              placeholder="Custom amount"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              aria-label="Custom amount in US dollars"
            />
          </label>

          <button className="btn-primary donate-cta" onClick={onSupport}>
            Support with ${value}
            {freq === "monthly" ? " / month" : ""}
          </button>
          <p className="donate-fine">
            Opens a prefilled email to arrange your contribution. You can change the amount before sending.
          </p>
        </section>

        <aside className="donate-side">
          <h2 className="sources-h">Where it goes</h2>
          <ul className="donate-funds">
            {FUNDS.map((f) => (
              <li key={f.k}>
                <span className="donate-funds__dot" />
                <span>
                  <b>{f.k}.</b> {f.v}
                </span>
              </li>
            ))}
          </ul>
          <p className="about-credit">
            Built by{" "}
            <a href="https://x.com/davidtphung" target="_blank" rel="noopener noreferrer">
              David T Phung
            </a>
            . Thank you for keeping independent data open.
          </p>
        </aside>
      </div>
    </div>
  );
}
