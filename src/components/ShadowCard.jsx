import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { speak, stopSpeak, getTtsUrl } from "../services/tts";
import { useWavesurfer } from "@wavesurfer/react";
import WaveSurfer from "wavesurfer.js";
import RecordPlugin from "wavesurfer.js/dist/plugins/record.esm.js";
import SpectrogramPlugin from "wavesurfer.js/dist/plugins/spectrogram.esm.js";
import { PhraseAnnotation } from "./PhraseAnnotation";
import { PitchOverlay } from "./PitchOverlay";
import { IconPlay, IconPause, IconStop, IconMic, IconCheck, IconArrow, IconRefresh } from "./Icons";
import { motion } from "motion/react";

const SPEC_OPTIONS = {
  labels: false,
  height: 140,
  fftSamples: 512,
  scale: "mel",
  windowFunc: "hann",
  colorMap: "roseus",
  frequencyMin: 0,
  frequencyMax: 8000,
};

// ─── Spectrogram comparison ────────────────────────────────────────────────

function MiniSpectrogram({ audioUrl }) {
  const waveRef = useRef(null);
  const plugins = useMemo(() => [
    SpectrogramPlugin.create(SPEC_OPTIONS),
  ], []);

  useWavesurfer({
    container: waveRef,
    url: audioUrl || "",
    waveColor: "rgba(156,163,175,0.5)",
    progressColor: "rgba(107,114,128,0.8)",
    height: 80,
    barWidth: 2,
    barGap: 1,
    barRadius: 2,
    cursorWidth: 1,
    cursorColor: "rgba(255,255,255,0.5)",
    normalize: true,
    plugins,
  });

  if (!audioUrl) return null;

  return (
    <div>
      <div ref={waveRef} className="rounded-md overflow-hidden" />
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

// Detect leading silence offset (in seconds) without re-encoding
async function detectSilenceOffset(blob) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const buf = await ctx.decodeAudioData(await blob.arrayBuffer());
    const samples = buf.getChannelData(0);
    const sr = buf.sampleRate;
    const windowSize = Math.round(sr * 0.01); // 10ms
    const threshold = Math.pow(10, -30 / 20); // -30dB

    for (let i = 0; i < samples.length - windowSize; i += windowSize) {
      let sum = 0;
      for (let j = i; j < i + windowSize; j++) sum += samples[j] * samples[j];
      if (Math.sqrt(sum / windowSize) > threshold) {
        ctx.close();
        return Math.max(0, i / sr - 0.05); // 50ms before speech onset
      }
    }
    ctx.close();
    return 0;
  } catch {
    return 0;
  }
}

// ─── Main component ────────────────────────────────────────────────────────

const STEPS = ["listen", "shadow", "compare"];

export function ShadowCard({ phrase, ipa, syllables, note, tokens, micDeviceId, onMicDetected, onRecordingChange }) {
  const [step, setStep]         = useState("listen");
  const [natPlay, setNatPlay]   = useState(false);
  const [rec, setRec]           = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [recUrl, setRecUrl]     = useState(null);
  const [recDuration, setRecDuration] = useState(0);
  const [myPlay, setMyPlay]     = useState(false);
  const [denied, setDenied]     = useState(false);
  const [recError, setRecError] = useState(null);
  const [natUrl, setNatUrl]     = useState(null);
  const silenceOffsetRef = useRef(0);
  const audioRef   = useRef(null);

  // Wavesurfer Record plugin for live waveform (mic visualization only)
  // We manage MediaRecorder ourselves for instant start
  const recWaveRef = useRef(null);
  const recorderRef = useRef(null);
  const wsRef = useRef(null);
  const mediaRecRef = useRef(null);
  const recTimerRef = useRef(null);

  // Initialize wavesurfer with Record plugin when shadow step is active
  useEffect(() => {
    if (step !== "shadow" || !recWaveRef.current) return;

    const ws = WaveSurfer.create({
      container: recWaveRef.current,
      waveColor: "#d97706",
      progressColor: "#d97706",
      height: 64,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      cursorWidth: 0,
      normalize: true,
    });

    const recorder = ws.registerPlugin(RecordPlugin.create({
      scrollingWaveform: true,
      scrollingWaveformWindow: 6,
      renderRecordedAudio: false,
    }));

    wsRef.current = ws;
    recorderRef.current = recorder;

    return () => {
      // Clean up our own MediaRecorder if active
      if (mediaRecRef.current?.state === "recording") mediaRecRef.current.stop();
      mediaRecRef.current = null;
      clearInterval(recTimerRef.current);
      recorder.stopMic();
      ws.destroy();
      wsRef.current = null;
      recorderRef.current = null;
    };
  }, [step]);

  useEffect(() => {
    if (step === "compare") {
      getTtsUrl(phrase).then(url => url && setNatUrl(url));
    }
  }, [step, phrase]);

  useEffect(() => {
    onRecordingChange?.(!!recUrl);
  }, [recUrl]);

  const playNat  = () => { setNatPlay(true);  speak(phrase, () => setNatPlay(false)); };
  const stopNat  = () => { stopSpeak(); setNatPlay(false); };
  const stopMine = () => { audioRef.current?.pause(); setMyPlay(false); };

  const startRec = useCallback(async () => {
    if (!recorderRef.current) return;
    setRecError(null);
    setRecDuration(0);

    try {
      // Step 1: Open mic — this does getUserMedia + starts live waveform
      const constraints = micDeviceId ? { deviceId: micDeviceId } : undefined;
      const stream = await recorderRef.current.startMic(constraints);

      // Detect actual device
      try {
        const track = stream.getAudioTracks()[0];
        const actualId = track?.getSettings?.()?.deviceId;
        if (actualId && onMicDetected) onMicDetected(actualId);
      } catch {}

      // Step 2: Create MediaRecorder
      const mimeType = ["audio/webm", "audio/mp4", "audio/wav"]
        .find(t => MediaRecorder.isTypeSupported(t));
      const mr = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000,
      });
      const chunks = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      mr.onstop = () => {
        clearInterval(recTimerRef.current);
        const blob = new Blob(chunks, { type: mr.mimeType });
        if (chunks.length === 0 || blob.size < 100) {
          setRecError("No audio captured — check your microphone and try again.");
        } else {
          const url = URL.createObjectURL(blob);
          // Safari: detect silence offset from countdown warm-up (skip on playback)
          if (isSafari) {
            detectSilenceOffset(blob).then(offset => {
              silenceOffsetRef.current = offset;
            });
          }
          setRecUrl(url);
          setRecError(null);
        }
        setRec(false);
        recorderRef.current?.stopMic();
        mediaRecRef.current = null;
      };
      mediaRecRef.current = mr;

      // Safari: start recording BEFORE countdown to absorb MediaRecorder startup delay
      // Other browsers: start after countdown (no delay issue)
      if (isSafari) mr.start(250);

      // Step 3: Countdown
      for (let i = 3; i >= 1; i--) {
        setCountdown(i);
        await new Promise(r => setTimeout(r, 600));
      }
      setCountdown(0);

      // Non-Safari: start recording after countdown
      if (!isSafari) mr.start(250);
      setRec(true);

      // Duration timer starts AFTER countdown (user-visible duration)
      const t0 = Date.now();
      recTimerRef.current = setInterval(() => {
        setRecDuration(Math.round((Date.now() - t0) / 1000));
      }, 500);
    } catch (e) {
      setCountdown(0);
      setRec(false);
      mediaRecRef.current = null;
      if (e?.name === "NotAllowedError" || e?.name === "PermissionDeniedError") {
        setDenied(true);
      } else {
        setRecError(`Mic error: ${e?.message || "could not access microphone"}. Try again.`);
      }
    }
  }, [micDeviceId, onMicDetected]);

  const stopRec = useCallback(() => {
    if (mediaRecRef.current?.state === "recording") {
      // Force final data flush before stopping
      try { mediaRecRef.current.requestData(); } catch {}
      mediaRecRef.current.stop();
    }
  }, []);

  function playMine() {
    if (!audioRef.current) return;
    const a = audioRef.current;
    a.currentTime = silenceOffsetRef.current;
    setMyPlay(true);
    a.onended = () => setMyPlay(false);
    a.oncanplaythrough = () => { a.oncanplaythrough = null; a.currentTime = silenceOffsetRef.current; a.play(); };
    if (a.readyState >= 3) a.play();
    else a.load();
  }

  function reset() { setStep("listen"); setRecUrl(null); setNatUrl(null); setRec(false); setNatPlay(false); setMyPlay(false); setRecDuration(0); setRecError(null); silenceOffsetRef.current = 0; stopSpeak(); }

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

      <div className="p-4">
        {step === "listen" && (
          <div className="flex flex-col items-center gap-3">
            <button className={`circ ${natPlay ? "circ-on" : ""}`} onClick={natPlay ? stopNat : playNat}>
              {natPlay ? <IconPause size="lg" /> : <IconPlay size="lg" />}
            </button>
            <p className="text-sm text-gray-500">{natPlay ? "playing…" : "tap to hear native speaker"}</p>
            <button
              className="btn btn-primary min-w-[12.5rem] gap-1"
              disabled={!micDeviceId}
              onClick={() => setStep("shadow")}
            >
              ready to shadow <IconArrow size="sm" />
            </button>
            {!micDeviceId && <p className="text-xs text-gray-400">select a microphone first</p>}
          </div>
        )}

        {step === "shadow" && (
          <div className="flex flex-col items-center justify-center gap-2.5" style={{ minHeight: 140 }}>
            <div className="flex items-center gap-2">
              <button className={`circ circ-sm ${rec ? "circ-rec" : ""} ${countdown ? "opacity-50 pointer-events-none" : ""}`} onClick={rec ? stopRec : startRec} disabled={!!countdown}>
                {countdown ? <span className="text-lg font-mono font-bold">{countdown}</span> : rec ? <IconStop size="md" /> : <IconMic size="md" />}
              </button>
              <div className="text-left">
                <p className={`text-sm ${rec ? "text-amber-700 dark:text-amber-500" : countdown ? "text-gray-400" : "text-gray-500"}`}>
                  {countdown ? "get ready…" : rec
                    ? <><span className="font-mono tabular-nums">{recDuration}s</span> · recording…</>
                    : "tap to record"}
                </p>
                {!rec && !countdown && !recUrl && (
                  <button className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer bg-transparent border-none p-0" onClick={natPlay ? stopNat : playNat}>
                    {natPlay ? "stop native" : "replay native"}
                  </button>
                )}
              </div>
            </div>
            {denied && <p className="text-sm text-amber-700 dark:text-amber-500 text-center">Microphone access denied — enable it in browser settings.</p>}
            <div ref={recWaveRef} className="w-full rounded-md overflow-hidden" style={{ minHeight: 48 }} />
            {recError && <p className="text-sm text-amber-700 dark:text-amber-500 text-center">{recError}</p>}
            {recUrl && !rec && (
              <div className="flex items-center gap-2 w-full">
                <button className="btn btn-primary flex-1 gap-1" onClick={() => setStep("compare")}>
                  compare <IconArrow size="sm" />
                </button>
                <button className="btn btn-default btn-sm gap-1" onClick={playMine}>
                  <IconPlay size="sm" /> {myPlay ? "playing…" : "preview"}
                </button>
                <span className="text-xs text-gray-400 font-mono shrink-0">{recDuration}s</span>
              </div>
            )}
          </div>
        )}

        {recUrl && <audio ref={audioRef} src={recUrl} className="hidden" />}

        {step === "compare" && (
          <div className="flex flex-col gap-3.5">

            {/* Play buttons */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="grid grid-cols-2 gap-2.5"
            >
              <button className="btn btn-default gap-1 w-full" onClick={natPlay ? stopNat : playNat}>
                {natPlay ? <><IconPause size="sm" /> pause native</> : <><IconPlay size="sm" /> play native</>}
              </button>
              <button className="btn btn-default gap-1 w-full" onClick={myPlay ? stopMine : playMine}>
                {myPlay ? <><IconPause size="sm" /> pause yours</> : <><IconPlay size="sm" /> play yours</>}
              </button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15, ease: "easeOut" }}
            >
              <PitchOverlay nativeUrl={natUrl} userUrl={recUrl} />
            </motion.div>

            {/* Spectrograms side-by-side */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3, ease: "easeOut" }}
              className="grid grid-cols-2 gap-2.5"
            >
              <div className="card p-3">
                <p className="mono-label mb-2 text-center">native</p>
                <MiniSpectrogram audioUrl={natUrl} />
              </div>
              <div className="card p-3">
                <p className="mono-label mb-2 text-center">you</p>
                <MiniSpectrogram audioUrl={recUrl} />
              </div>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.45 }}
              className="text-sm text-gray-500 leading-relaxed"
            >
              stress: {syllables}{note ? ` · ${note}` : ""}
            </motion.p>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.55 }}
              className="flex gap-2 flex-wrap"
            >
              <button className="btn btn-default gap-1" onClick={() => { setRecUrl(null); setNatUrl(null); setRecDuration(0); setRecError(null); setMyPlay(false); silenceOffsetRef.current = 0; setStep("shadow"); }}><IconRefresh size="sm" /> Re-record</button>
              <button className="btn btn-ghost" onClick={reset}>Start over</button>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
