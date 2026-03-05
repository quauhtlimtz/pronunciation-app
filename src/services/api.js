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

async function fetchFromAPI(lessonDef) {
  const provider = PROVIDERS[ACTIVE_PROVIDER];

  const body = provider.format === "anthropic"
    ? buildAnthropicBody(provider, lessonDef.prompt)
    : buildOpenAIBody(provider, lessonDef.prompt);

  const res = await fetch(provider.url, {
    method: "POST",
    headers: provider.headers,
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`API error ${res.status}: ${JSON.stringify(data)}`);

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

export async function generateContent(lessonDef, force = false) {
  if (!force) {
    const cached = cacheGet(lessonDef.id);
    if (cached) return cached;
  }
  const data = await fetchFromAPI(lessonDef);
  cacheSet(lessonDef.id, data);
  return data;
}
