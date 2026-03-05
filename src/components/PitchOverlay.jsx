import { useEffect, useRef, useState } from "react";
import { ACF2PLUS } from "pitchfinder";

// Extract pitch contour from audio samples
function extractPitch(samples, sampleRate) {
  const detectPitch = ACF2PLUS({ sampleRate });
  const windowMs = 40, hopMs = 10;
  const windowSize = Math.round(sampleRate * windowMs / 1000);
  const hopSize = Math.round(sampleRate * hopMs / 1000);
  const points = [];

  for (let i = 0; i + windowSize <= samples.length; i += hopSize) {
    const slice = samples.slice(i, i + windowSize);
    const freq = detectPitch(slice);
    const time = (i + windowSize / 2) / sampleRate;
    if (freq && freq > 60 && freq < 500) {
      points.push({ time, freq });
    }
  }
  return points;
}

// Smooth pitch contour with median filter to remove octave jumps
function smooth(points, radius = 2) {
  return points.map((p, i) => {
    const window = points.slice(Math.max(0, i - radius), i + radius + 1);
    const sorted = window.map(w => w.freq).sort((a, b) => a - b);
    return { time: p.time, freq: sorted[Math.floor(sorted.length / 2)] };
  });
}

// Trim leading/trailing silence so speech starts at t=0
function trimSilence(samples, sampleRate, thresholdDb = -35) {
  const threshold = Math.pow(10, thresholdDb / 20);
  const windowSize = Math.round(sampleRate * 0.01); // 10ms windows

  function rms(start, len) {
    let sum = 0;
    const end = Math.min(start + len, samples.length);
    for (let i = start; i < end; i++) sum += samples[i] * samples[i];
    return Math.sqrt(sum / (end - start));
  }

  let onset = 0;
  for (let i = 0; i < samples.length - windowSize; i += windowSize) {
    if (rms(i, windowSize) > threshold) { onset = i; break; }
  }

  let offset = samples.length;
  for (let i = samples.length - windowSize; i > onset; i -= windowSize) {
    if (rms(i, windowSize) > threshold) { offset = Math.min(i + windowSize, samples.length); break; }
  }

  return samples.slice(onset, offset);
}

async function decodeUrl(url) {
  const res = await fetch(url);
  const buf = await res.arrayBuffer();
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const audio = await ctx.decodeAudioData(buf);
  const raw = audio.getChannelData(0);
  const sr = audio.sampleRate;
  ctx.close();
  const samples = trimSilence(raw, sr);
  return { samples, sr };
}

function renderCanvas(canvas, nativePitch, userPitch) {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Find global time and freq range
  const all = [...nativePitch, ...userPitch];
  if (all.length === 0) return;

  const maxTime = Math.max(...all.map(p => p.time));
  const freqs = all.map(p => p.freq);
  const minF = Math.min(...freqs) * 0.9;
  const maxF = Math.max(...freqs) * 1.1;

  const pad = { top: 20, bottom: 24, left: 8, right: 8 };
  const cw = w - pad.left - pad.right;
  const ch = h - pad.top - pad.bottom;

  const toX = t => pad.left + (t / maxTime) * cw;
  const toY = f => pad.top + ch - ((f - minF) / (maxF - minF)) * ch;

  // Background
  ctx.fillStyle = "rgba(0,0,0,0.03)";
  ctx.fillRect(0, 0, w, h);

  // Grid lines
  ctx.strokeStyle = "rgba(0,0,0,0.06)";
  ctx.lineWidth = 0.5;
  for (let f = Math.ceil(minF / 50) * 50; f < maxF; f += 50) {
    const y = toY(f);
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(w - pad.right, y);
    ctx.stroke();
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.font = "9px monospace";
    ctx.textAlign = "right";
    ctx.fillText(`${f}`, w - pad.right - 2, y - 2);
  }

  // Draw a pitch curve
  function drawCurve(points, color) {
    if (points.length < 2) return;
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    let started = false;
    for (let i = 0; i < points.length; i++) {
      const x = toX(points[i].time);
      const y = toY(points[i].freq);
      // Break line if there's a gap > 50ms
      if (i > 0 && points[i].time - points[i - 1].time > 0.05) {
        ctx.stroke();
        ctx.beginPath();
        started = false;
      }
      if (!started) { ctx.moveTo(x, y); started = true; }
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  drawCurve(nativePitch, "rgba(107,114,128,0.8)");   // gray
  drawCurve(userPitch, "rgba(217,119,6,0.8)");       // amber

  // Legend
  ctx.font = "10px monospace";
  ctx.fillStyle = "rgba(107,114,128,0.9)";
  ctx.textAlign = "left";
  ctx.fillText("native", pad.left + 4, h - 6);
  ctx.fillStyle = "rgba(217,119,6,0.9)";
  ctx.fillText("you", pad.left + 52, h - 6);
}

export function PitchOverlay({ nativeUrl, userUrl }) {
  const canvasRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pitchData, setPitchData] = useState(null);

  // Decode + extract pitch
  useEffect(() => {
    if (!nativeUrl || !userUrl) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setPitchData(null);

    (async () => {
      try {
        let natAudio = null, userAudio = null;
        try { natAudio = await decodeUrl(nativeUrl); } catch (e) { console.warn("PitchOverlay: native decode failed", e); }
        try { userAudio = await decodeUrl(userUrl); } catch (e) { console.warn("PitchOverlay: user decode failed", e); }
        if (cancelled) return;

        if (!natAudio && !userAudio) {
          setError("Could not decode audio");
          setLoading(false);
          return;
        }

        const natPitch = natAudio ? smooth(extractPitch(natAudio.samples, natAudio.sr)) : [];
        const userPitch = userAudio ? smooth(extractPitch(userAudio.samples, userAudio.sr)) : [];

        if (natPitch.length === 0 && userPitch.length === 0) {
          setError("Could not detect pitch");
          setLoading(false);
          return;
        }

        setPitchData({ natPitch, userPitch });
        setLoading(false);
      } catch (e) {
        if (!cancelled) {
          console.warn("PitchOverlay error:", e);
          setError("Pitch analysis failed");
          setLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [nativeUrl, userUrl]);

  // Render canvas after data is ready and canvas is visible
  useEffect(() => {
    if (pitchData && canvasRef.current) {
      renderCanvas(canvasRef.current, pitchData.natPitch, pitchData.userPitch);
    }
  }, [pitchData]);

  if (!nativeUrl || !userUrl) return null;

  return (
    <div className="card p-3">
      <p className="mono-label mb-2 text-center">pitch contour</p>
      {loading && <p className="text-xs text-gray-400 text-center py-4">analyzing…</p>}
      {error && <p className="text-xs text-gray-400 text-center py-4">{error}</p>}
      {pitchData && (
        <canvas
          ref={canvasRef}
          className="w-full rounded-md"
          style={{ height: 140 }}
        />
      )}
    </div>
  );
}
