import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { speak, stopSpeak, getTtsUrl, speakKaraoke, stopKaraoke } from "../services/tts";
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
  const [activeWord, setActiveWord] = useState(-1);
  const [showIpa, setShowIpa]   = useState(false);
  const [karaokeOn, setKaraokeOn] = useState(true);
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
  const refreshMicAfterAudio = useRef(false);

  // Preload ffmpeg when entering shadow step
  useEffect(() => {
    if (step === "shadow") preloadFFmpeg();
  }, [step]);

  useEffect(() => {
    if (step === "compare") {
      getTtsUrl(phrase).then(url => url && setNatUrl(url));
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

  // ─── Mic refresh (must be before playback functions that reference it) ───

  const micReady = !!micStreamRef?.current &&
    micStreamRef.current.getTracks().some(track => track.readyState === 'live');

  const refreshMicStreamIfNeeded = useCallback(async () => {
    if (!refreshMicAfterAudio.current) return;
    refreshMicAfterAudio.current = false;

    try {
      let deviceId = null;
      const currentStream = micStreamRef?.current;
      if (currentStream && currentStream.getTracks().length > 0) {
        const track = currentStream.getTracks()[0];
        const settings = track.getSettings();
        deviceId = settings.deviceId;
        currentStream.getTracks().forEach(t => t.stop());
      }

      const constraints = {
        audio: deviceId ? { deviceId: { exact: deviceId } } : true
      };
      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      micStreamRef.current = newStream;
    } catch (error) {
      console.warn('Failed to refresh microphone stream:', error);
      micStreamRef.current = null;
    }
  }, [micStreamRef]);

  // ─── Audio playback ──────────────────────────────────────────────────

  const playNat = () => {
    setNatPlay(true);
    if (karaokeOn && tokens?.length) {
      speakKaraoke(phrase, tokens, setActiveWord, () => { setNatPlay(false); setActiveWord(-1); });
    } else {
      speak(phrase, () => setNatPlay(false));
    }
  };
  const stopNat = () => { stopKaraoke(); stopSpeak(); setNatPlay(false); setActiveWord(-1); };
  const stopMine = () => {
    audioRef.current?.pause();
    setMyPlay(false);
    if (refreshMicAfterAudio.current) {
      setTimeout(() => refreshMicStreamIfNeeded(), 100);
    }
  };

  const playNatAudio = useCallback(() => {
    if (!natAudioRef.current || !natUrl) return;
    const a = natAudioRef.current;
    a.currentTime = 0;
    a.volume = natVol;
    setNatPlay(true);

    refreshMicAfterAudio.current = true;

    a.onended = () => {
      setNatPlay(false);
      setTimeout(() => refreshMicStreamIfNeeded(), 100);
    };
    a.play();
  }, [natUrl, natVol, refreshMicStreamIfNeeded]);
  const stopNatAudio = useCallback(() => {
    natAudioRef.current?.pause();
    setNatPlay(false);
    if (refreshMicAfterAudio.current) {
      setTimeout(() => refreshMicStreamIfNeeded(), 100);
    }
  }, [refreshMicStreamIfNeeded]);

  const stopBoth = useCallback(() => {
    natAudioRef.current?.pause();
    audioRef.current?.pause();
    setBothPlay(false);
    setNatPlay(false);
    setMyPlay(false);
    if (refreshMicAfterAudio.current) {
      setTimeout(() => refreshMicStreamIfNeeded(), 100);
    }
  }, [refreshMicStreamIfNeeded]);

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

    refreshMicAfterAudio.current = true;

    let ended = 0;
    const onEnd = () => {
      ended++;
      if (ended >= 2) {
        stopBoth();
        setTimeout(() => refreshMicStreamIfNeeded(), 100);
      }
    };
    na.onended = onEnd;
    ua.onended = onEnd;

    na.play();
    ua.play();
  }, [natUrl, recUrl, natVol, userVol, stopBoth, refreshMicStreamIfNeeded]);

  useEffect(() => { if (natAudioRef.current) natAudioRef.current.volume = natVol; }, [natVol]);
  useEffect(() => { if (audioRef.current) audioRef.current.volume = userVol; }, [userVol]);

  // ─── Recording ─────────────────────────────────────────────────────────

  const startRec = useCallback(async () => {
    const stream = micStreamRef?.current;
    if (!stream) {
      setRecError("Enable your microphone first.");
      return;
    }

    const liveTracks = stream.getTracks().filter(track => track.readyState === 'live');
    if (liveTracks.length === 0) {
      setRecError("Microphone connection lost. Try clicking the mic selector.");
      await refreshMicStreamIfNeeded();
      return;
    }

    setRecError(null);
    setRecDuration(0);
    setRecReady(false);

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
      await new Promise(r => setTimeout(r, 600));
    }
    setCountdown(0);
    setRec(true);

    const t0 = Date.now();
    recTimerRef.current = setInterval(() => {
      setRecDuration(Math.round((Date.now() - t0) / 1000));
    }, 500);
  }, [micStreamRef, refreshMicStreamIfNeeded]);

  const stopRec = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  function playMine() {
    if (!audioRef.current || !recReady) return;
    const a = audioRef.current;
    a.currentTime = 0;
    setMyPlay(true);

    refreshMicAfterAudio.current = true;

    a.onended = () => {
      setMyPlay(false);
      setTimeout(() => refreshMicStreamIfNeeded(), 100);
    };
    a.play();
  }

  function reset() {
    setStep("listen"); setRecUrl(null); setNatUrl(null); setRec(false); setNatPlay(false); setMyPlay(false);
    setBothPlay(false); setRecDuration(0); setRecError(null); setRecReady(false); setActiveWord(-1);
    stopKaraoke(); stopSpeak(); natAudioRef.current?.pause(); audioRef.current?.pause();
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
              ? <PhraseAnnotation tokens={tokens} activeWordIndex={activeWord} ipa={ipa} showIpa={showIpa} />
              : <div className="text-base mb-1">{phrase}</div>
            }
            {/* Inline controls — play + IPA toggle */}
            <div className="flex items-center gap-2 mt-2">
              <button
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono cursor-pointer border-none transition-colors
                  ${natPlay
                    ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"}`}
                onClick={natPlay ? stopNat : playNat}
              >
                {natPlay ? <><IconPause size="sm" /> playing</> : <><IconPlay size="sm" /> listen</>}
              </button>
              {tokens?.length > 0 && (
                <button
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono cursor-pointer border-none transition-colors
                    ${karaokeOn
                      ? "bg-gray-900 dark:bg-gray-100 text-white dark:text-black"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"}`}
                  onClick={() => setKaraokeOn(!karaokeOn)}
                >
                  karaoke
                </button>
              )}
              {ipa && tokens?.length > 0 && (
                <button
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono cursor-pointer border-none transition-colors
                    ${showIpa
                      ? "bg-gray-900 dark:bg-gray-100 text-white dark:text-black"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"}`}
                  onClick={() => setShowIpa(!showIpa)}
                >
                  IPA
                </button>
              )}
              {(savedDone || recUrl) && <span className="text-gray-400 shrink-0"><IconCheck size="sm" /></span>}
            </div>
            {!showIpa && <div className="mono-muted mt-2">{ipa}</div>}
            {note && <div className="mono-dim mt-1 leading-relaxed">{note}</div>}
          </div>
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
            <p className="text-sm text-gray-500 text-center">
              {natPlay ? "listen and follow the highlighted words" : "tap listen above, then shadow below"}
            </p>
            <button
              className={`btn min-w-[12.5rem] gap-1 ${micReady ? "btn-primary" : "btn-default opacity-50 cursor-not-allowed"}`}
              onClick={() => micReady && setStep("shadow")}
              disabled={!micReady}
            >
              {micReady ? <>ready to shadow <IconArrow size="sm" /></> : "enable mic to shadow"}
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
                    : micReady ? "tap to record" : "enable mic first"}
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
              <div className="flex items-center gap-2 w-full">
                <button className="btn btn-primary flex-1 gap-1" onClick={() => setStep("compare")}>
                  compare <IconArrow size="sm" />
                </button>
                <button className="btn btn-default btn-sm gap-1" onClick={myPlay ? stopMine : playMine} disabled={!recReady}>
                  {myPlay ? <><IconPause size="sm" /> playing</> : <><IconPlay size="sm" /> {recReady ? "preview" : "loading…"}</>}
                </button>
                <span className="text-xs text-gray-400 font-mono shrink-0">{recDuration}s</span>
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
              <button className="btn btn-default gap-1" onClick={() => { stopBoth(); setRecUrl(null); setNatUrl(null); setRecDuration(0); setRecError(null); setRecReady(false); setStep("shadow"); }}><IconRefresh size="sm" /> Re-record</button>
              <button className="btn btn-ghost" onClick={reset}>Start over</button>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
