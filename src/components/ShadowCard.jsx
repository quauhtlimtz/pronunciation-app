import { useState, useRef } from "react";
import { speak, stopSpeak, getTtsMode, getVoiceName } from "../services/tts";
import { PhraseAnnotation } from "./PhraseAnnotation";
import { IconPlay, IconPause, IconStop, IconRecord, IconMic, IconCheck, IconArrow, IconRefresh, IconWarn } from "./Icons";

const STEPS = ["listen", "shadow", "compare"];

export function ShadowCard({ phrase, ipa, syllables, note, tokens }) {
  const [step, setStep]         = useState("listen");
  const [natPlay, setNatPlay]   = useState(false);
  const [rec, setRec]           = useState(false);
  const [recUrl, setRecUrl]     = useState(null);
  const [myPlay, setMyPlay]     = useState(false);
  const [denied, setDenied]     = useState(false);
  const [fallback, setFallback] = useState(getTtsMode() === "browser");
  const mrRef    = useRef(null);
  const chunks   = useRef([]);
  const audioRef = useRef(null);

  const playNat  = () => { setNatPlay(true);  speak(phrase, () => setNatPlay(false), () => setFallback(true)); };
  const stopNat  = () => { stopSpeak(); setNatPlay(false); };
  const stopMine = () => { audioRef.current?.pause(); setMyPlay(false); };

  async function startRec() {
    chunks.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = e => { if (e.data.size > 0) chunks.current.push(e.data); };
      mr.onstop = () => {
        setRecUrl(URL.createObjectURL(new Blob(chunks.current, { type: "audio/webm" })));
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start(); mrRef.current = mr; setRec(true);
    } catch { setDenied(true); }
  }

  function stopRec() { if (mrRef.current?.state !== "inactive") mrRef.current.stop(); setRec(false); }

  function playMine() {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    audioRef.current.play();
    setMyPlay(true);
    audioRef.current.onended = () => setMyPlay(false);
  }

  function reset() { setStep("listen"); setRecUrl(null); setRec(false); setNatPlay(false); setMyPlay(false); stopSpeak(); }

  const si = STEPS.indexOf(step);
  const canNav = i => i <= si || (i === 2 && recUrl);

  return (
    <div className="card mb-2.5">
      <div className="px-4 pt-3.5 pb-2.5 border-b border-gray-100 dark:border-gray-800">
        {tokens && tokens.length > 0
          ? <PhraseAnnotation tokens={tokens} />
          : <div className="text-base mb-1">{phrase}</div>
        }
        <div className="mono-muted mt-2">{ipa}</div>
        {note && <div className="mono-dim mt-1 leading-relaxed">{note}</div>}
        {fallback && (
          <div className="font-mono text-sm text-gray-500 mt-2 tracking-wide flex items-center gap-1">
            <IconWarn size="sm" /> browser TTS{(() => { const v = getVoiceName(); return v ? ` · ${v}` : ""; })()}
          </div>
        )}
      </div>

      {/* step tabs */}
      <div className="flex border-b border-gray-100 dark:border-gray-800">
        {STEPS.map((s, i) => (
          <button key={s} onClick={() => canNav(i) && setStep(s)}
            className={`flex-1 bg-transparent border-none border-b-2 py-2.5 px-1 font-mono text-sm min-h-10 flex items-center justify-center gap-1
              ${step === s ? "border-gray-900 dark:border-gray-100 text-gray-900 dark:text-gray-100" :
                "border-transparent text-gray-400 dark:text-gray-500"}
              ${canNav(i) ? "cursor-pointer" : "cursor-default"}`}>
            {i < si && <IconCheck size="sm" />}{s[0].toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      <div className="p-6">
        {step === "listen" && (
          <div className="flex flex-col items-center gap-4">
            <button className={`circ ${natPlay ? "circ-on" : ""}`} onClick={natPlay ? stopNat : playNat}>
              {natPlay ? <IconPause size="lg" /> : <IconPlay size="lg" />}
            </button>
            <p className="text-sm text-gray-500">{natPlay ? "playing…" : "tap to hear native speaker"}</p>
            <button className="btn btn-primary mt-1 min-w-[12.5rem] gap-1" onClick={() => setStep("shadow")}>
              ready to shadow <IconArrow size="sm" />
            </button>
          </div>
        )}

        {step === "shadow" && (
          <div className="flex flex-col items-center gap-4">
            <button className="btn btn-default btn-sm gap-1" onClick={natPlay ? stopNat : playNat}>
              {natPlay ? <><IconPause size="sm" /> stop</> : <><IconPlay size="sm" /> replay native</>}
            </button>
            {denied
              ? <p className="text-sm text-red-500 text-center">Microphone access denied — enable it in browser settings.</p>
              : <>
                  <button className={`circ ${rec ? "circ-rec" : ""}`} onClick={rec ? stopRec : startRec}>
                    {rec ? <IconStop size="lg" /> : <IconMic size="lg" />}
                  </button>
                  <p className={`text-sm ${rec ? "text-red-500" : "text-gray-500"}`}>
                    {rec ? "recording… tap to stop" : "tap to record yourself"}
                  </p>
                  {recUrl && !rec && (
                    <button className="btn btn-primary min-w-[12.5rem] gap-1" onClick={() => setStep("compare")}>
                      compare <IconArrow size="sm" />
                    </button>
                  )}
                </>
            }
          </div>
        )}

        {step === "compare" && (
          <div className="flex flex-col gap-3.5">
            {recUrl && <audio ref={audioRef} src={recUrl} className="hidden" />}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="card p-4 text-center">
                <p className="mono-label mb-3">native</p>
                <button className={`circ mx-auto ${natPlay ? "circ-on" : ""}`} onClick={natPlay ? stopNat : playNat}>
                  {natPlay ? <IconPause size="lg" /> : <IconPlay size="lg" />}
                </button>
              </div>
              <div className="card p-4 text-center">
                <p className="mono-label mb-3">you</p>
                <button className={`circ mx-auto ${myPlay ? "circ-on" : ""}`} onClick={myPlay ? stopMine : playMine}>
                  {myPlay ? <IconPause size="lg" /> : <IconPlay size="lg" />}
                </button>
              </div>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed">
              stress: {syllables}{note ? ` · ${note}` : ""}
            </p>
            <div className="flex gap-2 flex-wrap">
              <button className="btn btn-default gap-1" onClick={() => { setRecUrl(null); setStep("shadow"); }}><IconRefresh size="sm" /> Re-record</button>
              <button className="btn btn-ghost" onClick={reset}>Start over</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
