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
  try { return await fetchTts(text); } catch { return null; }
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
