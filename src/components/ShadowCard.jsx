import { useState, useRef, useEffect, useMemo } from "react";
import { speak, stopSpeak, getTtsUrl } from "../services/tts";
import { useWavesurfer } from "@wavesurfer/react";
import SpectrogramPlugin from "wavesurfer.js/dist/plugins/spectrogram.esm.js";
import { PhraseAnnotation } from "./PhraseAnnotation";
import { PitchOverlay } from "./PitchOverlay";
import { IconPlay, IconPause, IconStop, IconMic, IconCheck, IconArrow, IconRefresh } from "./Icons";

const SPEC_OPTIONS = {
  labels: false,
  height: 80,
  fftSamples: 512,
  scale: "mel",
  windowFunc: "hann",
  colorMap: "roseus",
  frequencyMin: 0,
  frequencyMax: 8000,
};

function pickMimeType() {
  for (const t of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"]) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return "";
}

// ─── Live waveform during recording ────────────────────────────────────────

function LiveWaveform({ stream }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!stream) return;
    const ctx = new AudioContext();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    const data = new Uint8Array(analyser.frequencyBinCount);
    let raf;

    function draw() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }
      const gfx = canvas.getContext("2d");
      gfx.setTransform(dpr, 0, 0, dpr, 0, 0);

      analyser.getByteTimeDomainData(data);

      gfx.clearRect(0, 0, w, h);
      gfx.beginPath();
      gfx.strokeStyle = "#ef4444";
      gfx.lineWidth = 1.5;

      const step = w / data.length;
      for (let i = 0; i < data.length; i++) {
        const y = (data[i] / 255) * h;
        if (i === 0) gfx.moveTo(0, y);
        else gfx.lineTo(i * step, y);
      }
      gfx.stroke();
      raf = requestAnimationFrame(draw);
    }

    draw();
    return () => { cancelAnimationFrame(raf); source.disconnect(); ctx.close(); };
  }, [stream]);

  return <canvas ref={canvasRef} className="w-full rounded-md" style={{ height: 48 }} />;
}

// ─── Spectrogram comparison ────────────────────────────────────────────────

function MiniSpectrogram({ audioUrl, label }) {
  const waveRef = useRef(null);
  const plugins = useMemo(() => [
    SpectrogramPlugin.create(SPEC_OPTIONS),
  ], []);

  const { wavesurfer, isPlaying } = useWavesurfer({
    container: waveRef,
    url: audioUrl || "",
    waveColor: "rgba(156,163,175,0.5)",
    progressColor: "rgba(107,114,128,0.8)",
    height: 32,
    barWidth: 2,
    barGap: 1,
    barRadius: 2,
    cursorWidth: 1,
    cursorColor: "rgba(255,255,255,0.5)",
    plugins,
  });

  if (!audioUrl) return null;

  return (
    <div className="mt-3">
      <div ref={waveRef} className="rounded-md overflow-hidden" />
      <button
        className="btn btn-default btn-sm mt-2 w-full gap-1"
        onClick={() => wavesurfer?.playPause()}
      >
        {isPlaying ? <><IconPause size="sm" /> pause</> : <><IconPlay size="sm" /> play {label}</>}
      </button>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────

const STEPS = ["listen", "shadow", "compare"];

export function ShadowCard({ phrase, ipa, syllables, note, tokens }) {
  const [step, setStep]         = useState("listen");
  const [natPlay, setNatPlay]   = useState(false);
  const [rec, setRec]           = useState(false);
  const [recUrl, setRecUrl]     = useState(null);
  const [myPlay, setMyPlay]     = useState(false);
  const [denied, setDenied]     = useState(false);
  const [natUrl, setNatUrl]     = useState(null);
  const mrRef      = useRef(null);
  const chunks     = useRef([]);
  const audioRef   = useRef(null);
  const streamRef  = useRef(null);

  useEffect(() => {
    if (step === "compare") {
      getTtsUrl(phrase).then(url => url && setNatUrl(url));
    }
  }, [step, phrase]);

  const playNat  = () => { setNatPlay(true);  speak(phrase, () => setNatPlay(false)); };
  const stopNat  = () => { stopSpeak(); setNatPlay(false); };
  const stopMine = () => { audioRef.current?.pause(); setMyPlay(false); };

  async function startRec() {
    chunks.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickMimeType();
      const mr = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      mr.ondataavailable = e => { if (e.data.size > 0) chunks.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunks.current, mimeType ? { type: mimeType } : undefined);
        setRecUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      };
      mr.start();
      mrRef.current = mr;
      setRec(true);
    } catch { setDenied(true); }
  }

  function stopRec() {
    if (mrRef.current?.state !== "inactive") mrRef.current.stop();
    setRec(false);
  }

  function playMine() {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    audioRef.current.play();
    setMyPlay(true);
    audioRef.current.onended = () => setMyPlay(false);
  }

  function reset() { setStep("listen"); setRecUrl(null); setNatUrl(null); setRec(false); setNatPlay(false); setMyPlay(false); stopSpeak(); }

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
                  {rec && streamRef.current && <LiveWaveform stream={streamRef.current} />}
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
            <PitchOverlay nativeUrl={natUrl} userUrl={recUrl} />
            <div className="grid grid-cols-2 gap-2.5">
              <div className="card p-3">
                <p className="mono-label mb-1 text-center">native spectrogram</p>
                <MiniSpectrogram audioUrl={natUrl} label="native" />
              </div>
              <div className="card p-3">
                <p className="mono-label mb-1 text-center">your spectrogram</p>
                <MiniSpectrogram audioUrl={recUrl} label="yours" />
              </div>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed">
              stress: {syllables}{note ? ` · ${note}` : ""}
            </p>
            <div className="flex gap-2 flex-wrap">
              <button className="btn btn-default gap-1" onClick={() => { setRecUrl(null); setNatUrl(null); setStep("shadow"); }}><IconRefresh size="sm" /> Re-record</button>
              <button className="btn btn-ghost" onClick={reset}>Start over</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
