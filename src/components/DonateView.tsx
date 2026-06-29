import { useState } from "react";

// Donation methods mirror the maintainer's standard set (same wallets as the
// companion projects). Crypto addresses are copy-to-clipboard.
interface Method {
  key: string;
  name: string;
  network: string;
  address: string;
  color: string;
  symbol: string;
}

const METHODS: Method[] = [
  { key: "btc", name: "Bitcoin", network: "Bitcoin Network", address: "3LmGHi5gvPbFYrstbBS5MTbLcQuWEBVBQq", color: "#f7931a", symbol: "₿" },
  { key: "cbbtc", name: "cbBTC", network: "Base Network", address: "0xF24594C7023A2a0b6dFb97F07ae1c1eb970a9816", color: "#f7931a", symbol: "₿" },
  { key: "usdc", name: "USDC", network: "Base Network", address: "0xb25eb698392eaE827b64EEB9cb124C62Be0D3dD7", color: "#2775ca", symbol: "$" },
  { key: "eth", name: "Ethereum", network: "Ethereum Network", address: "0x1A1c37C145a1EaB58C43F003EBB55C18083b5987", color: "#627eea", symbol: "Ξ" },
];

const NOTES = [
  "Donations are voluntary and non-refundable.",
  "Crypto transactions are irreversible. Please double-check every address before sending.",
  "This is not a 501(c)(3) nonprofit. Contributions are not tax deductible.",
];

export default function DonateView() {
  return (
    <div className="page page--donate">
      <div className="donate2">
        <header className="donate2__head">
          <p className="overview__eyebrow">Support</p>
          <h1 className="donate2__title">Support HYPERGRID</h1>
          <p className="donate2__lead">
            Independent, source-backed data. No ads, no paywalls, no corporate sponsors, no user tracking. Your
            contribution funds research, data, and hosting.
          </p>
        </header>

        <section aria-label="Donation methods">
          <p className="donate2__label">Donation methods</p>
          <div className="donate2__methods">
            {METHODS.map((m) => (
              <MethodCard key={m.key} m={m} />
            ))}

            <a className="method method--link" href="https://venmo.com/davidtphung" target="_blank" rel="noopener noreferrer">
              <span className="method__top">
                <span className="method__icon" style={{ background: "#3d95ce", color: "#fff" }} aria-hidden="true">V</span>
                <span className="method__id">
                  <span className="method__name">Venmo</span>
                  <span className="method__net">@davidtphung</span>
                </span>
              </span>
              <span className="method__go" aria-hidden="true">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M7 17 17 7M9 7h8v8" />
                </svg>
              </span>
            </a>
          </div>
        </section>

        <section className="donate2__important" aria-label="Important">
          <p className="donate2__label">Important</p>
          <ul>
            {NOTES.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </section>

        <p className="donate2__foot">
          Questions or thanks: reach{" "}
          <a href="https://x.com/davidtphung" target="_blank" rel="noopener noreferrer">
            @davidtphung
          </a>{" "}
          on X.
        </p>
      </div>
    </div>
  );
}

function MethodCard({ m }: { m: Method }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(m.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  };
  return (
    <div className="method">
      <div className="method__top">
        <span className="method__icon" style={{ background: m.color, color: "#0a0c10" }} aria-hidden="true">
          {m.symbol}
        </span>
        <span className="method__id">
          <span className="method__name">{m.name}</span>
          <span className="method__net">{m.network}</span>
        </span>
      </div>
      <div className="method__addr-row">
        <code className="method__addr">{m.address}</code>
        <button className={`method__copy${copied ? " is-copied" : ""}`} onClick={copy} aria-label={copied ? "Copied" : `Copy ${m.name} address`}>
          {copied ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M20 6 9 17l-5-5" /></svg>
              Copied
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg>
              Copy
            </>
          )}
        </button>
      </div>
    </div>
  );
}
