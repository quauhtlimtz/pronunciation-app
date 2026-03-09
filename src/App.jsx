import { useState, useEffect, useCallback } from "react";
import { LESSON_DEFS } from "./data/lessons";
import { ThemeToggle } from "./components/ThemeToggle";
import { LessonView } from "./components/LessonView";
import { AdminPanel } from "./components/AdminPanel";
import { IconCheck, IconArrow } from "./components/Icons";
import { AnatomyDiagram } from "./components/AnatomyDiagram";
import { FreeShadow } from "./components/FreeShadow";
import { ConsonantChart } from "./components/ConsonantChart";
import { Footer } from "./components/Footer";
import { useAuth } from "./components/AuthContext";
import { TestRecorder } from "./TestRecorder";

function getParams() {
  const p = new URLSearchParams(window.location.search);
  return { lesson: p.get("lesson"), tab: p.get("tab"), admin: p.has("admin"), anatomy: p.has("anatomy"), shadow: p.has("shadow"), chart: p.has("chart"), test: p.has("test") };
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
  const { user, loading: authLoading, progress, isAdmin, signIn, signOut, completeLesson, saveShadowingPhrase, trackActivity } = useAuth();

  const initial = getParams();
  const initialLesson = LESSON_DEFS.find(l => l.id === initial.lesson);

  const [active, setActive]         = useState(initialLesson || null);
  const [currentTab, setCurrentTab] = useState(initial.tab || "theory");
  const [showAdmin, setShowAdmin]   = useState(initial.admin && isAdmin);
  const [showAnatomy, setShowAnatomy] = useState(initial.anatomy);
  const [showShadow, setShowShadow] = useState(initial.shadow);
  const [showChart, setShowChart]   = useState(initial.chart);
  const [dark, setDark]             = useState(null);

  // Build completed map from Supabase progress
  const completed = {};
  Object.entries(progress).forEach(([lessonId, p]) => {
    if (p.completed) completed[lessonId] = true;
  });

  // Sync URL on back/forward
  useEffect(() => {
    const onPop = () => {
      const { lesson, tab, admin, anatomy, shadow, chart } = getParams();
      const def = LESSON_DEFS.find(l => l.id === lesson);
      setActive(def || null);
      setCurrentTab(tab || "theory");
      setShowAdmin(admin && isAdmin);
      setShowAnatomy(anatomy);
      setShowShadow(shadow);
      setShowChart(chart);
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
    setShowAnatomy(false);
    setShowShadow(false);
    setShowChart(false);
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

  // Test recorder page
  if (initial.test) {
    return <TestRecorder />;
  }

  // Admin panel
  if (showAdmin && isAdmin) {
    return <AdminPanel onBack={goHome} />;
  }

  // Anatomy diagram
  if (showAnatomy) {
    return (
      <AnatomyDiagram
        onBack={goHome}
        darkToggle={<ThemeToggle dark={dark} setDark={setDark} />}
        dark={dark}
      />
    );
  }

  // Free shadow
  if (showShadow) {
    return (
      <FreeShadow
        onBack={goHome}
        darkToggle={<ThemeToggle dark={dark} setDark={setDark} />}
      />
    );
  }

  // Consonant chart
  if (showChart) {
    return (
      <ConsonantChart
        onBack={goHome}
        darkToggle={<ThemeToggle dark={dark} setDark={setDark} />}
      />
    );
  }

  // Lesson view
  if (active) {
    return (
      <LessonView
        def={active}
        onBack={goHome}
        completed={completed[active.id]}
        progress={progress[active.id]}
        onComplete={() => completeLesson(active.id, null)}
        onShadowingPhrase={(idx, total) => saveShadowingPhrase(active.id, idx, total)}
        darkToggle={<ThemeToggle dark={dark} setDark={setDark} />}
        user={user}
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
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <img src="/favicon.svg" alt="" className="w-9 h-9 shrink-0" />
            <div>
              <h1 className="text-xl font-normal tracking-tight leading-tight">Pro<span className="text-gray-400 dark:text-gray-400">ˈ</span>nunce</h1>
              <p className="font-mono text-sm text-gray-400 dark:text-gray-500 mt-0.5">
                <span className="hidden sm:inline">IPA · Syllables · Shadowing · </span>{done}/{LESSON_DEFS.length} complete
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <ThemeToggle dark={dark} setDark={setDark} />
          </div>
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
            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
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
            <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
              {isAdmin && (
                <button className="btn btn-default btn-sm" onClick={() => { setShowAdmin(true); window.history.pushState(null, "", "?admin"); }}>
                  Admin
                </button>
              )}
              <button className="btn btn-ghost btn-sm" onClick={() => signOut().catch(console.error)}>Sign out</button>
            </div>
          </div>
        ) : (
          <div className="card mb-6 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1">
              <p className="text-sm">Sign in to save progress and get fresh AI-generated content</p>
            </div>
            <button className="btn btn-primary btn-sm shrink-0" onClick={signIn}>Sign in with Google</button>
          </div>
        )}

        {/* Tools */}
        <div className="mb-7">
          <p className="font-mono text-sm text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2.5">Tools</p>
          <div className="flex flex-col">
            <div
              className="border-b border-gray-100 dark:border-gray-800 px-4 py-3.5 cursor-pointer flex items-center gap-3.5 hover:bg-white dark:hover:bg-gray-900 active:bg-white dark:active:bg-gray-900 transition-colors"
              onClick={() => { setShowShadow(true); window.history.pushState(null, "", "?shadow"); }}
            >
              <div className="flex-1 min-w-0">
                <span className="text-sm">Free Shadow</span>
                <p className="font-mono text-sm text-gray-500 mt-1">Type any phrase · listen · shadow · compare</p>
              </div>
              <span className="text-gray-400 shrink-0"><IconArrow size="sm" /></span>
            </div>
            <div
              className="border-b border-gray-100 dark:border-gray-800 px-4 py-3.5 cursor-pointer flex items-center gap-3.5 hover:bg-white dark:hover:bg-gray-900 active:bg-white dark:active:bg-gray-900 transition-colors"
              onClick={() => { setShowAnatomy(true); window.history.pushState(null, "", "?anatomy"); }}
            >
              <div className="flex-1 min-w-0">
                <span className="text-sm">Vocal Tract Anatomy</span>
                <p className="font-mono text-sm text-gray-500 mt-1">Interactive diagram · sounds by place of articulation</p>
              </div>
              <span className="text-gray-400 shrink-0"><IconArrow size="sm" /></span>
            </div>
            <div
              className="border-b border-gray-100 dark:border-gray-800 px-4 py-3.5 cursor-pointer flex items-center gap-3.5 hover:bg-white dark:hover:bg-gray-900 active:bg-white dark:active:bg-gray-900 transition-colors"
              onClick={() => { setShowChart(true); window.history.pushState(null, "", "?chart"); }}
            >
              <div className="flex-1 min-w-0">
                <span className="text-sm">Consonant Chart</span>
                <p className="font-mono text-sm text-gray-500 mt-1">24 sounds · placement × manner · tap to hear</p>
              </div>
              <span className="text-gray-400 shrink-0"><IconArrow size="sm" /></span>
            </div>
          </div>
        </div>

        {sessions.map(session => (
          <div key={session} className="mb-7">
            <p className="font-mono text-sm text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2.5">{session}</p>
            <div className="flex flex-col">
              {LESSON_DEFS.filter(l => l.session === session).map(lesson => {
                const isDone = completed[lesson.id];
                return (
                  <div key={lesson.id}
                    className="border-b border-gray-100 dark:border-gray-800 px-4 py-3.5 cursor-pointer flex items-center gap-3.5 hover:bg-white dark:hover:bg-gray-900 active:bg-white dark:active:bg-gray-900 transition-colors"
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

        {/* about */}
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-6 mb-1 leading-relaxed">
          I built this for myself to practice and organize my class notes. More lessons coming as the course continues.
        </p>
        <p className="font-mono text-xs text-gray-300 dark:text-gray-600">
          Next · Stress · Intonation · Vowels · Reduced Speech
        </p>

        <Footer />
      </div>
    </div>
  );
}
