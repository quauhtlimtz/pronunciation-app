import { useState, useEffect, useCallback } from "react";
import { LESSON_DEFS } from "./data/lessons";
import { ThemeToggle } from "./components/ThemeToggle";
import { LessonView } from "./components/LessonView";
import { AdminPanel } from "./components/AdminPanel";
import { IconCheck, IconArrow } from "./components/Icons";
import { Footer } from "./components/Footer";
import { useAuth } from "./components/AuthContext";

function getParams() {
  const p = new URLSearchParams(window.location.search);
  return { lesson: p.get("lesson"), tab: p.get("tab"), admin: p.has("admin") };
}

function setParams(lesson, tab) {
  const p = new URLSearchParams();
  if (lesson) p.set("lesson", lesson);
  if (tab) p.set("tab", tab);
  const qs = p.toString();
  const url = qs ? `?${qs}` : window.location.pathname;
  window.history.pushState(null, "", url);
}

export default function App() {
  const { user, loading: authLoading, progress, isAdmin, signIn, signOut, completeLesson, trackActivity } = useAuth();

  const initial = getParams();
  const initialLesson = LESSON_DEFS.find(l => l.id === initial.lesson);

  const [active, setActive]         = useState(initialLesson || null);
  const [currentTab, setCurrentTab] = useState(initial.tab || "theory");
  const [showAdmin, setShowAdmin]   = useState(initial.admin && isAdmin);
  const [dark, setDark]             = useState(null);

  // Build completed map from Supabase progress
  const completed = {};
  Object.entries(progress).forEach(([lessonId, p]) => {
    if (p.completed) completed[lessonId] = true;
  });

  // Sync URL on back/forward
  useEffect(() => {
    const onPop = () => {
      const { lesson, tab, admin } = getParams();
      const def = LESSON_DEFS.find(l => l.id === lesson);
      setActive(def || null);
      setCurrentTab(tab || "theory");
      setShowAdmin(admin && isAdmin);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [isAdmin]);

  const openLesson = useCallback((lesson) => {
    setActive(lesson);
    setCurrentTab("theory");
    setParams(lesson.id, "theory");
    trackActivity("open_lesson", { lessonId: lesson.id });
  }, [trackActivity]);

  const goHome = useCallback(() => {
    setActive(null);
    setShowAdmin(false);
    setCurrentTab("theory");
    setParams(null, null);
  }, []);

  const onTabChange = useCallback((tab) => {
    setCurrentTab(tab);
    if (active) setParams(active.id, tab);
  }, [active]);

  // Dark mode
  useEffect(() => {
    const el = document.documentElement;
    if (dark === true) { el.classList.add("dark"); }
    else if (dark === false) { el.classList.remove("dark"); }
    else {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const apply = () => mq.matches ? el.classList.add("dark") : el.classList.remove("dark");
      apply();
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    }
  }, [dark]);

  // Auth loading
  if (authLoading) {
    return (
      <div className="min-h-dvh bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <p className="text-sm text-gray-500">Loading…</p>
      </div>
    );
  }

  // Admin panel
  if (showAdmin && isAdmin) {
    return <AdminPanel onBack={goHome} />;
  }

  // Lesson view
  if (active) {
    return (
      <LessonView
        def={active}
        onBack={goHome}
        completed={completed[active.id]}
        onComplete={() => completeLesson(active.id, null)}
        darkToggle={<ThemeToggle dark={dark} setDark={setDark} />}
        tab={currentTab}
        onTabChange={onTabChange}
      />
    );
  }

  // Home
  const sessions = [...new Set(LESSON_DEFS.map(l => l.session))];
  const done = Object.keys(completed).length;

  return (
    <div className="min-h-dvh bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col">
      {/* header */}
      <div className="px-4 pt-5 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-normal tracking-tight leading-tight">
              American English Pronunciation
            </h1>
            <p className="font-mono text-sm text-gray-400 dark:text-gray-500 mt-2">
              IPA · Syllables · Shadowing · AI-generated · {done}/{LESSON_DEFS.length} complete
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <ThemeToggle dark={dark} setDark={setDark} />
          </div>
        </div>
        <div className="h-0.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mt-3">
          <div className="h-full bg-gray-900 dark:bg-gray-100 rounded-full transition-all duration-400"
            style={{ width: `${(done / LESSON_DEFS.length) * 100}%` }} />
        </div>
      </div>

      {/* list */}
      <div className="max-w-[40rem] mx-auto px-4 pt-5 pb-safe flex-1 flex flex-col">
        {/* user section */}
        {user ? (
          <div className="card mb-6 p-4">
            <div className="flex items-center gap-3">
              {user.user_metadata?.avatar_url && (
                <img src={user.user_metadata.avatar_url} className="w-12 h-12 rounded-full" alt="" referrerPolicy="no-referrer" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold truncate">{user.user_metadata?.full_name || user.email}</p>
                <p className="font-mono text-sm text-gray-500 truncate">{user.email}</p>
              </div>
            </div>

            {/* progress summary */}
            <div className="grid grid-cols-3 gap-2 mt-4">
              <div className="text-center">
                <div className="text-xl font-semibold">{done}</div>
                <p className="font-mono text-sm text-gray-500">completed</p>
              </div>
              <div className="text-center">
                <div className="text-xl font-semibold">{LESSON_DEFS.length - done}</div>
                <p className="font-mono text-sm text-gray-500">remaining</p>
              </div>
              <div className="text-center">
                <div className="text-xl font-semibold">{LESSON_DEFS.length > 0 ? Math.round((done / LESSON_DEFS.length) * 100) : 0}%</div>
                <p className="font-mono text-sm text-gray-500">progress</p>
              </div>
            </div>

            {/* per-lesson progress */}
            <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="flex flex-wrap gap-1.5">
                {LESSON_DEFS.map(l => (
                  <span key={l.id} className={`font-mono text-sm px-2 py-0.5 rounded
                    ${completed[l.id]
                      ? "bg-gray-900 dark:bg-gray-100 text-white dark:text-black"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500"}`}>
                    {completed[l.id] && <IconCheck size="sm" />} {l.title}
                  </span>
                ))}
              </div>
            </div>

            {/* actions */}
            <div className="flex gap-2 mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
              {isAdmin && (
                <button className="btn btn-default btn-sm" onClick={() => { setShowAdmin(true); window.history.pushState(null, "", "?admin"); }}>
                  Admin
                </button>
              )}
              <button className="btn btn-ghost btn-sm" onClick={signOut}>Sign out</button>
            </div>
          </div>
        ) : (
          <div className="card mb-6 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1">
              <p className="text-sm">Sign in to save your progress across devices</p>
            </div>
            <button className="btn btn-primary btn-sm shrink-0" onClick={signIn}>Sign in with Google</button>
          </div>
        )}

        {sessions.map(session => (
          <div key={session} className="mb-7">
            <p className="font-mono text-sm text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2.5">{session}</p>
            <div className="flex flex-col">
              {LESSON_DEFS.filter(l => l.session === session).map(lesson => {
                const isDone = completed[lesson.id];
                return (
                  <div key={lesson.id}
                    className="border-b border-gray-200 dark:border-gray-700 px-4 py-3.5 cursor-pointer flex items-center gap-3.5 hover:bg-white dark:hover:bg-gray-900 active:bg-white dark:active:bg-gray-900 transition-colors"
                    onClick={() => openLesson(lesson)}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{lesson.title}</span>
                        {isDone && <span className="text-gray-400"><IconCheck size="sm" /></span>}
                      </div>
                      <p className="font-mono text-sm text-gray-500 mt-1">
                        {lesson.subtitle}
                      </p>
                    </div>
                    <span className="text-gray-400 shrink-0"><IconArrow size="sm" /></span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* coming soon */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-5 mb-10">
          <p className="font-mono text-sm text-gray-400 dark:text-gray-500 leading-loose">
            More lessons coming as I share my notes<br />
            <span className="text-gray-300 dark:text-gray-600">· Stress · Intonation · Vowels · Reduced Speech ·</span>
          </p>
        </div>

        <Footer />
      </div>
    </div>
  );
}
