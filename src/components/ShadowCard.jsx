import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { speak, stopSpeak, getTtsUrl } from "../services/tts";
import { useWavesurfer } from "@wavesurfer/react";
import WaveSurfer from "wavesurfer.js";
import RecordPlugin from "wavesurfer.js/dist/plugins/record.esm.js";
import SpectrogramPlugin from "wavesurfer.js/dist/plugins/spectrogram.esm.js";
import { PhraseAnnotation } from "./PhraseAnnotation";
import { PitchOverlay } from "./PitchOverlay";
import { IconPlay, IconPause, IconStop, IconMic, IconCheck, IconArrow, IconRefresh } from "./Icons";

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

export function ShadowCard({ phrase, ipa, syllables, note, tokens, micDeviceId, onMicDetected, onRecordingChange }) {
  const [step, setStep]         = useState("listen");
  const [natPlay, setNatPlay]   = useState(false);
  const [rec, setRec]           = useState(false);
  const [recUrl, setRecUrl]     = useState(null);
  const [myPlay, setMyPlay]     = useState(false);
  const [denied, setDenied]     = useState(false);
  const [natUrl, setNatUrl]     = useState(null);
  const audioRef   = useRef(null);

  // Wavesurfer Record plugin for live waveform + recording
  const recWaveRef = useRef(null);
  const recorderRef = useRef(null);
  const wsRef = useRef(null);

  // Initialize wavesurfer with Record plugin when shadow step is active
  useEffect(() => {
    if (step !== "shadow" || !recWaveRef.current) return;

    const ws = WaveSurfer.create({
      container: recWaveRef.current,
      waveColor: "#d97706",
      progressColor: "#d97706",
      height: 48,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      cursorWidth: 0,
    });

    const recorder = ws.registerPlugin(RecordPlugin.create({
      scrollingWaveform: true,
      scrollingWaveformWindow: 6,
      renderRecordedAudio: false,
    }));

    recorder.on("record-end", (blob) => {
      setRecUrl(URL.createObjectURL(blob));
      setRec(false);
    });

    wsRef.current = ws;
    recorderRef.current = recorder;

    return () => {
      if (recorder.isRecording()) recorder.stopRecording();
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
    try {
      const deviceId = micDeviceId || undefined;
      await recorderRef.current.startRecording({ deviceId });
      setRec(true);

      // Detect actual device
      const stream = recorderRef.current.stream;
      const track = stream?.getAudioTracks()[0];
      const actualId = track?.getSettings?.()?.deviceId;
      if (actualId && onMicDetected) onMicDetected(actualId);
    } catch { setDenied(true); }
  }, [micDeviceId, onMicDetected]);

  const stopRec = useCallback(() => {
    if (recorderRef.current?.isRecording()) {
      recorderRef.current.stopRecording();
    }
  }, []);

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
            <button
              className="btn btn-primary mt-1 min-w-[12.5rem] gap-1"
              disabled={!micDeviceId}
              onClick={() => setStep("shadow")}
            >
              ready to shadow <IconArrow size="sm" />
            </button>
            {!micDeviceId && <p className="text-xs text-gray-400">select a microphone first</p>}
          </div>
        )}

        {step === "shadow" && (
          <div className="flex flex-col items-center gap-4">
            <button className="btn btn-default btn-sm gap-1" onClick={natPlay ? stopNat : playNat}>
              {natPlay ? <><IconPause size="sm" /> stop</> : <><IconPlay size="sm" /> replay native</>}
            </button>
            {denied
              ? <p className="text-sm text-amber-700 dark:text-amber-500 text-center">Microphone access denied — enable it in browser settings.</p>
              : <>
                  <button className={`circ ${rec ? "circ-rec" : ""}`} onClick={rec ? stopRec : startRec}>
                    {rec ? <IconStop size="lg" /> : <IconMic size="lg" />}
                  </button>
                  <div ref={recWaveRef} className="w-full rounded-md overflow-hidden" style={{ minHeight: 48 }} />
                  <p className={`text-sm ${rec ? "text-amber-700 dark:text-amber-500" : "text-gray-500"}`}>
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

            {/* Play buttons */}
            <div className="grid grid-cols-2 gap-2.5">
              <button className="btn btn-default gap-1 w-full" onClick={natPlay ? stopNat : playNat}>
                {natPlay ? <><IconPause size="sm" /> pause native</> : <><IconPlay size="sm" /> play native</>}
              </button>
              <button className="btn btn-default gap-1 w-full" onClick={myPlay ? stopMine : playMine}>
                {myPlay ? <><IconPause size="sm" /> pause yours</> : <><IconPlay size="sm" /> play yours</>}
              </button>
            </div>

            <PitchOverlay nativeUrl={natUrl} userUrl={recUrl} />

            {/* Spectrograms side-by-side */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="card p-3">
                <p className="mono-label mb-2 text-center">native</p>
                <MiniSpectrogram audioUrl={natUrl} />
              </div>
              <div className="card p-3">
                <p className="mono-label mb-2 text-center">you</p>
                <MiniSpectrogram audioUrl={recUrl} />
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
