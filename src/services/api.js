import { cacheGet, cacheSet } from "./cache";

// ─── Provider configs ────────────────────────────────────────────────────────
// Switch provider by changing ACTIVE_PROVIDER below.

const PROVIDERS = {
  docker: {
    url: "/api/llm",
    model: "docker.io/ai/qwen3:14B-Q6_K",
    headers: { "Content-Type": "application/json" },
    format: "openai",
  },
  openai: {
    url: "https://api.openai.com/v1/chat/completions",
    model: "gpt-4o-mini",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer YOUR_OPENAI_API_KEY",
    },
    format: "openai",
  },
  gemini: {
    url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    model: "gemini-2.0-flash",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_GEMINI_API_KEY}`,
    },
    format: "openai",
  },
  anthropic: {
    url: "https://api.anthropic.com/v1/messages",
    model: "claude-sonnet-4-6",
    headers: {
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
      "x-api-key": "YOUR_ANTHROPIC_API_KEY",
    },
    format: "anthropic",
  },
};

const ACTIVE_PROVIDER = "gemini";

// ─── Request builders ────────────────────────────────────────────────────────

const SYSTEM_MSG = "You are a pronunciation expert. Respond ONLY with valid JSON. No markdown, no backticks, no explanation — just the JSON object. /no_think";

function buildOpenAIBody(provider, prompt) {
  return {
    model: provider.model,
    max_tokens: 8000,
    temperature: 0.7,
    messages: [
      { role: "system", content: SYSTEM_MSG },
      { role: "user", content: prompt + "\n\n/no_think" },
    ],
  };
}

function buildAnthropicBody(provider, prompt) {
  return {
    model: provider.model,
    max_tokens: 4000,
    system: SYSTEM_MSG,
    messages: [{ role: "user", content: prompt }],
  };
}

// ─── Response parsers ────────────────────────────────────────────────────────

function parseOpenAIResponse(data) {
  return data.choices?.[0]?.message?.content || "";
}

function parseAnthropicResponse(data) {
  return data.content?.find(b => b.type === "text")?.text || "";
}

// ─── Core fetch ──────────────────────────────────────────────────────────────

const TIMEOUT_MS = 30_000;
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1_000, 3_000, 5_000];

function fetchWithTimeout(url, options, timeoutMs = TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timer));
}

async function callAPI(provider, body) {
  let lastError;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = RETRY_DELAYS[attempt - 1] || 5_000;
      console.warn(`API retry ${attempt}/${MAX_RETRIES} in ${delay}ms…`);
      await new Promise(r => setTimeout(r, delay));
    }

    try {
      const res = await fetchWithTimeout(provider.url, {
        method: "POST",
        headers: provider.headers,
        body: JSON.stringify(body),
      });

      // Retry on server errors (5xx) and rate limits (429)
      if (res.status >= 500 || res.status === 429) {
        lastError = new Error(`API error ${res.status}`);
        continue;
      }

      const data = await res.json();
      if (!res.ok) throw new Error(`API error ${res.status}: ${JSON.stringify(data)}`);
      return data;
    } catch (e) {
      lastError = e;
      // Retry on timeout or network errors, throw on other errors
      if (e.name === "AbortError") {
        lastError = new Error("Request timed out");
      } else if (!(e instanceof TypeError)) {
        // Not a network error — don't retry
        throw e;
      }
    }
  }

  throw lastError;
}

export async function fetchFromAPI(lessonDef) {
  const provider = PROVIDERS[ACTIVE_PROVIDER];

  const body = provider.format === "anthropic"
    ? buildAnthropicBody(provider, lessonDef.prompt)
    : buildOpenAIBody(provider, lessonDef.prompt);

  const data = await callAPI(provider, body);

  const text = provider.format === "anthropic"
    ? parseAnthropicResponse(data)
    : parseOpenAIResponse(data);

  // Strip markdown fences, <think> blocks, and whitespace
  const clean = text
    .replace(/<think>[\s\S]*?<\/think>/g, "")
    .replace(/```json|```/g, "")
    .trim();

  try {
    return JSON.parse(clean);
  } catch (e) {
    console.error("JSON parse failed. Raw response:", text);
    throw new Error("Invalid JSON from model. See console for details.");
  }
}

const ANALYZE_PROMPT = `Analyze this English phrase for pronunciation practice. Return a JSON object with:
- "phrase": the exact input phrase
- "ipa": full IPA transcription of the phrase
- "syllables": syllable breakdown with stress marks (e.g. "ˈprac·tice ˈmakes ˈper·fect")
- "note": a brief pronunciation tip for this phrase (linking, reductions, stress pattern, etc.)
- "tokens": array of word objects, each with:
  - "t": the word text
  - "s": sentence-level stress: 2 = primary (content words with main emphasis: nouns, main verbs, adjectives), 1 = secondary (other content words with some stress), 0 = unstressed (function words: a, the, to, is, in, of, etc.)
  - "lk": true when this word's final consonant links phonetically to the next word's initial vowel (e.g. "make a" → lk:true on "make")

Phrase: `;

export async function analyzePhrase(phrase) {
  const provider = PROVIDERS[ACTIVE_PROVIDER];
  const prompt = ANALYZE_PROMPT + JSON.stringify(phrase);

  const body = provider.format === "anthropic"
    ? buildAnthropicBody(provider, prompt)
    : buildOpenAIBody(provider, prompt);

  const data = await callAPI(provider, body);

  const text = provider.format === "anthropic"
    ? parseAnthropicResponse(data)
    : parseOpenAIResponse(data);

  const clean = text
    .replace(/<think>[\s\S]*?<\/think>/g, "")
    .replace(/```json|```/g, "")
    .trim();

  return JSON.parse(clean);
}

export async function generateContent(lessonDef, force = false) {
  if (!force) {
    const cached = cacheGet(lessonDef.id);
    if (cached) return cached;
  }
  const data = await fetchFromAPI(lessonDef);
  cacheSet(lessonDef.id, data);
  return data;
}
