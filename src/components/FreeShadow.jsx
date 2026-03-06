import { useState, useRef, useCallback, useEffect } from "react";
import { ShadowCard } from "./ShadowCard";
import { StressLegend } from "./PhraseAnnotation";
import { MicBar } from "./MicBar";
import { IconBack, IconArrow, IconRefresh } from "./Icons";
import { useAuth } from "./AuthContext";
import {
  generatePhrase,
  generateFromTopic,
  fetchPhrasePool,
  getGenerationsToday,
  getDailyLimit,
} from "../services/freeShadow";

// ─── Pool card (collapsed, expandable to ShadowCard) ─────────────────────────

function PoolItem({ item, micStreamRef, expanded, onToggle }) {
  return (
    <div className="card mb-2.5">
      <button
        className="w-full text-left px-4 py-3 flex items-start gap-3 cursor-pointer bg-transparent border-none"
        onClick={onToggle}
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm leading-relaxed">{item.phrase}</p>
          {item.topic && (
            <p className="font-mono text-xs text-gray-400 dark:text-gray-500 mt-1">topic: {item.topic}</p>
          )}
        </div>
        <span className={`text-gray-400 shrink-0 transition-transform ${expanded ? "rotate-90" : ""}`}>
          <IconArrow size="sm" />
        </span>
      </button>
      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-800">
          <div className="px-4 pt-2 pb-1">
            <StressLegend />
          </div>
          <ShadowCard
            phrase={item.phrase}
            ipa={item.ipa}
            syllables={item.syllables}
            note={item.note}
            tokens={item.tokens}
            micStreamRef={micStreamRef}
          />
        </div>
      )}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function FreeShadow({ onBack, darkToggle }) {
  const { user } = useAuth();
  const [mode, setMode] = useState("phrase"); // "phrase" or "topic"
  const [input, setInput] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [usedToday, setUsedToday] = useState(null);
  const dailyLimit = getDailyLimit();

  // Active generated result (shown at top)
  const [active, setActive] = useState(null);

  // Pool (infinite scroll)
  const [pool, setPool] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingPool, setLoadingPool] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  // Mic
  const [micDeviceId, setMicDeviceId] = useState("");
  const micStreamRef = useRef(null);

  const handleStreamReady = useCallback((stream) => {
    if (micStreamRef.current && micStreamRef.current !== stream) {
      micStreamRef.current.getTracks().forEach(t => t.stop());
    }
    micStreamRef.current = stream;
  }, []);

  // Load daily usage + first page of pool
  useEffect(() => {
    if (!user) return;
    getGenerationsToday(user.id).then(setUsedToday);
    loadPool(0);
  }, [user]);

  async function loadPool(p) {
    if (!user) return;
    setLoadingPool(true);
    try {
      const { items, hasMore: more } = await fetchPhrasePool(user.id, p);
      setPool(prev => p === 0 ? items : [...prev, ...items]);
      setHasMore(more);
      setPage(p);
    } catch (e) {
      console.error("loadPool:", e);
    } finally { setLoadingPool(false); }
  }

  const canGenerate = user && usedToday !== null && usedToday < dailyLimit;

  const generate = async () => {
    if (!user || !input.trim()) return;
    setGenerating(true);
    setError(null);
    setActive(null);
    try {
      let result;
      if (mode === "topic") {
        result = await generateFromTopic(user.id, input, isPrivate);
      } else {
        result = await generatePhrase(user.id, input, isPrivate);
      }
      setActive(result);
      setUsedToday(u => (u ?? 0) + 1);
      setInput("");
      // Prepend to pool
      setPool(prev => [result, ...prev]);
    } catch (e) {
      setError(e.message || "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  // Load public pool for non-logged-in users too
  useEffect(() => {
    if (user) return; // handled by the other useEffect
    loadPoolPublic(0);
  }, [user]);

  async function loadPoolPublic(p) {
    setLoadingPool(true);
    try {
      const { supabase } = await import("../services/supabase");
      const from = p * 20;
      const to = from + 19;
      const { data, count } = await supabase
        .from("free_shadow_content")
        .select("*", { count: "exact" })
        .eq("private", false)
        .order("created_at", { ascending: false })
        .range(from, to);
      setPool(prev => p === 0 ? (data || []) : [...prev, ...(data || [])]);
      setHasMore((data?.length || 0) === 20);
      setPage(p);
    } catch (e) {
      console.error("loadPoolPublic:", e);
    } finally { setLoadingPool(false); }
  }

  return (
    <div className="min-h-dvh bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col">
      <div className="sticky top-0 z-50 bg-gray-50 dark:bg-gray-950">
        <div className="border-b border-gray-100 dark:border-gray-800 px-3 sm:px-4 py-2.5 sm:py-3">
          <div className="flex items-center gap-2">
            <button className="p-2 rounded cursor-pointer text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 active:opacity-50 transition-colors" onClick={onBack}>
              <IconBack size="md" />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-sm sm:text-base truncate">Free Shadow</p>
              {usedToday !== null && (
                <p className="font-mono text-xs text-gray-400 dark:text-gray-500">
                  {dailyLimit - usedToday} generation{dailyLimit - usedToday !== 1 ? "s" : ""} left today
                </p>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {darkToggle}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[40rem] mx-auto px-4 pt-5 pb-14 flex-1 w-full">
        {/* Generation UI — logged-in users only */}
        {user ? (
          <>
            {/* Mode toggle */}
            <div className="flex gap-1 mb-3">
              <button
                className={`flex-1 py-1.5 text-sm font-mono rounded-md border-none cursor-pointer transition-colors
                  ${mode === "phrase" ? "bg-gray-900 dark:bg-gray-100 text-white dark:text-black" : "bg-gray-100 dark:bg-gray-800 text-gray-500"}`}
                onClick={() => setMode("phrase")}
              >
                Custom phrase
              </button>
              <button
                className={`flex-1 py-1.5 text-sm font-mono rounded-md border-none cursor-pointer transition-colors
                  ${mode === "topic" ? "bg-gray-900 dark:bg-gray-100 text-white dark:text-black" : "bg-gray-100 dark:bg-gray-800 text-gray-500"}`}
                onClick={() => setMode("topic")}
              >
                Random from topic
              </button>
            </div>

            {/* Input */}
            <div className="flex gap-2 mb-3">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); generate(); } }}
                placeholder={mode === "phrase" ? "Type any English phrase…" : "Type a topic (e.g. cooking, travel, job interviews)…"}
                maxLength={250}
                rows={mode === "topic" ? 1 : 2}
                className="flex-1 px-3 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:border-gray-400 dark:focus:border-gray-500 resize-none"
                disabled={generating || !canGenerate}
              />
              <button className="btn btn-primary btn-sm gap-1 self-end" onClick={generate} disabled={!input.trim() || generating || !canGenerate}>
                {generating ? "…" : mode === "topic" ? <><IconRefresh size="sm" /> Generate</> : <>Go <IconArrow size="sm" /></>}
              </button>
            </div>

            {/* Private toggle */}
            <label className="flex items-center gap-2 mb-4 cursor-pointer">
              <input type="checkbox" checked={isPrivate} onChange={e => setIsPrivate(e.target.checked)}
                className="w-4 h-4 accent-gray-600 cursor-pointer" />
              <span className="text-xs text-gray-500">Don't share with others</span>
            </label>

            {error && (
              <p className="text-sm text-amber-700 dark:text-amber-500 mb-4">{error}</p>
            )}

            {generating && (
              <div className="flex items-center justify-center gap-1.5 py-8">
                {[0,1,2].map(i => (
                  <div key={i} className="loading-dot"
                    style={{ animation: `pulse-dot 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                ))}
              </div>
            )}

            {/* Active result */}
            {active && !generating && (
              <div className="mb-6">
                <p className="font-mono text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Just generated</p>
                <StressLegend />
                <ShadowCard
                  key={active.id}
                  phrase={active.phrase}
                  ipa={active.ipa}
                  syllables={active.syllables}
                  note={active.note}
                  tokens={active.tokens}
                  micStreamRef={micStreamRef}
                />
              </div>
            )}
          </>
        ) : (
          <div className="card mb-4 p-4 text-center">
            <p className="text-sm text-gray-500">Sign in to generate your own phrases. Browse and practice public phrases below.</p>
          </div>
        )}

        {/* Pool */}
        {pool.length > 0 && (
          <div>
            <p className="font-mono text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
              Practice pool
            </p>
            {pool.map(item => (
              <PoolItem
                key={item.id}
                item={item}
                micStreamRef={micStreamRef}
                expanded={expandedId === item.id}
                onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
              />
            ))}
            {hasMore && (
              <button
                className="btn btn-default btn-sm w-full mt-2"
                onClick={() => user ? loadPool(page + 1) : loadPoolPublic(page + 1)}
                disabled={loadingPool}
              >
                {loadingPool ? "Loading…" : "Load more"}
              </button>
            )}
          </div>
        )}

        {!generating && pool.length === 0 && !active && (
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">
            {user ? "No phrases yet. Generate your first one above!" : "No public phrases available yet."}
          </p>
        )}
      </div>

      <MicBar
        visible={true}
        deviceId={micDeviceId}
        onChange={setMicDeviceId}
        onStreamReady={handleStreamReady}
      />
    </div>
  );
}
