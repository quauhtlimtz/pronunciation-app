import { useState, useEffect, useRef, useCallback } from "react";
import { getContent } from "../services/content";
import { TheoryCard } from "./TheoryCard";
import { SpeakWord } from "./SpeakWord";
import { ShadowCard } from "./ShadowCard";
import { StressLegend } from "./PhraseAnnotation";
import { IconBack, IconRefresh, IconCheck, IconArrow, IconClose } from "./Icons";
import { Footer } from "./Footer";
import { MicBar } from "./MicBar";

// Letter patterns that produce each IPA sound, ordered longest-first for greedy match
const SOUND_PATTERNS = {
  "/tʃ/": ["tch", "ch", "tu"],
  "/dʒ/": ["dge", "dg", "ge", "gi", "gy", "j"],
  "/ʃ/":  ["shi", "sh", "ti", "ci", "ssi", "ss", "si", "ch"],
  "/ʒ/":  ["si", "su", "ge", "s"],
  "/θ/":  ["th"],
  "/ð/":  ["th"],
  "/ŋ/":  ["ng", "n"],
};

function inferHighlight(word, answer) {
  const patterns = SOUND_PATTERNS[answer];
  if (!patterns) return null;
  const lower = word.toLowerCase();
  for (const p of patterns) {
    const idx = lower.indexOf(p);
    if (idx !== -1) return { idx, len: p.length };
  }
  return null;
}

function highlightWord(word, letters) {
  const idx = word.toLowerCase().indexOf(letters.toLowerCase());
  if (idx === -1) return word;
  return (
    <>
      {word.slice(0, idx)}
      <span className="font-bold underline decoration-2 underline-offset-4 decoration-amber-500">{word.slice(idx, idx + letters.length)}</span>
      {word.slice(idx + letters.length)}
    </>
  );
}

function highlightBySound(word, answer) {
  const match = inferHighlight(word, answer);
  if (!match) return word;
  return (
    <>
      {word.slice(0, match.idx)}
      <span className="font-bold underline decoration-2 underline-offset-4 decoration-amber-500">{word.slice(match.idx, match.idx + match.len)}</span>
      {word.slice(match.idx + match.len)}
    </>
  );
}

function ConfirmDialog({ onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-sm w-full p-6 border border-gray-200 dark:border-gray-700"
        onClick={e => e.stopPropagation()}>
        <p className="text-base mb-1">Leave this page?</p>
        <p className="text-sm text-gray-500 leading-relaxed mb-5">
          You have a recording that hasn't been saved. It will be lost if you navigate away.
        </p>
        <div className="flex gap-2 justify-end">
          <button className="btn btn-default" onClick={onCancel}>Stay</button>
          <button className="btn btn-ghost text-amber-700 dark:text-amber-500" onClick={onConfirm}>Leave</button>
        </div>
      </div>
    </div>
  );
}

export function LessonView({ def, onBack, completed, progress: lessonProgress, onComplete, onPracticeAnswer, onShadowingPhrase, darkToggle, tab = "theory", onTabChange, user }) {
  const setTab = onTabChange || (() => {});
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [answers, setAnswers] = useState({});     // { key: chosen option }
  const [checked, setChecked] = useState({});     // { key: true } — exercises that have been checked
  const [correct, setCorrect] = useState({});     // { key: true } — exercises answered correctly
  const [ruleAnswers, setRuleAnswers] = useState({}); // vowel_rule step 1: { key: "1-vowel"|"2-vowel"|"exception" }
  const [ruleChecked, setRuleChecked] = useState({}); // vowel_rule step 1 checked
  const [ruleCorrect, setRuleCorrect] = useState({}); // vowel_rule step 1 correct
  const [exItems, setEx]      = useState([]);
  const [fromCache, setFromCache] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [micDeviceId, setMicDeviceId] = useState("");
  const micStreamRef = useRef(null);
  const recordingsRef = useRef(new Set());

  // Clean up mic stream on unmount
  useEffect(() => {
    return () => {
      micStreamRef.current?.getTracks().forEach(t => t.stop());
      micStreamRef.current = null;
    };
  }, []);

  const hasRecordings = useCallback(() => recordingsRef.current.size > 0, []);

  const handleRecordingChange = useCallback((phraseIndex, has) => {
    if (has) {
      recordingsRef.current.add(phraseIndex);
      // Save partial progress
      if (content?.shadowing) {
        onShadowingPhrase?.(phraseIndex, content.shadowing.length);
      }
    } else {
      recordingsRef.current.delete(phraseIndex);
    }
  }, [content, onShadowingPhrase]);

  // Warn on browser reload/close — recording blobs live in memory and will be lost.
  // The dialog text is controlled by the browser (not customizable in modern Safari/Chrome).
  useEffect(() => {
    const handler = e => {
      if (recordingsRef.current.size > 0) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  // Guard navigation: wraps an action with confirmation if recordings exist
  function guardNav(action) {
    if (hasRecordings()) setConfirmAction(() => action);
    else action();
  }

  async function load(force = false) {
    setLoading(true); setError(null); setElapsed(0);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
    try {
      const data = await getContent(def, { user, force });
      setContent(data);
      const shuffled = [...data.exercises].sort(() => Math.random() - 0.5);
      setEx(shuffled);
      // Restore previously correct answers from saved progress
      const savedPractice = lessonProgress?.practice_done || [];
      const restoredAnswers = {};
      const restoredCorrect = {};
      const restoredChecked = {};
      shuffled.forEach((item) => {
        const key = item.words ? item.words.map(w => w.word).join("|") : item.sentence || item.word || item.phrase;
        if (savedPractice.includes(key)) {
          restoredAnswers[key] = item.answer;
          restoredCorrect[key] = true;
          restoredChecked[key] = true;
        }
      });
      setAnswers(restoredAnswers);
      setCorrect(restoredCorrect);
      setChecked(restoredChecked);
      setRuleAnswers({});
      setRuleChecked({});
      setRuleCorrect({});
      setFromCache(!force);
    } catch (e) { setError(e.message); }
    finally { clearInterval(timerRef.current); setLoading(false); }
  }

  useEffect(() => {
    load(false);
    return () => clearInterval(timerRef.current);
  }, [def.id]);

  function itemKey(item) {
    if (item.words) return item.words.map(w => w.word).join("|"); // odd_one_out
    if (item.sentence) return item.sentence; // minimal_pair
    return item.word || item.phrase;
  }

  function selectAnswer(item, opt) {
    const key = itemKey(item);
    if (correct[key] || checked[key]) return; // already locked
    setAnswers(p => ({ ...p, [key]: opt }));
    setChecked(p => ({ ...p, [key]: true }));
    const isCorrect = def.exerciseType === "odd_one_out"
      ? opt === item.oddIndex
      : opt === item.answer;
    if (isCorrect) {
      setCorrect(p => ({ ...p, [key]: true }));
      const totalDone = Object.keys(correct).length + 1;
      onPracticeAnswer?.(key, exItems.length);
      if (totalDone === exItems.length) onComplete?.();
    }
  }

  function selectRule(item, rule) {
    const key = itemKey(item);
    if (ruleCorrect[key] || ruleChecked[key]) return;
    setRuleAnswers(p => ({ ...p, [key]: rule }));
    setRuleChecked(p => ({ ...p, [key]: true }));
    if (rule === item.rule) {
      setRuleCorrect(p => ({ ...p, [key]: true }));
    }
  }

  function retryRule(item) {
    const key = itemKey(item);
    setRuleAnswers(p => { const n = { ...p }; delete n[key]; return n; });
    setRuleChecked(p => { const n = { ...p }; delete n[key]; return n; });
  }

  function retryWrong(item) {
    const key = itemKey(item);
    setAnswers(p => { const n = { ...p }; delete n[key]; return n; });
    setChecked(p => { const n = { ...p }; delete n[key]; return n; });
  }

  const correctCount = Object.keys(correct).length;
  const allCorrect = exItems.length > 0 && correctCount === exItems.length;
  const TABS = ["theory", "practice", "shadowing"];
  const TAB_LABELS = { theory: "Theory", practice: "Practice", shadowing: "Shadowing" };

  return (
    <div className="page">
      {/* sticky header + tabs */}
      <div className="sticky top-0 z-50 bg-gray-50 dark:bg-gray-950">
        <div className="border-b border-gray-100 dark:border-gray-800 px-3 sm:px-4 py-2.5 sm:py-3">
          <div className="flex items-center gap-2">
            <button className="p-2 rounded cursor-pointer text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 active:opacity-50 transition-colors" onClick={() => guardNav(onBack)}><IconBack size="md" /></button>
            <div className="flex-1 min-w-0">
              <p className="mono-label hidden sm:block">{def.session}</p>
              <p className="text-sm sm:text-base mt-0.5 truncate">{def.title}</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {user && (
                <button className="p-2 rounded cursor-pointer text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 active:opacity-50 transition-colors disabled:opacity-30" onClick={() => load(true)} disabled={loading}>
                  {loading ? "…" : <IconRefresh size="md" />}
                </button>
              )}
              {completed && <span className="mono-dim"><IconCheck size="sm" /></span>}
              {darkToggle}
            </div>
          </div>
        </div>
        <div className="flex border-b border-gray-100 dark:border-gray-800 pl-1">
          {TABS.map(t => (
            <button key={t}
              className={`tab-btn flex-1 sm:flex-none ${tab === t ? "tab-btn-active" : ""}`}
              onClick={() => tab === "shadowing" && t !== "shadowing" ? guardNav(() => setTab(t)) : setTab(t)}>{TAB_LABELS[t]}</button>
          ))}
        </div>
      </div>

      {/* content */}
      <div className="page-content">
        {error && (
          <div className="text-amber-600 dark:text-amber-500 text-sm p-3.5 border border-amber-600/20 rounded mb-5 leading-relaxed">
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
            <p className="text-sm text-gray-400 dark:text-gray-500 tracking-wide">
              {elapsed < 5 ? "Loading…" : elapsed < 15 ? "Generating content…" : "Still working, retrying if needed…"}
            </p>
            {elapsed >= 5 && <p className="text-xs text-gray-300 dark:text-gray-600 tabular-nums">{elapsed}s</p>}
          </div>
        )}

        {!loading && content && (
          <div className="flex-1">
            {tab === "theory" && (
              <div>
                <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                  {def.subtitle}<span className="hidden sm:inline"> · tap a card to expand · tap any word to hear it</span>
                </p>
                {content.theory.map((item, i) => <TheoryCard key={i} item={item} />)}
                <button className="btn btn-primary btn-full mt-4 gap-1" onClick={() => setTab("practice")}>
                  Start practice <IconArrow size="sm" />
                </button>
              </div>
            )}

            {tab === "practice" && (
              <div>
                <p className="text-sm text-gray-500 mb-2">{def.exerciseQuestion} · tap a word to hear it</p>
                <p className="font-mono text-xs text-gray-400 dark:text-gray-500 mb-4">{correctCount}/{exItems.length} correct</p>

                {allCorrect && (
                  <div className="card p-4 mb-5 text-center">
                    <div className="text-3xl mb-1">{correctCount}/{exItems.length}</div>
                    <p className="text-sm text-gray-500">perfect.</p>
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  {exItems.map((item, idx) => {
                    const type = def.exerciseType;
                    const key    = itemKey(item);
                    const chosen = answers[key];
                    const isChecked = checked[key];
                    const ok     = correct[key];
                    const bad    = isChecked && !ok;

                    if (type === "odd_one_out") {
                      return (
                        <div key={idx} className={`card p-3 transition-colors ${ok ? "opacity-60" : ""} ${bad ? "!border-amber-600/30" : ""}`}>
                          <div className="flex justify-between items-start mb-2.5">
                            <p className="text-xs text-gray-400 dark:text-gray-500">Which one sounds different?</p>
                            {isChecked && (
                              <span className={`font-mono text-sm shrink-0 flex items-center gap-0.5 ${ok ? "text-gray-500" : "text-amber-600"}`}>
                                {ok ? <IconCheck size="sm" /> : <><IconClose size="sm" /> {item.words[item.oddIndex].word}</>}
                              </span>
                            )}
                          </div>
                          <div className="flex gap-2">
                            {item.words.map((w, wi) => {
                              const sel = chosen === wi;
                              const isOdd = wi === item.oddIndex;
                              const right = ok && isOdd;
                              return (
                                <button key={wi}
                                  onClick={() => selectAnswer(item, wi)}
                                  className={`option-btn flex-1 text-center ${isChecked ? "!cursor-default" : ""}
                                    ${right ? "option-correct" : sel && bad ? "option-selected" : "option-default"}`}>
                                  <SpeakWord word={w.word} ipa={isChecked ? w.ipa : undefined} className="text-base">
                                    {w.word}
                                  </SpeakWord>
                                  {isChecked && <p className="mono-muted text-[0.65rem] mt-1">{w.ipa}</p>}
                                </button>
                              );
                            })}
                          </div>
                          {isChecked && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                              {item.words.filter((_, i) => i !== item.oddIndex).map(w => w.word).join(" & ")}: {item.sound} · {item.words[item.oddIndex].word}: {item.oddSound}
                            </p>
                          )}
                          {bad && (
                            <button className="btn btn-ghost btn-sm mt-2 gap-1" onClick={() => retryWrong(item)}>
                              <IconRefresh size="sm" /> Try again
                            </button>
                          )}
                        </div>
                      );
                    }

                    if (type === "vowel_rule") {
                      const rKey = key;
                      const rChosen = ruleAnswers[rKey];
                      const rChecked = ruleChecked[rKey];
                      const rOk = ruleCorrect[rKey];
                      const rBad = rChecked && !rOk;
                      const step2Ready = rOk; // only show IPA step after rule is correct
                      return (
                        <div key={idx} className={`card p-3 transition-colors ${ok ? "opacity-60" : ""} ${(bad || rBad) ? "!border-amber-600/30" : ""}`}>
                          <div className="flex justify-between mb-2.5 items-start gap-2">
                            <div>
                              <SpeakWord word={item.word} ipa={(isChecked || rChecked) ? item.ipa : undefined} className="text-[1.1rem] inline-block mb-0.5">
                                {item.highlight ? highlightWord(item.word, item.highlight) : item.word}
                              </SpeakWord>
                              {(isChecked || rChecked) && <p className="mono-muted mt-1">{item.ipa} · {item.syllables}</p>}
                            </div>
                            {ok && <span className="font-mono text-sm shrink-0 text-gray-500 flex items-center gap-0.5"><IconCheck size="sm" /></span>}
                          </div>

                          {/* Step 1: rule classification */}
                          <p className="text-xs text-gray-400 dark:text-gray-500 mb-1.5">Step 1: Which rule?</p>
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {["1-vowel", "2-vowel", "exception"].map(r => {
                              const sel = rChosen === r;
                              return (
                                <button key={r}
                                  onClick={() => selectRule(item, r)}
                                  className={`option-btn-sm ${rChecked ? "!cursor-default" : ""}
                                    ${sel && rOk ? "option-correct" : sel && rBad ? "option-selected" : "option-default"}`}>
                                  {r === "1-vowel" ? "1-vowel (short)" : r === "2-vowel" ? "2-vowel (long)" : "Exception"}
                                </button>
                              );
                            })}
                          </div>
                          {rBad && (
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-mono text-sm text-amber-600 flex items-center gap-0.5"><IconClose size="sm" /> {item.rule === "1-vowel" ? "1-vowel (short)" : item.rule === "2-vowel" ? "2-vowel (long)" : "Exception"}</span>
                              <button className="btn btn-ghost btn-sm gap-1" onClick={() => retryRule(item)}>
                                <IconRefresh size="sm" /> Retry
                              </button>
                            </div>
                          )}

                          {/* Step 2: IPA sound (only after rule is correct) */}
                          {step2Ready && (
                            <>
                              <p className="text-xs text-gray-400 dark:text-gray-500 mb-1.5 mt-1">Step 2: What vowel sound?</p>
                              <div className="flex flex-wrap gap-1.5">
                                {def.exerciseOptions.map(opt => {
                                  const sel = chosen === opt;
                                  return (
                                    <button key={opt}
                                      onClick={() => selectAnswer(item, opt)}
                                      className={`option-btn-sm ${isChecked ? "!cursor-default" : ""}
                                        ${sel && ok ? "option-correct" : sel && bad ? "option-selected" : "option-default"}`}>
                                      {opt}
                                    </button>
                                  );
                                })}
                              </div>
                              {bad && (
                                <div className="flex items-center gap-2 mt-2">
                                  <span className="font-mono text-sm text-amber-600 flex items-center gap-0.5"><IconClose size="sm" /> {item.answer}</span>
                                  <button className="btn btn-ghost btn-sm gap-1" onClick={() => retryWrong(item)}>
                                    <IconRefresh size="sm" /> Retry
                                  </button>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      );
                    }

                    if (type === "minimal_pair") {
                      return (
                        <div key={idx} className={`card p-3 transition-colors ${ok ? "opacity-60" : ""} ${bad ? "!border-amber-600/30" : ""}`}>
                          <div className="flex justify-between items-start mb-2.5">
                            <div>
                              <SpeakWord word={item.sentence} className="text-base inline-block mb-0.5">
                                <span className="flex items-center gap-1.5">
                                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.08"/></svg>
                                  Listen & choose
                                </span>
                              </SpeakWord>
                              {isChecked && <p className="mono-muted mt-1">{item.sentence}</p>}
                            </div>
                            {isChecked && (
                              <span className={`font-mono text-sm shrink-0 flex items-center gap-0.5 ${ok ? "text-gray-500" : "text-amber-600"}`}>
                                {ok ? <IconCheck size="sm" /> : <><IconClose size="sm" /> {item.answer}</>}
                              </span>
                            )}
                          </div>
                          <div className="flex gap-2">
                            {item.pair.map((word, wi) => {
                              const sel = chosen === word;
                              const right = ok && word === item.answer;
                              return (
                                <button key={wi}
                                  onClick={() => selectAnswer(item, word)}
                                  className={`option-btn flex-1 text-center py-3 ${isChecked ? "!cursor-default" : ""}
                                    ${right ? "option-correct" : sel && bad ? "option-selected" : "option-default"}`}>
                                  <span className="text-base">{word}</span>
                                  {isChecked && <p className="mono-muted text-[0.65rem] mt-1">{item.pairIpa[wi]}</p>}
                                </button>
                              );
                            })}
                          </div>
                          {bad && (
                            <button className="btn btn-ghost btn-sm mt-2 gap-1" onClick={() => retryWrong(item)}>
                              <IconRefresh size="sm" /> Try again
                            </button>
                          )}
                        </div>
                      );
                    }

                    // Default: classify / rewrite
                    const isRewrite = type === "rewrite";
                    const opts = isRewrite ? item.options : def.exerciseOptions;

                    return (
                      <div key={idx} className={`card p-3 transition-colors ${ok ? "opacity-60" : ""} ${bad ? "!border-amber-600/30" : ""}`}>
                        {isRewrite ? (
                          <>
                            <SpeakWord word={item.phrase} ipa={item.ipa} className="text-base inline-block mb-1">{item.phrase}</SpeakWord>
                            <p className="mono-muted mb-3">{item.ipa} · {item.syllables}</p>
                            {bad && <p className="text-sm text-gray-500 mb-2 flex items-center gap-1"><IconArrow size="sm" /> {item.answer}</p>}
                            <div className="flex flex-col gap-1.5">
                              {opts.map(opt => {
                                const sel   = chosen === opt;
                                const right = ok && opt === item.answer;
                                return (
                                  <button key={opt}
                                    onClick={() => selectAnswer(item, opt)}
                                    className={`option-btn text-left ${isChecked ? "!cursor-default" : ""}
                                      ${right ? "option-correct" : sel ? "option-selected" : "option-default"}`}>
                                    {opt}
                                  </button>
                                );
                              })}
                            </div>
                            {bad && (
                              <button className="btn btn-ghost btn-sm mt-2 gap-1" onClick={() => retryWrong(item)}>
                                <IconRefresh size="sm" /> Try again
                              </button>
                            )}
                          </>
                        ) : (
                          <>
                            <div className="flex justify-between mb-2.5 items-start gap-2">
                              <div>
                                <SpeakWord word={item.word} ipa={isChecked ? item.ipa : undefined} className="text-[1.1rem] inline-block mb-0.5">
                                  {item.highlight
                                    ? highlightWord(item.word, item.highlight)
                                    : item.answer ? highlightBySound(item.word, item.answer) : item.word}
                                </SpeakWord>
                                {isChecked && <p className="mono-muted mt-1">{item.ipa} · {item.syllables}</p>}
                              </div>
                              {isChecked && (
                                <span className={`font-mono text-sm shrink-0 flex items-center gap-0.5 ${ok ? "text-gray-500" : "text-amber-600"}`}>
                                  {ok ? <IconCheck size="sm" /> : <><IconClose size="sm" /> {item.answer}</>}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {opts.map(opt => {
                                const sel = chosen === opt;
                                return (
                                  <button key={opt}
                                    onClick={() => selectAnswer(item, opt)}
                                    className={`option-btn-sm ${isChecked ? "!cursor-default" : ""}
                                      ${sel && ok ? "option-correct" : sel ? "option-selected" : "option-default"}`}>
                                    {opt}
                                  </button>
                                );
                              })}
                            </div>
                            {bad && (
                              <button className="btn btn-ghost btn-sm mt-2 gap-1" onClick={() => retryWrong(item)}>
                                <IconRefresh size="sm" /> Try again
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex gap-2 mt-4 flex-wrap">
                  <button className="btn btn-ghost gap-1" onClick={load}><IconRefresh size="sm" /> New words</button>
                </div>
              </div>
            )}

            {tab === "shadowing" && (
              <div className="pb-14">
                <StressLegend />
                {content.shadowing.map((p, i) => {
                  const savedDone = lessonProgress?.shadowing_done || [];
                  return (
                    <ShadowCard key={`${def.id}-${i}-${p.phrase}`}
                      phrase={p.phrase} ipa={p.ipa} syllables={p.syllables} note={p.note} tokens={p.tokens}
                      micStreamRef={micStreamRef}
                      savedDone={savedDone.includes(i)}
                      onRecordingChange={has => handleRecordingChange(i, has)} />
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="max-w-[40rem] mx-auto px-4 w-full">
        <Footer />
      </div>

      <MicBar
        visible={tab === "shadowing" && !loading && !!content}
        deviceId={micDeviceId}
        onChange={setMicDeviceId}
        onStreamReady={(stream) => {
          micStreamRef.current = stream;
        }}
      />

      {confirmAction && (
        <ConfirmDialog
          onCancel={() => setConfirmAction(null)}
          onConfirm={() => { setConfirmAction(null); confirmAction(); }}
        />
      )}
    </div>
  );
}
