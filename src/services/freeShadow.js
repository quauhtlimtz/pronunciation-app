import { supabase } from "./supabase";
import { analyzePhrase, generateTopicPhrase } from "./api";

const DAILY_LIMIT = Infinity;
const PAGE_SIZE = 20;

// ─── Check daily limit ──────────────────────────────────────────────────────

export async function getGenerationsToday(userId) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from("free_shadow_content")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", todayStart.toISOString());

  return count || 0;
}

export function getDailyLimit() {
  return DAILY_LIMIT;
}

// ─── Generate from phrase ────────────────────────────────────────────────────

async function checkLimit(userId) {
  const used = await getGenerationsToday(userId);
  if (used >= DAILY_LIMIT) {
    throw new Error(`Daily limit reached (${DAILY_LIMIT}/day). Try again tomorrow or practice existing phrases below.`);
  }
  return used;
}

async function saveToPool(userId, analysis, isPrivate, topic) {
  const row = {
    user_id: userId,
    phrase: analysis.phrase,
    ipa: analysis.ipa || "",
    syllables: analysis.syllables || "",
    note: analysis.note || "",
    tokens: analysis.tokens || [],
    private: isPrivate,
    topic: topic || null,
  };

  const { data: saved, error } = await supabase
    .from("free_shadow_content")
    .insert(row)
    .select()
    .single();

  if (error) console.error("save free shadow:", error);
  return saved || { ...row, id: Date.now() };
}

export async function generatePhrase(userId, phrase, isPrivate = false) {
  await checkLimit(userId);
  const analysis = await analyzePhrase(phrase.trim());
  return saveToPool(userId, analysis, isPrivate, null);
}

// ─── Generate from topic ─────────────────────────────────────────────────────

export async function generateFromTopic(userId, topic, isPrivate = false) {
  await checkLimit(userId);
  const analysis = await generateTopicPhrase(topic.trim());
  return saveToPool(userId, analysis, isPrivate, topic.trim());
}

// ─── Browse pool (infinite scroll) ───────────────────────────────────────────

export async function fetchPhrasePool(userId, page = 0) {
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  // Explicit filter: public phrases + user's own private phrases
  const { data, error } = await supabase
    .from("free_shadow_content")
    .select("*")
    .or(`private.eq.false,user_id.eq.${userId}`)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("fetchPhrasePool:", error);
    // Fallback: try public-only query if the combined query fails
    const { data: pub } = await supabase
      .from("free_shadow_content")
      .select("*")
      .eq("private", false)
      .order("created_at", { ascending: false })
      .range(from, to);
    return { items: pub || [], hasMore: (pub?.length || 0) === PAGE_SIZE };
  }
  return { items: data || [], hasMore: (data?.length || 0) === PAGE_SIZE };
}
