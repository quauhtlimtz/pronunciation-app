const EL_KEY   = import.meta.env.VITE_ELEVENLABS_API_KEY;
const EL_VOICE = "21m00Tcm4TlvDq8ikWAM"; // Rachel — natural American English
const EL_MODEL = "eleven_turbo_v2";

let currentAudio = null;
let ttsMode = EL_KEY ? "el" : "edge"; // "el" | "edge"
const blobCache = new Map();

export function getTtsMode() { return ttsMode; }

// ─── ElevenLabs (primary) ───────────────────────────────────────────────────

async function fetchElevenLabs(text) {
  if (blobCache.has(text)) return blobCache.get(text);
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${EL_VOICE}`, {
    method: "POST",
    headers: { "xi-api-key": EL_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      text, model_id: EL_MODEL,
      voice_settings: { stability: 0.4, similarity_boost: 0.75, style: 0.3, use_speaker_boost: true },
    }),
  });
  if (!res.ok) throw new Error(res.status === 429 ? "quota" : `error ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  blobCache.set(text, url);
  return url;
}

// ─── Edge TTS (fallback — serverless function) ─────────────────────────────

async function fetchEdgeTts(text) {
  if (blobCache.has(text)) return blobCache.get(text);
  const res = await fetch(`/api/tts?text=${encodeURIComponent(text)}`);
  if (!res.ok) throw new Error(`edge-tts error ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  blobCache.set(text, url);
  return url;
}

// ─── Unified fetch (cached) ────────────────────────────────────────────────

async function fetchTts(text) {
  if (ttsMode === "el") return fetchElevenLabs(text);
  return fetchEdgeTts(text);
}

// ─── Public API ─────────────────────────────────────────────────────────────

export async function getTtsUrl(text) {
  try {
    return await fetchTts(text);
  } catch {
    // If ElevenLabs failed, fall back to edge-tts
    if (ttsMode === "el") {
      ttsMode = "edge";
      try { return await fetchEdgeTts(text); } catch { /* both failed */ }
    }
    return null;
  }
}

export async function speak(text, onEnd, onFallback) {
  try {
    if (currentAudio) { currentAudio.pause(); currentAudio = null; }
    const url = await fetchTts(text);
    const audio = new Audio(url);
    currentAudio = audio;
    if (onEnd) audio.onended = () => { currentAudio = null; onEnd(); };
    await audio.play();
  } catch (e) {
    console.warn("TTS error:", e.message);
    // If ElevenLabs failed, switch to edge-tts and retry once
    if (ttsMode === "el") {
      ttsMode = "edge";
      if (onFallback) onFallback("edge");
      try {
        const url = await fetchEdgeTts(text);
        const audio = new Audio(url);
        currentAudio = audio;
        if (onEnd) audio.onended = () => { currentAudio = null; onEnd(); };
        await audio.play();
        return;
      } catch (e2) {
        console.warn("Edge TTS also failed:", e2.message);
      }
    }
    if (onEnd) onEnd();
  }
}

export function stopSpeak() {
  if (currentAudio) { currentAudio.pause(); currentAudio = null; }
}

// ─── Karaoke (estimated word timing from audio duration) ─────────────────

let karaokeRafId = null;

function estimateWordTimings(tokens, duration) {
  // Weight each word by character count; punctuation adds pause
  const weights = tokens.map(tok => {
    const w = tok.t;
    let weight = w.replace(/[.,!?;:'"]/g, "").length;
    if (/[.!?]$/.test(w)) weight += 3;   // sentence-ending pause
    else if (/[,;:]$/.test(w)) weight += 1.5; // mid-sentence pause
    return Math.max(weight, 1);
  });
  const total = weights.reduce((a, b) => a + b, 0);
  const timings = [];
  let cursor = 0;
  for (let i = 0; i < tokens.length; i++) {
    const dur = (weights[i] / total) * duration;
    timings.push({ index: i, start: cursor, end: cursor + dur });
    cursor += dur;
  }
  return timings;
}

export async function speakKaraoke(text, tokens, onWordIndex, onEnd) {
  stopKaraoke();
  try {
    const url = await fetchTts(text);
    const audio = new Audio(url);
    currentAudio = audio;

    const startTracking = () => {
      const timings = estimateWordTimings(tokens, audio.duration);
      const tick = () => {
        if (!audio || audio.paused) return;
        const t = audio.currentTime;
        let idx = -1;
        for (let i = timings.length - 1; i >= 0; i--) {
          if (t >= timings[i].start) { idx = i; break; }
        }
        onWordIndex(idx);
        karaokeRafId = requestAnimationFrame(tick);
      };
      karaokeRafId = requestAnimationFrame(tick);
    };

    audio.onloadedmetadata = startTracking;
    // Safari sometimes fires loadedmetadata before we attach, so also check duration
    if (audio.duration) startTracking();

    audio.onended = () => {
      cancelAnimationFrame(karaokeRafId);
      karaokeRafId = null;
      currentAudio = null;
      onWordIndex(-1);
      onEnd?.();
    };

    await audio.play();
    return audio;
  } catch (e) {
    console.warn("Karaoke TTS error:", e.message);
    // Fallback: try edge-tts
    if (ttsMode === "el") {
      ttsMode = "edge";
      return speakKaraoke(text, tokens, onWordIndex, onEnd);
    }
    onEnd?.();
    return null;
  }
}

export function stopKaraokeTracking() {
  if (karaokeRafId) { cancelAnimationFrame(karaokeRafId); karaokeRafId = null; }
}

export function stopKaraoke() {
  stopKaraokeTracking();
  if (currentAudio) { currentAudio.pause(); currentAudio = null; }
}
