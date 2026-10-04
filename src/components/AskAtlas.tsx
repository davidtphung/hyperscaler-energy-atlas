import { useEffect, useRef, useState } from "react";
import type { Commitment } from "../types";
import { ASK_EXAMPLES, ask, type AskResult } from "../lib/ask";

interface Props {
  rows: readonly Commitment[];
  question: string;
  onQuestion: (q: string) => void;
  onSelect: (id: string) => void;
  onHighlight: (ids: string[]) => void;
}

export default function AskAtlas({ rows, question, onQuestion, onSelect, onHighlight }: Props) {
  const [open, setOpen] = useState(question.trim().length > 0);
  const [draft, setDraft] = useState(question);
  const [result, setResult] = useState<AskResult | null>(() => (question.trim() ? ask(question, rows) : null));

  const ids = result && result.ok ? result.groups.flatMap((g) => g.hits.map((h) => h.id)) : [];
  const idsKey = ids.join("|");

  useEffect(() => {
    onHighlight(idsKey ? idsKey.split("|") : []);
  }, [idsKey, onHighlight]);

  const seenQuestion = useRef(question);
  useEffect(() => {
    if (question === seenQuestion.current) return;
    seenQuestion.current = question;
    setDraft(question);
    if (!question.trim()) {
      setResult(null);
      return;
    }
    setOpen(true);
    setResult(ask(question, rows));
  }, [question, rows]);

  const run = (next: string) => {
    const q = next.trim();
    setDraft(q);
    onQuestion(q);
    if (!q) {
      setResult(null);
      return;
    }
    setOpen(true);
    setResult(ask(q, rows));
  };

  return (
    <section className="ask">
      <button
        type="button"
        className="ask__toggle"
        aria-expanded={open}
        aria-controls="ask-atlas-panel"
        onClick={() => setOpen((v) => !v)}
      >
        Ask the Atlas
      </button>
      {open && (
        <div id="ask-atlas-panel" className="ask__panel">
          <p className="ask__note">
            Questions stay in this browser. They use the rows already loaded. This is not a language model.
            The examples below are the questions it can answer.
          </p>
          <div className="ask__form">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") run(draft);
              }}
              placeholder="Ask about the loaded rows"
              aria-label="Ask the Atlas"
            />
            <button type="button" className="ask__go" onClick={() => run(draft)}>
              Ask
            </button>
          </div>
          <div className="ask__chips">
            {ASK_EXAMPLES.map((example) => (
              <button key={example} type="button" className="chip" onClick={() => run(example)}>
                {example}
              </button>
            ))}
          </div>
          {result && (
            <div className="ask__answer" role="status">
              <p className="ask__lead">{result.lead}</p>
              {result.separation && <p className="ask__sep">{result.separation}</p>}
              {result.groups.map((group) => (
                <section key={group.kind} className="ask__group">
                  <h4 className="ask__heading">{group.heading}</h4>
                  {group.totalText && (
                    <p className="ask__total">
                      {group.heading}: {group.totalText}
                    </p>
                  )}
                  <ul className="ask__list">
                    {group.hits.map((hit) => (
                      <li key={hit.id}>
                        <button type="button" className="ask__hit" onClick={() => onSelect(hit.id)}>
                          <span className="ask__hit-buyer">{hit.buyer}</span>
                          <span className="ask__hit-project">{hit.project}</span>
                          <span className="ask__hit-meta">
                            {hit.mwText}
                            {" · "}
                            {hit.statusLabel}
                            {" · "}
                            {hit.countTag}
                            {hit.statusEvidence ? ` · Status ${hit.statusEvidence}` : ""}
                            {hit.mwEvidence ? ` · MW ${hit.mwEvidence}` : ""}
                          </span>
                        </button>
                        <a className="ask__source" href={hit.sourceUrl} target="_blank" rel="noopener noreferrer">
                          {hit.sourceName}
                        </a>
                        {hit.sourceUrl2 && (
                          <a className="ask__source" href={hit.sourceUrl2} target="_blank" rel="noopener noreferrer">
                            {hit.sourceName2 ?? hit.sourceUrl2}
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
              <p className="ask__footer">{result.footer}</p>
              <button type="button" className="ask__clear" onClick={() => run("")}>
                Clear
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
