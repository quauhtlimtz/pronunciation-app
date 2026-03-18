import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../services/supabase";
import { signInWithGoogle, signOut, loadProgress, saveProgress, logActivity, ensureProfile } from "../services/supabase";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = loading, null = not logged in
  const [progress, setProgress] = useState({});

  useEffect(() => {
    let settled = false;

    // Safety timeout: never hang on "Loading…" forever (covers lock + network issues)
    const timeout = setTimeout(() => {
      if (!settled) { settled = true; setUser(null); }
    }, 8000);

    // 1. Check current session (also processes OAuth redirect hash)
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (settled) return; // timeout already fired
      settled = true;
      clearTimeout(timeout);
      const u = session?.user ?? null;
      if (u) {
        await ensureProfile(u);
        const prog = await loadProgress(u.id);
        setProgress(prog);
        logActivity(u.id, "login");
      }
      setUser(u); // Set user LAST so progress is ready when loading ends
    }).catch(() => {
      if (!settled) { settled = true; clearTimeout(timeout); setUser(null); }
    });

    // 2. Listen for future auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const u = session?.user ?? null;
      if (u && (event === "SIGNED_IN" || event === "TOKEN_REFRESHED")) {
        await ensureProfile(u);
        const prog = await loadProgress(u.id);
        setProgress(prog);
        if (event === "SIGNED_IN") logActivity(u.id, "login");
      }
      if (event === "SIGNED_OUT") {
        setProgress({});
      }
      setUser(u);
    });

    return () => { subscription.unsubscribe(); clearTimeout(timeout); };
  }, []);

  async function completeLesson(lessonId, score) {
    if (!user) return;
    const existing = progress[lessonId];
    const data = {
      completed: true,
      score,
      attempts: (existing?.attempts ?? 0) + 1,
    };
    await saveProgress(user.id, lessonId, data);
    await logActivity(user.id, "complete_lesson", { lessonId, score });
    setProgress(p => ({ ...p, [lessonId]: { ...existing, ...data, lesson_id: lessonId } }));
  }

  async function saveShadowingPhrase(lessonId, phraseIndex, totalPhrases) {
    if (!user) return;
    const existing = progress[lessonId];
    const done = [...new Set([...(existing?.shadowing_done || []), phraseIndex])];
    const allDone = done.length >= totalPhrases;
    const data = {
      shadowing_done: done,
      completed: allDone || existing?.completed || false,
      score: existing?.score ?? null,
      attempts: existing?.attempts ?? 0,
    };
    if (allDone && !existing?.completed) data.attempts += 1;
    await saveProgress(user.id, lessonId, data);
    if (allDone && !existing?.completed) {
      await logActivity(user.id, "complete_lesson", { lessonId, via: "shadowing" });
    }
    setProgress(p => ({ ...p, [lessonId]: { ...existing, ...data, lesson_id: lessonId } }));
  }

  async function savePracticeAnswer(lessonId, exerciseKey, totalExercises) {
    if (!user) return;
    const existing = progress[lessonId];
    const done = [...new Set([...(existing?.practice_done || []), exerciseKey])];
    const allDone = done.length >= totalExercises;
    const data = {
      practice_done: done,
      completed: allDone || existing?.completed || false,
      score: existing?.score ?? null,
      attempts: existing?.attempts ?? 0,
    };
    if (allDone && !existing?.completed) data.attempts += 1;
    await saveProgress(user.id, lessonId, data);
    if (allDone && !existing?.completed) {
      await logActivity(user.id, "complete_lesson", { lessonId, via: "practice" });
    }
    setProgress(p => ({ ...p, [lessonId]: { ...existing, ...data, lesson_id: lessonId } }));
  }

  async function trackActivity(action, details = {}) {
    if (!user) return;
    await logActivity(user.id, action, details);
  }

  const isAdmin = user?.email === "quauhtli.martinez@gmail.com";

  return (
    <AuthCtx.Provider value={{
      user,
      loading: user === undefined,
      progress,
      isAdmin,
      signIn: signInWithGoogle,
      signOut,
      completeLesson,
      savePracticeAnswer,
      saveShadowingPhrase,
      trackActivity,
    }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  return useContext(AuthCtx);
}
