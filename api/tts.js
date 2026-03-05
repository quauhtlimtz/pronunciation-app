import { EdgeTTS } from "edge-tts-universal";

const VOICE = "en-US-AvaMultilingualNeural";
const MAX_LENGTH = 500;

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end();
  }

  const text = (req.query.text || "").trim();
  if (!text || text.length > MAX_LENGTH) {
    return res.status(400).json({ error: "text required (max 500 chars)" });
  }

  try {
    const tts = new EdgeTTS(text, VOICE, { rate: "-5%", pitch: "+0Hz" });
    const result = await tts.synthesize();
    const buffer = Buffer.from(await result.audio.arrayBuffer());

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=86400");
    res.setHeader("Content-Length", buffer.length);
    return res.send(buffer);
  } catch (e) {
    console.error("edge-tts error:", e);
    return res.status(500).json({ error: "TTS generation failed" });
  }
}
