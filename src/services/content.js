import { supabase } from "./supabase";
import { cacheGet, cacheSet, cacheClear } from "./cache";
import { fetchFromAPI } from "./api";

// ─── Helpers ────────────────────────────────────────────────────────────────

function todayStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

async function markSeen(userId, contentId) {
  await supabase.from("user_content_seen").insert({
    user_id: userId,
    content_id: contentId,
  });
}

async function saveToPool(lessonId, content, userId) {
  const { data, error } = await supabase
    .from("lesson_content")
    .insert({ lesson_id: lessonId, content, created_by: userId })
    .select("id")
    .single();
  if (error) throw new Error(`Failed to save content: ${error.message}`);
  return data.id;
}

async function fetchUnseenContent(lessonId, userId) {
  // Get IDs user has already seen
  const { data: seen } = await supabase
    .from("user_content_seen")
    .select("content_id")
    .eq("user_id", userId);

  const seenIds = (seen || []).map(r => r.content_id);

  // Query lesson_content for this lesson, excluding seen ones
  let query = supabase
    .from("lesson_content")
    .select("id, content")
    .eq("lesson_id", lessonId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (seenIds.length > 0) {
    query = query.not("id", "in", `(${seenIds.join(",")})`);
  }

  const { data } = await query;
  return data?.[0] || null;
}

async function fetchPublicContent(lessonId) {
  try {
    const { data } = await supabase
      .from("lesson_content")
      .select("content")
      .eq("lesson_id", lessonId)
      .order("created_at", { ascending: false })
      .limit(1);
    return data?.[0]?.content || null;
  } catch {
    return null;
  }
}

async function hasGeneratedToday(lessonId, userId) {
  const { data } = await supabase
    .from("lesson_content")
    .select("id")
    .eq("lesson_id", lessonId)
    .eq("created_by", userId)
    .gte("created_at", todayStart())
    .limit(1);
  return (data?.length ?? 0) > 0;
}

// ─── Main entry point ───────────────────────────────────────────────────────

export async function getContent(lessonDef, { user, force = false } = {}) {
  const lessonId = lessonDef.id;

  // Not logged in — fetch from shared pool, never call AI
  if (!user) {
    const cached = cacheGet(lessonId);
    if (cached) return cached;
    const poolContent = await fetchPublicContent(lessonId);
    if (poolContent) {
      cacheSet(lessonId, poolContent);
      return poolContent;
    }
    throw new Error("No content available yet. Sign in to generate content.");
  }

  // Force mode: clear local cache first
  if (force) {
    cacheClear(lessonId);
  }

  // Step 1: Check localStorage cache (skip if force)
  if (!force) {
    const cached = cacheGet(lessonId);
    if (cached) return cached;
  }

  // Step 2: Look for unseen shared content
  const unseen = await fetchUnseenContent(lessonId, user.id);
  if (unseen) {
    await markSeen(user.id, unseen.id);
    cacheSet(lessonId, unseen.content);
    return unseen.content;
  }

  // Step 3: Check daily generation limit — if hit, fall back to any existing content
  if (await hasGeneratedToday(lessonId, user.id)) {
    const fallback = await fetchPublicContent(lessonId);
    if (fallback) {
      cacheSet(lessonId, fallback);
      return fallback;
    }
  }

  // Step 4: Generate via AI, save to pool, mark seen, cache
  const content = await fetchFromAPI(lessonDef);
  const contentId = await saveToPool(lessonId, content, user.id);
  await markSeen(user.id, contentId);
  cacheSet(lessonId, content);
  return content;
}
