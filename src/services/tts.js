const EL_KEY   = "sk_5101214a011f137e118498042172476f25b43b2afea9eb5e";
const EL_VOICE = "21m00Tcm4TlvDq8ikWAM"; // Rachel — natural American English
const EL_MODEL = "eleven_turbo_v2";

let currentAudio = null;
let ttsMode = "el"; // "el" | "browser"

export function getTtsMode() { return ttsMode; }

function pickVoice() {
  const voices = window.speechSynthesis.getVoices();
  const enUS = voices.filter(v => v.lang === "en-US" || v.lang === "en_US");
  return (
    enUS.find(v => /jenny|aria|guy|ana|christopher|eric|michelle|roger|steffan/i.test(v.name)) ||
    enUS.find(v => /microsoft/i.test(v.name) && /natural|neural/i.test(v.name)) ||
    enUS.find(v => /microsoft/i.test(v.name)) ||
    enUS.find(v => /samantha|karen|moira/i.test(v.name)) ||
    enUS[0] ||
    voices.find(v => v.lang.startsWith("en"))
  );
}

export function getVoiceName() {
  const v = pickVoice();
  return v ? v.name : "";
}

function ensureVoices(cb) {
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) { cb(); return; }
  window.speechSynthesis.onvoiceschanged = () => cb();
}

function browserSpeak(text, onEnd) {
  window.speechSynthesis.cancel();
  ensureVoices(() => {
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = "en-US";
    utt.rate = 0.88;
    utt.pitch = 1.0;
    const v = pickVoice();
    if (v) utt.voice = v;
    if (onEnd) utt.onend = onEnd;
    window.speechSynthesis.speak(utt);
  });
}

export async function speak(text, onEnd, onFallback) {
  if (ttsMode === "browser") {
    browserSpeak(text, onEnd);
    return;
  }
  try {
    if (currentAudio) { currentAudio.pause(); currentAudio = null; }
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${EL_VOICE}`, {
      method: "POST",
      headers: { "xi-api-key": EL_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        text, model_id: EL_MODEL,
        voice_settings: { stability: 0.4, similarity_boost: 0.75, style: 0.3, use_speaker_boost: true },
      }),
    });
    if (!res.ok) {
      const reason = res.status === 429 ? "quota" : `error ${res.status}`;
      throw new Error(reason);
    }
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const audio = new Audio(url);
    currentAudio = audio;
    if (onEnd) audio.onended = () => { currentAudio = null; onEnd(); };
    await audio.play();
  } catch (e) {
    console.warn("ElevenLabs fallback:", e.message);
    ttsMode = "browser";
    if (onFallback) onFallback(e.message);
    browserSpeak(text, onEnd);
  }
}

export function stopSpeak() {
  if (currentAudio) { currentAudio.pause(); currentAudio = null; }
  window.speechSynthesis.cancel();
}
