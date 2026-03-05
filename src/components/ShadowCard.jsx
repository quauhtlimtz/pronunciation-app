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

// Trim leading silence and re-encode as mono WAV
async function trimAndEncode(blob) {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const buf = await ctx.decodeAudioData(await blob.arrayBuffer());
  const raw = buf.getChannelData(0); // mono
  const sr = buf.sampleRate;
  const winSize = Math.round(sr * 0.01); // 10ms windows
  const thresh = Math.pow(10, -30 / 20);

  // Find speech onset
  let onset = 0;
  for (let i = 0; i < raw.length - winSize; i += winSize) {
    let sum = 0;
    for (let j = i; j < i + winSize; j++) sum += raw[j] * raw[j];
    if (Math.sqrt(sum / winSize) > thresh) {
      onset = Math.max(0, i - winSize * 3); // 30ms margin
      break;
    }
  }
  ctx.close();

  // Encode trimmed mono PCM → WAV
  const samples = raw.subarray(onset);
  const len = samples.length;
  const wavBuf = new ArrayBuffer(44 + len * 2);
  const v = new DataView(wavBuf);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, "RIFF"); v.setUint32(4, 36 + len * 2, true);
  w(8, "WAVE"); w(12, "fmt ");
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); // byte rate
  v.setUint16(32, 2, true); v.setUint16(34, 16, true); // 16-bit
  w(36, "data"); v.setUint32(40, len * 2, true);
  for (let i = 0; i < len; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    v.setInt16(44 + i * 2, s * (s < 0 ? 0x8000 : 0x7FFF), true);
  }
  return URL.createObjectURL(new Blob([wavBuf], { type: "audio/wav" }));
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
  const audioRef   = useRef(null);
  const natAudioRef = useRef(null);
  const [bothPlay, setBothPlay] = useState(false);
  const [natVol, setNatVol]     = useState(1);
  const [userVol, setUserVol]   = useState(1);

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

  // Play native via <audio> element (for compare step — respects volume slider)
  const playNatAudio = useCallback(() => {
    if (!natAudioRef.current || !natUrl) return;
    const a = natAudioRef.current;
    a.currentTime = 0;
    a.volume = natVol;
    setNatPlay(true);
    a.onended = () => setNatPlay(false);
    a.play();
  }, [natUrl, natVol]);
  const stopNatAudio = useCallback(() => {
    natAudioRef.current?.pause();
    setNatPlay(false);
  }, []);

  // Simultaneous playback
  const stopBoth = useCallback(() => {
    natAudioRef.current?.pause();
    audioRef.current?.pause();
    setBothPlay(false);
    setNatPlay(false);
    setMyPlay(false);
  }, []);

  const playBoth = useCallback(() => {
    if (!natAudioRef.current || !audioRef.current || !natUrl || !recUrl) return;
    const na = natAudioRef.current;
    const ua = audioRef.current;
    na.currentTime = 0;
    ua.currentTime = 0;
    na.volume = natVol;
    ua.volume = userVol;
    setBothPlay(true);
    setNatPlay(true);
    setMyPlay(true);

    let ended = 0;
    const onEnd = () => { ended++; if (ended >= 2) stopBoth(); };
    na.onended = onEnd;
    ua.onended = onEnd;

    na.play();
    ua.play();
  }, [natUrl, recUrl, natVol, userVol, stopBoth]);

  // Sync volume changes to audio elements
  useEffect(() => { if (natAudioRef.current) natAudioRef.current.volume = natVol; }, [natVol]);
  useEffect(() => { if (audioRef.current) audioRef.current.volume = userVol; }, [userVol]);

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
        } else if (isSafari) {
          // Safari: trim mic activation noise + countdown silence, re-encode as clean WAV
          trimAndEncode(blob).then(url => {
            setRecUrl(url);
            setRecError(null);
          }).catch(() => {
            setRecUrl(URL.createObjectURL(blob)); // fallback
            setRecError(null);
          });
        } else {
          setRecUrl(URL.createObjectURL(blob));
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
    a.currentTime = 0;
    setMyPlay(true);
    a.onended = () => setMyPlay(false);
    a.oncanplaythrough = () => { a.oncanplaythrough = null; a.play(); };
    if (a.readyState >= 3) a.play();
    else a.load();
  }

  function reset() { setStep("listen"); setRecUrl(null); setNatUrl(null); setRec(false); setNatPlay(false); setMyPlay(false); setBothPlay(false); setRecDuration(0); setRecError(null); stopSpeak(); natAudioRef.current?.pause(); audioRef.current?.pause(); }

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
        {natUrl && <audio ref={natAudioRef} src={natUrl} className="hidden" />}

        {step === "compare" && (
          <div className="flex flex-col gap-3.5">

            {/* Play buttons + volume */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="flex flex-col gap-2.5"
            >
              <div className="grid grid-cols-2 gap-2.5">
                <button className="btn btn-default gap-1 w-full" onClick={natPlay ? stopNatAudio : playNatAudio}>
                  {natPlay ? <><IconPause size="sm" /> native</> : <><IconPlay size="sm" /> native</>}
                </button>
                <button className="btn btn-default gap-1 w-full" onClick={myPlay ? stopMine : playMine}>
                  {myPlay ? <><IconPause size="sm" /> yours</> : <><IconPlay size="sm" /> yours</>}
                </button>
              </div>
              <button className={`btn ${bothPlay ? "btn-primary" : "btn-default"} gap-1 w-full`}
                onClick={bothPlay ? stopBoth : playBoth}
                disabled={!natUrl || !recUrl}>
                {bothPlay ? <><IconPause size="sm" /> stop both</> : <><IconPlay size="sm" /> play both</>}
              </button>
              {natUrl && recUrl && (
                <div className="grid grid-cols-2 gap-2.5">
                  <label className="flex items-center gap-2 text-xs text-gray-500 font-mono">
                    native
                    <input type="range" min="0" max="1" step="0.05" value={natVol}
                      onChange={e => setNatVol(+e.target.value)}
                      className="flex-1 h-1 accent-gray-500 cursor-pointer" />
                  </label>
                  <label className="flex items-center gap-2 text-xs text-gray-500 font-mono">
                    you
                    <input type="range" min="0" max="1" step="0.05" value={userVol}
                      onChange={e => setUserVol(+e.target.value)}
                      className="flex-1 h-1 accent-amber-600 cursor-pointer" />
                  </label>
                </div>
              )}
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
              <button className="btn btn-default gap-1" onClick={() => { stopBoth(); setRecUrl(null); setNatUrl(null); setRecDuration(0); setRecError(null); setStep("shadow"); }}><IconRefresh size="sm" /> Re-record</button>
              <button className="btn btn-ghost" onClick={reset}>Start over</button>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
