import { useState, useRef, useCallback } from "react";
import { trimSilence } from "../services/audioTrim";

/**
 * Reusable recording hook. Handles countdown, fresh mic acquisition,
 * MediaRecorder lifecycle, silence trimming, and duration tracking.
 *
 * Usage:
 *   const rec = useRecorder();
 *   // rec.startRec(beforeStart?) — starts countdown then records
 *   // rec.stopRec()              — stops recording
 *   // rec.recUrl                 — blob URL of last recording
 *   // rec.recDuration            — duration in seconds
 *   // rec.rec                    — true while recording
 *   // rec.countdown              — 3, 2, 1, or 0
 *   // rec.recError               — error message or null
 *   // rec.recReady               — true when audio element can play
 *   // rec.clearRec()             — clear the recording
 *   // rec.audioRef               — ref for <audio> element
 */
export function useRecorder() {
  const [rec, setRec]               = useState(false);
  const [countdown, setCountdown]   = useState(0);
  const [recUrl, setRecUrl]         = useState(null);
  const [recDuration, setRecDuration] = useState(0);
  const [recError, setRecError]     = useState(null);
  const [recReady, setRecReady]     = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef        = useRef([]);
  const recTimerRef      = useRef(null);
  const audioRef         = useRef(null);

  const clearRec = useCallback(() => {
    setRecUrl(null);
    setRecError(null);
    setRecDuration(0);
    setRecReady(false);
  }, []);

  const startRec = useCallback(async (beforeStart) => {
    // 1. Clear previous recording
    setRecUrl(null);
    setRecError(null);
    setRecDuration(0);
    setRecReady(false);

    // Run caller's cleanup (e.g. stop audio playback)
    if (beforeStart) beforeStart();

    // 2. Countdown
    for (let i = 3; i >= 1; i--) {
      setCountdown(i);
      await new Promise(r => setTimeout(r, 1000));
    }
    setCountdown(0);

    // 3. Always get a fresh mic stream
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setRecError("Could not access microphone.");
      return;
    }

    // 4. Create MediaRecorder and start
    const recorder = new MediaRecorder(stream);
    mediaRecorderRef.current = recorder;
    chunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      clearInterval(recTimerRef.current);
      stream.getTracks().forEach(t => t.stop());
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
    setRec(true);

    const t0 = Date.now();
    recTimerRef.current = setInterval(() => {
      setRecDuration(Math.round((Date.now() - t0) / 1000));
    }, 500);
  }, []);

  const stopRec = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  // Call on unmount
  const cleanup = useCallback(() => {
    clearInterval(recTimerRef.current);
    if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
  }, []);

  return {
    rec, countdown, recUrl, recDuration, recError, recReady, audioRef,
    startRec, stopRec, clearRec, cleanup,
    setRecReady, // for <audio onCanPlayThrough>
  };
}
