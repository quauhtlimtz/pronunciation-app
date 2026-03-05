import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

let ffmpeg = null;
let loadPromise = null;

const CORE_VERSION = "0.12.10";
const BASE_URL = `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${CORE_VERSION}/dist/umd`;

async function getFFmpeg() {
  if (ffmpeg?.loaded) return ffmpeg;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    ffmpeg = new FFmpeg();
    await ffmpeg.load({
      coreURL: await toBlobURL(`${BASE_URL}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${BASE_URL}/ffmpeg-core.wasm`, "application/wasm"),
    });
    return ffmpeg;
  })();

  return loadPromise;
}

// Pre-load ffmpeg so it's ready when user records
export function preloadFFmpeg() {
  getFFmpeg().catch(() => {});
}

/**
 * Trim leading and trailing silence from an audio blob using ffmpeg.
 * Returns a blob URL of the trimmed WAV.
 */
export async function trimSilence(blob) {
  const ff = await getFFmpeg();

  // Determine input extension from mime type
  const ext = blob.type.includes("mp4") ? "mp4"
    : blob.type.includes("wav") ? "wav"
    : "webm";

  await ff.writeFile(`input.${ext}`, await fetchFile(blob));

  // silenceremove: trim leading silence, then reverse+trim to remove trailing
  await ff.exec([
    "-i", `input.${ext}`,
    "-af", [
      "silenceremove=start_periods=1:start_duration=0:start_threshold=-30dB",
      "areverse",
      "silenceremove=start_periods=1:start_duration=0:start_threshold=-30dB",
      "areverse",
    ].join(","),
    "-ar", "16000",
    "-ac", "1",
    "output.wav",
  ]);

  const data = await ff.readFile("output.wav");
  const trimmedBlob = new Blob([data.buffer], { type: "audio/wav" });

  // Clean up virtual filesystem
  try { await ff.deleteFile(`input.${ext}`); } catch {}
  try { await ff.deleteFile("output.wav"); } catch {}

  return URL.createObjectURL(trimmedBlob);
}
