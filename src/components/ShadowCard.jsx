import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { speak, stopSpeak, getTtsUrl } from "../services/tts";
import { useWavesurfer } from "@wavesurfer/react";
import SpectrogramPlugin from "wavesurfer.js/dist/plugins/spectrogram.esm.js";
import { PhraseAnnotation } from "./PhraseAnnotation";
import { PitchOverlay } from "./PitchOverlay";
import { IconPlay, IconPause, IconStop, IconMic, IconCheck, IconArrow, IconRefresh } from "./Icons";
import { motion } from "motion/react";
import { trimSilence, preloadFFmpeg } from "../services/audioTrim";

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

// ─── Main component ────────────────────────────────────────────────────────

const STEPS = ["listen", "shadow", "compare"];

export function ShadowCard({ phrase, ipa, syllables, note, tokens, micStreamRef, savedDone, onRecordingChange }) {
  const [step, setStep]         = useState("listen");
  const [natPlay, setNatPlay]   = useState(false);
  const [rec, setRec]           = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [recUrl, setRecUrl]     = useState(null);
  const [recDuration, setRecDuration] = useState(0);
  const [myPlay, setMyPlay]     = useState(false);
  const [recError, setRecError] = useState(null);
  const [natUrl, setNatUrl]     = useState(null);
  const audioRef   = useRef(null);
  const natAudioRef = useRef(null);
  const [bothPlay, setBothPlay] = useState(false);
  const [natVol, setNatVol]     = useState(1);
  const [userVol, setUserVol]   = useState(1);
  const [recReady, setRecReady] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const recTimerRef = useRef(null);

  const [natError, setNatError] = useState(false);

  const fetchNative = useCallback(() => {
    setNatError(false);
    getTtsUrl(phrase).then(url => {
      if (url) setNatUrl(url);
      else setNatError(true);
    });
  }, [phrase]);

  // Preload ffmpeg + native TTS when entering shadow step so they're ready for compare
  useEffect(() => {
    if (step === "shadow" || step === "compare") {
      preloadFFmpeg();
      if (!natUrl) fetchNative();
    }
  }, [step, phrase]);

  useEffect(() => {
    onRecordingChange?.(!!recUrl);
  }, [recUrl]);

  // Cleanup on unmount (stream is owned by LessonView, don't stop it here)
  useEffect(() => {
    return () => {
      clearInterval(recTimerRef.current);
      if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
    };
  }, []);

  // Mobile browsers kill the mic stream when audio plays through speakers.
  // Proactively invalidate the ref so all ShadowCards see micReady=false.
  const invalidateMic = useCallback(() => {
    if (micStreamRef?.current) {
      micStreamRef.current.getTracks().forEach(t => t.stop());
      micStreamRef.current = null;
    }
  }, [micStreamRef]);

  const playNat  = () => { invalidateMic(); setNatPlay(true);  speak(phrase, () => setNatPlay(false)); };
  const stopNat  = () => { stopSpeak(); setNatPlay(false); };
  const stopMine = () => { audioRef.current?.pause(); setMyPlay(false); };

  const playNatAudio = useCallback(() => {
    if (!natAudioRef.current || !natUrl) return;
    invalidateMic();
    const a = natAudioRef.current;
    a.currentTime = 0;
    a.volume = natVol;
    setNatPlay(true);
    a.onended = () => setNatPlay(false);
    a.play();
  }, [natUrl, natVol, invalidateMic]);
  const stopNatAudio = useCallback(() => {
    natAudioRef.current?.pause();
    setNatPlay(false);
  }, []);

  const stopBoth = useCallback(() => {
    natAudioRef.current?.pause();
    audioRef.current?.pause();
    setBothPlay(false);
    setNatPlay(false);
    setMyPlay(false);
  }, []);

  const playBoth = useCallback(() => {
    if (!natAudioRef.current || !audioRef.current || !natUrl || !recUrl) return;
    invalidateMic();
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
  }, [natUrl, recUrl, natVol, userVol, stopBoth, invalidateMic]);

  useEffect(() => { if (natAudioRef.current) natAudioRef.current.volume = natVol; }, [natVol]);
  useEffect(() => { if (audioRef.current) audioRef.current.volume = userVol; }, [userVol]);

  // ─── Recording (same approach as test page) ────────────────────────────

  const [micLive, setMicLive] = useState(false);

  // Track mic liveness — listen for track ending (Safari kills tracks on audio playback)
  useEffect(() => {
    const check = () => {
      const track = micStreamRef?.current?.getAudioTracks()[0];
      setMicLive(!!track && track.readyState === "live");
    };
    check();
    const iv = setInterval(check, 500);
    return () => clearInterval(iv);
  }, [micStreamRef]);

  const micReady = micLive;

  const startRec = useCallback(async () => {
    let stream = micStreamRef?.current;
    const track = stream?.getAudioTracks()[0];
    const needsRefresh = !stream || !track || track.readyState === "ended";

    if (needsRefresh) {
      // Mic was invalidated (audio playback killed it) — auto re-acquire
      try {
        const deviceId = track?.getSettings?.()?.deviceId;
        const constraints = deviceId
          ? { audio: { deviceId: { exact: deviceId } } }
          : { audio: true };
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        micStreamRef.current = stream;
      } catch {
        setRecError("Microphone lost — tap the mic button at the bottom.");
        return;
      }
    }

    setRecError(null);
    setRecDuration(0);
    setRecReady(false);

    // Create MediaRecorder from the already-open stream
    const recorder = new MediaRecorder(stream);
    mediaRecorderRef.current = recorder;
    chunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      clearInterval(recTimerRef.current);
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
      if (blob.size < 100) {
        setRecError("No audio captured — check your microphone and try again.");
      } else {
        trimSilence(blob).then(url => {
          setRecUrl(url);
          setRecError(null);
        }).catch(() => {
          setRecUrl(URL.createObjectURL(blob));
          setRecError(null);
        });
      }
      setRec(false);
      mediaRecorderRef.current = null;
    };

    recorder.start();

    // 300ms warmup for Safari, then countdown
    await new Promise(r => setTimeout(r, 300));

    for (let i = 3; i >= 1; i--) {
      setCountdown(i);
      await new Promise(r => setTimeout(r, 1000));
    }
    setCountdown(0);
    setRec(true);

    // Duration timer (from when user starts speaking)
    const t0 = Date.now();
    recTimerRef.current = setInterval(() => {
      setRecDuration(Math.round((Date.now() - t0) / 1000));
    }, 500);
  }, [micStreamRef]);

  const stopRec = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  function playMine() {
    if (!audioRef.current || !recReady) return;
    invalidateMic();
    const a = audioRef.current;
    a.currentTime = 0;
    setMyPlay(true);
    a.onended = () => setMyPlay(false);
    a.play();
  }

  function reset() {
    setStep("listen"); setRecUrl(null); setNatUrl(null); setRec(false); setNatPlay(false); setMyPlay(false);
    setBothPlay(false); setRecDuration(0); setRecError(null); setRecReady(false);
    stopSpeak(); natAudioRef.current?.pause(); audioRef.current?.pause();
    if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
  }

  const si = STEPS.indexOf(step);
  const canNav = i => i <= si || (i === 2 && recUrl);

  return (
    <div className="card mb-2.5">
      <div className="px-4 pt-3.5 pb-2.5 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {tokens && tokens.length > 0
              ? <PhraseAnnotation tokens={tokens} />
              : <div className="text-base mb-1">{phrase}</div>
            }
            <div className="mono-muted mt-2">{ipa}</div>
            {note && <div className="mono-dim mt-1 leading-relaxed">{note}</div>}
          </div>
          {(savedDone || recUrl) && <span className="text-gray-400 shrink-0 mt-1"><IconCheck size="sm" /></span>}
        </div>
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
              className={`btn min-w-[12.5rem] gap-1 ${micReady ? "btn-primary" : "btn-default opacity-50 cursor-not-allowed"}`}
              onClick={() => micReady && setStep("shadow")}
              disabled={!micReady}
            >
              {micReady ? <>ready to shadow <IconArrow size="sm" /></> : "mic off — tap below"}
            </button>
          </div>
        )}

        {step === "shadow" && (
          <div className="flex flex-col items-center justify-center gap-2.5" style={{ minHeight: 140 }}>
            <div className="flex items-center gap-2">
              <button className={`circ circ-sm ${rec ? "circ-rec" : ""} ${countdown || !micReady ? "opacity-50 pointer-events-none" : ""}`}
                onClick={rec ? stopRec : startRec} disabled={!!countdown || (!rec && !micReady)}>
                {countdown ? <span className="text-lg font-mono font-bold">{countdown}</span> : rec ? <IconStop size="md" /> : <IconMic size="md" />}
              </button>
              <div className="text-left">
                <p className={`text-sm ${rec ? "text-amber-700 dark:text-amber-500" : countdown ? "text-gray-400" : "text-gray-500"}`}>
                  {countdown ? "get ready…" : rec
                    ? <><span className="font-mono tabular-nums">{recDuration}s</span> · recording…</>
                    : micReady ? "tap to record" : "mic off — tap below"}
                </p>
                {!rec && !countdown && !recUrl && (
                  <button className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer bg-transparent border-none p-0" onClick={natPlay ? stopNat : playNat}>
                    {natPlay ? "stop native" : "replay native"}
                  </button>
                )}
              </div>
            </div>

            {recError && <p className="text-sm text-amber-700 dark:text-amber-500 text-center">{recError}</p>}
            {recUrl && !rec && (
              <div className="flex flex-col gap-2 w-full">
                <button className="btn btn-default gap-1 w-full" onClick={myPlay ? stopMine : playMine} disabled={!recReady}>
                  {myPlay ? <><IconPause size="sm" /> stop preview</> : recReady ? <><IconPlay size="sm" /> preview recording · {recDuration}s</> : <><IconPlay size="sm" /> loading…</>}
                </button>
                <button className="btn btn-primary gap-1 w-full" onClick={() => setStep("compare")}>
                  compare <IconArrow size="sm" />
                </button>
              </div>
            )}
          </div>
        )}

        {recUrl && <audio ref={audioRef} src={recUrl} className="hidden"
          onCanPlayThrough={() => setRecReady(true)} />}
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
                <button className="btn btn-default gap-1 w-full" onClick={!natUrl ? fetchNative : natPlay ? stopNatAudio : playNatAudio} disabled={!natUrl && !natError}>
                  {natError ? <><IconRefresh size="sm" /> retry native</> : !natUrl ? "loading native…" : natPlay ? <><IconPause size="sm" /> native</> : <><IconPlay size="sm" /> native</>}
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
                {natUrl ? <MiniSpectrogram audioUrl={natUrl} /> : (
                  <div className="flex items-center justify-center text-xs text-gray-400" style={{ minHeight: 220 }}>
                    {natError ? <button className="btn btn-default btn-sm gap-1" onClick={fetchNative}><IconRefresh size="sm" /> retry</button> : "loading…"}
                  </div>
                )}
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
              <button className="btn btn-default gap-1" onClick={() => { stopBoth(); setRecUrl(null); setNatUrl(null); setRecDuration(0); setRecError(null); setRecReady(false); setStep("shadow"); }}><IconRefresh size="sm" /> Re-record</button>
              <button className="btn btn-ghost" onClick={reset}>Start over</button>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
