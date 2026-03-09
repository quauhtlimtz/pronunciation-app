#!/usr/bin/env node
/**
 * Generate isolated consonant sound audio files using ElevenLabs TTS.
 * Saves MP3 files to public/sounds/ for use in the Consonant Chart.
 *
 * Usage: VITE_ELEVENLABS_API_KEY=your_key node scripts/generate-consonant-sounds.js
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "..", "public", "sounds");

const EL_KEY = process.env.VITE_ELEVENLABS_API_KEY;
const EL_VOICE = "21m00Tcm4TlvDq8ikWAM"; // Rachel
const EL_MODEL = "eleven_turbo_v2";

if (!EL_KEY) {
  console.error("Set VITE_ELEVENLABS_API_KEY env var");
  process.exit(1);
}

// IPA symbol → filename, TTS text
const SOUNDS = [
  { ipa: "/p/",  file: "p",   text: "puh" },
  { ipa: "/b/",  file: "b",   text: "buh" },
  { ipa: "/t/",  file: "t",   text: "tuh" },
  { ipa: "/d/",  file: "d",   text: "duh" },
  { ipa: "/k/",  file: "k",   text: "kuh" },
  { ipa: "/g/",  file: "g",   text: "guh" },
  { ipa: "/f/",  file: "f",   text: "fah" },
  { ipa: "/v/",  file: "v",   text: "vah" },
  { ipa: "/θ/",  file: "th_voiceless", text: "thah" },
  { ipa: "/ð/",  file: "th_voiced",    text: "thuh" },
  { ipa: "/s/",  file: "s",   text: "sah" },
  { ipa: "/z/",  file: "z",   text: "zah" },
  { ipa: "/ʃ/",  file: "sh",  text: "shah" },
  { ipa: "/ʒ/",  file: "zh",  text: "zhah" },
  { ipa: "/h/",  file: "h",   text: "hah" },
  { ipa: "/tʃ/", file: "ch",  text: "chuh" },
  { ipa: "/dʒ/", file: "dj",  text: "juh" },
  { ipa: "/m/",  file: "m",   text: "mmm" },
  { ipa: "/n/",  file: "n",   text: "nnn" },
  { ipa: "/ŋ/",  file: "ng",  text: "ngah" },
  { ipa: "/l/",  file: "l",   text: "lah" },
  { ipa: "/r/",  file: "r",   text: "rah" },
  { ipa: "/w/",  file: "w",   text: "wah" },
  { ipa: "/j/",  file: "y",   text: "yah" },
];

async function generate(sound) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${EL_VOICE}`, {
    method: "POST",
    headers: { "xi-api-key": EL_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      text: sound.text,
      model_id: EL_MODEL,
      voice_settings: { stability: 0.4, similarity_boost: 0.75, style: 0.3, use_speaker_boost: true },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`ElevenLabs error ${res.status} for "${sound.text}": ${body}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  const outPath = path.join(OUT_DIR, `${sound.file}.mp3`);
  fs.writeFileSync(outPath, buffer);
  console.log(`✓ ${sound.ipa} → ${outPath} (${buffer.length} bytes)`);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  for (const sound of SOUNDS) {
    await generate(sound);
    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\nDone! ${SOUNDS.length} sounds saved to ${OUT_DIR}/`);
}

main().catch(e => { console.error(e); process.exit(1); });
