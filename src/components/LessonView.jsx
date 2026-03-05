import { useState, useEffect } from "react";
import { cacheGet, cacheClear } from "../services/cache";
import { generateContent } from "../services/api";
import { TheoryCard } from "./TheoryCard";
import { SpeakWord } from "./SpeakWord";
import { ShadowCard } from "./ShadowCard";
import { StressLegend } from "./PhraseAnnotation";
import { IconBack, IconRefresh, IconCheck, IconArrow, IconClose } from "./Icons";
import { Footer } from "./Footer";

export function LessonView({ def, onBack, completed, onComplete, darkToggle, tab = "theory", onTabChange }) {
  const setTab = onTabChange || (() => {});
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitted, setSub]   = useState(false);
  const [score, setScore]     = useState(null);
  const [exItems, setEx]      = useState([]);
  const [fromCache, setFromCache] = useState(false);

  async function load(force = false) {
    if (!force) {
      const cached = cacheGet(def.id);
      if (cached) {
        setContent(cached);
        setEx([...cached.exercises].sort(() => Math.random() - 0.5));
        setAnswers({}); setSub(false); setScore(null);
        setFromCache(true);
        return;
      }
    }
    setFromCache(false);
    setLoading(true); setError(null);
    try {
      if (force) cacheClear(def.id);
      const data = await generateContent(def, force);
      setContent(data);
      setEx([...data.exercises].sort(() => Math.random() - 0.5));
      setAnswers({}); setSub(false); setScore(null);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(false); }, [def.id]);

  function submitEx() {
    let c = 0;
    exItems.forEach(i => { if (answers[i.word || i.phrase] === i.answer) c++; });
    setScore(c); setSub(true);
  }

  function retryEx() {
    setAnswers({}); setSub(false); setScore(null);
    setEx(p => [...p].sort(() => Math.random() - 0.5));
  }

  const allAnswered = exItems.length > 0 && exItems.every(i => answers[i.word || i.phrase]);
  const TABS = ["theory", "practice", "shadowing"];
  const TAB_LABELS = { theory: "Theory", practice: "Practice", shadowing: "Shadowing" };

  return (
    <div className="page">
      {/* sticky header + tabs */}
      <div className="sticky top-0 z-50 bg-gray-50 dark:bg-gray-950">
        <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <button className="btn btn-default !px-3.5 !py-2" onClick={onBack}><IconBack size="md" /></button>
            <div className="flex-1 min-w-0">
              <p className="mono-label">{def.session}</p>
              <p className="text-base mt-0.5 truncate">{def.title}</p>
            </div>
            <button className="btn btn-default btn-sm gap-1" onClick={() => load(true)} disabled={loading}>
              {loading ? "…" : <><IconRefresh size="sm" /> New</>}
            </button>
            {completed && <span className="mono-dim"><IconCheck size="sm" /></span>}
            {darkToggle}
          </div>
        </div>
        <div className="flex border-b border-gray-200 dark:border-gray-700 pl-1 overflow-x-auto">
          {TABS.map(t => (
            <button key={t}
              className={`tab-btn ${tab === t ? "tab-btn-active" : ""}`}
              onClick={() => setTab(t)}>{TAB_LABELS[t]}</button>
          ))}
        </div>
      </div>

      {/* content */}
      <div className="page-content">
        {error && (
          <div className="text-red-500 text-sm p-3.5 border border-red-900/20 rounded mb-5 leading-relaxed">
            {error}
            <br />
            <button className="btn btn-default btn-sm mt-2.5" onClick={load}>Retry</button>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center gap-7" style={{ minHeight: "calc(100dvh - 10rem)" }}>
            <div className="flex gap-1.5">
              {[0,1,2].map(i => (
                <div key={i} className="loading-dot"
                  style={{ animation: `pulse-dot 1.2s ease-in-out ${i * 0.2}s infinite` }} />
              ))}
            </div>
            <p className="text-sm text-gray-400 dark:text-gray-500 tracking-wide">Generating content…</p>
          </div>
        )}

        {!loading && content && (
          <div className="flex-1">
            {tab === "theory" && (
              <div>
                <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                  {def.subtitle} · tap a card to expand · tap any word to hear it
                </p>
                {content.theory.map((item, i) => <TheoryCard key={i} item={item} />)}
                <button className="btn btn-primary btn-full mt-4 gap-1" onClick={() => setTab("practice")}>
                  Start practice <IconArrow size="sm" />
                </button>
              </div>
            )}

            {tab === "practice" && (
              <div>
                <p className="text-sm text-gray-500 mb-4">{def.exerciseQuestion} · tap a word to hear it</p>

                {submitted && (
                  <div className="card p-4 mb-5 text-center">
                    <div className="text-3xl mb-1">{score}/{exItems.length}</div>
                    <p className="text-sm text-gray-500">{score === exItems.length ? "perfect." : "review and retry."}</p>
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  {exItems.map((item, idx) => {
                    const isRewrite = def.exerciseType === "rewrite";
                    const key    = item.word || item.phrase;
                    const chosen = answers[key];
                    const ok     = submitted && chosen === item.answer;
                    const bad    = submitted && chosen && chosen !== item.answer;
                    const opts   = isRewrite ? item.options : def.exerciseOptions;

                    return (
                      <div key={idx} className={`card p-3 ${bad ? "!border-red-900/30" : ""}`}>
                        {isRewrite ? (
                          <>
                            <SpeakWord word={item.phrase} ipa={item.ipa} className="text-base inline-block mb-1">{item.phrase}</SpeakWord>
                            <p className="mono-muted mb-3">{item.ipa} · {item.syllables}</p>
                            {submitted && !ok && <p className="text-sm text-gray-500 mb-2 flex items-center gap-1"><IconArrow size="sm" /> {item.answer}</p>}
                            <div className="flex flex-col gap-1.5">
                              {opts.map(opt => {
                                const sel   = chosen === opt;
                                const right = submitted && opt === item.answer;
                                return (
                                  <button key={opt}
                                    onClick={() => !submitted && setAnswers(p => ({ ...p, [key]: opt }))}
                                    className={`option-btn text-left ${submitted ? "!cursor-default" : ""}
                                      ${right && submitted ? "option-correct" : sel ? "option-selected" : "option-default"}`}>
                                    {opt}
                                  </button>
                                );
                              })}
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex justify-between mb-2.5 items-start gap-2">
                              <div>
                                <SpeakWord word={item.word} ipa={item.ipa} className="text-[1.1rem] inline-block mb-0.5">{item.word}</SpeakWord>
                                <p className="mono-muted mt-1">{item.ipa} · {item.syllables}</p>
                              </div>
                              {submitted && (
                                <span className={`font-mono text-sm shrink-0 flex items-center gap-0.5 ${ok ? "text-gray-500" : "text-red-500"}`}>
                                  {ok ? <IconCheck size="sm" /> : <><IconClose size="sm" /> {item.answer}</>}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {opts.map(opt => {
                                const sel = chosen === opt;
                                return (
                                  <button key={opt}
                                    onClick={() => !submitted && setAnswers(p => ({ ...p, [key]: opt }))}
                                    className={`option-btn-sm ${submitted ? "!cursor-default" : ""}
                                      ${sel ? "option-selected" : "option-default"}`}>
                                    {opt}
                                  </button>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex gap-2 mt-4 flex-wrap">
                  {!submitted
                    ? <button className="btn btn-primary btn-full gap-1" onClick={submitEx} disabled={!allAnswered}>Check <IconArrow size="sm" /></button>
                    : <>
                        <button className="btn btn-default gap-1" onClick={retryEx}><IconRefresh size="sm" /> Retry</button>
                        <button className="btn btn-ghost gap-1" onClick={load}><IconRefresh size="sm" /> New words</button>
                        {score === exItems.length && <button className="btn btn-primary gap-1" onClick={onComplete}><IconCheck size="sm" /> Complete</button>}
                      </>
                  }
                </div>
              </div>
            )}

            {tab === "shadowing" && (
              <div>
                <p className="text-sm text-gray-500 mb-2 leading-relaxed">
                  listen, shadow, compare · record yourself imitating the native speaker
                </p>
                <StressLegend />
                {content.shadowing.map((p, i) => (
                  <ShadowCard key={`${def.id}-${i}-${p.phrase}`}
                    phrase={p.phrase} ipa={p.ipa} syllables={p.syllables} note={p.note} tokens={p.tokens} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="max-w-[40rem] mx-auto px-4 w-full">
        <Footer />
      </div>
    </div>
  );
}
