import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    // Reduce lock timeout from 5s default — React StrictMode double-mounts
    // cause orphaned locks; shorter timeout means faster recovery
    lockAcquireTimeout: 2000,
  },
});

// ─── Auth ────────────────────────────────────────────────────────────────────

export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin },
  });
  if (error) throw error;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export function onAuthChange(callback) {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });
}

export async function getUser() {
  // getSession() processes the URL hash tokens from OAuth redirect
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user ?? null;
}

// ─── Profile ────────────────────────────────────────────────────────────────

export async function ensureProfile(user) {
  const { data } = await supabase.from("profiles").select("id").eq("id", user.id).single();
  if (data) {
    // Update last_seen
    await supabase.from("profiles").update({ last_seen: new Date().toISOString() }).eq("id", user.id);
    return;
  }
  // Create profile
  const { error } = await supabase.from("profiles").insert({
    id: user.id,
    email: user.email || "",
    name: user.user_metadata?.full_name || user.user_metadata?.name || "",
    avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || "",
    last_seen: new Date().toISOString(),
    created_at: new Date().toISOString(),
  });
  if (error) console.error("ensureProfile:", error);
}

// ─── User progress ──────────────────────────────────────────────────────────

export async function saveProgress(userId, lessonId, data) {
  const row = {
    user_id: userId,
    lesson_id: lessonId,
    completed: data.completed || false,
    score: data.score ?? null,
    attempts: data.attempts ?? 1,
    updated_at: new Date().toISOString(),
  };
  if (data.shadowing_done !== undefined) row.shadowing_done = data.shadowing_done;
  if (data.practice_done !== undefined) row.practice_done = data.practice_done;
  const { error } = await supabase.from("progress").upsert(row, { onConflict: "user_id,lesson_id" });
  if (error) console.error("saveProgress:", error);
}

export async function loadProgress(userId) {
  const { data, error } = await supabase
    .from("progress")
    .select("*")
    .eq("user_id", userId);
  if (error) { console.error("loadProgress:", error); return {}; }
  const map = {};
  data.forEach(r => { map[r.lesson_id] = r; });
  return map;
}

// ─── Activity log ───────────────────────────────────────────────────────────

export async function logActivity(userId, action, details = {}) {
  const { error } = await supabase.from("activity").insert({
    user_id: userId,
    action,
    details,
    created_at: new Date().toISOString(),
  });
  if (error) console.error("logActivity:", error);
}

// ─── Admin queries ──────────────────────────────────────────────────────────

export async function getAdminStats() {
  const [users, progress, activity] = await Promise.all([
    supabase.from("profiles").select("*").order("last_seen", { ascending: false }),
    supabase.from("progress").select("*"),
    supabase.from("activity").select("*").order("created_at", { ascending: false }).limit(100),
  ]);
  return {
    users: users.data || [],
    progress: progress.data || [],
    activity: activity.data || [],
  };
}
