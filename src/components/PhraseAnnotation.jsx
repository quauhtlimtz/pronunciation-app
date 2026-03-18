import { useState, useCallback, useMemo } from "react";
import { speak, stopSpeak } from "../services/tts";
import { IconPlay, IconClose } from "./Icons";

// Split full IPA string into per-word chunks aligned to tokens
function splitIpa(ipa, tokens) {
  if (!ipa || !tokens?.length) return [];
  // Split IPA by whitespace, stripping leading stress marks for matching
  const ipaParts = ipa.replace(/^[ˈˌ'']+/, "").split(/\s+/);
  // If counts match, direct map
  if (ipaParts.length === tokens.length) return ipaParts;
  // If more IPA parts than tokens, try to merge extras
  // If fewer, pad with empty strings
  const result = [];
  let ipaIdx = 0;
  for (let i = 0; i < tokens.length; i++) {
    if (ipaIdx < ipaParts.length) {
      result.push(ipaParts[ipaIdx]);
      ipaIdx++;
    } else {
      result.push("");
    }
  }
  return result;
}

export function PhraseAnnotation({ tokens, activeWordIndex = -1, ipa, showIpa = false }) {
  if (!tokens || tokens.length === 0) return null;

  const [selStart, setSelStart] = useState(null);
  const [selEnd, setSelEnd] = useState(null);
  const [playing, setPlaying] = useState(false);

  const ipaWords = useMemo(() => showIpa ? splitIpa(ipa, tokens) : [], [ipa, tokens, showIpa]);

  const speakRange = useCallback((from, to) => {
    stopSpeak();
    const text = tokens.slice(from, to + 1).map(t => t.t).join(" ");
    setPlaying(true);
    speak(text, () => setPlaying(false), () => {});
  }, [tokens]);

  const handleTap = useCallback((i) => {
    if (selStart === null) {
      setSelStart(i);
      setSelEnd(i);
      speakRange(i, i);
    } else if (selStart === i && selEnd === i) {
      stopSpeak();
      setPlaying(false);
      setSelStart(null);
      setSelEnd(null);
    } else {
      const from = Math.min(selStart, i);
      const to = Math.max(selStart, i);
      setSelStart(from);
      setSelEnd(to);
      speakRange(from, to);
    }
  }, [selStart, selEnd, speakRange]);

  const clearSelection = useCallback(() => {
    stopSpeak();
    setPlaying(false);
    setSelStart(null);
    setSelEnd(null);
  }, []);

  const stressStyle = [
    "text-gray-400 dark:text-gray-500 text-sm",                                // 0 unstressed
    "text-amber-700 dark:text-amber-400 text-base",                            // 1 secondary
    "text-amber-800 dark:text-amber-400 text-lg font-semibold",                // 2 primary
  ];

  const stressDot = [
    null,
    <span className="inline-block w-1.5 h-1.5 rounded-full border-2 border-amber-600 dark:border-amber-400 mr-0.5 align-middle" />,
    <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-700 dark:bg-amber-400 mr-0.5 align-middle" />,
  ];

  const hasSelection = selStart !== null && selEnd !== null;
  const isInRange = (i) => hasSelection && i >= selStart && i <= selEnd;
  const isKaraoke = activeWordIndex >= 0;

  return (
    <div className="pt-3 pb-1">
      <div className={`flex flex-wrap ${showIpa ? "items-end gap-x-1.5 gap-y-1" : "items-baseline gap-x-1 gap-y-2"}`}>
        {tokens.map((tok, i) => {
          const isLast = i === tokens.length - 1;
          const linked = tok.lk && !isLast;
          const selected = isInRange(i);
          const isRangeStart = hasSelection && i === selStart;
          const isRangeEnd = hasSelection && i === selEnd;
          const isActive = isKaraoke && i === activeWordIndex;
          const isPast = isKaraoke && i < activeWordIndex;
          const wordIpa = ipaWords[i];

          return (
            <span key={i} className="inline-flex items-end">
              <span
                onClick={(e) => { e.stopPropagation(); handleTap(i); }}
                className={`cursor-pointer select-none rounded-sm px-0.5 -mx-0.5
                  ${showIpa ? "flex flex-col items-center" : ""}
                  ${isActive
                    ? "bg-amber-400/40 dark:bg-amber-400/25 scale-105 transition-all duration-100"
                    : isPast
                    ? `${!showIpa ? stressStyle[tok.s] : ""} opacity-40 transition-opacity duration-300`
                    : `${!showIpa ? stressStyle[tok.s] : ""} transition-all duration-150`}
                  ${isActive ? "text-amber-900 dark:text-amber-300 text-lg font-semibold" : ""}
                  ${!isKaraoke && selected
                    ? "bg-amber-200/50 dark:bg-amber-400/15"
                    : !isKaraoke ? "hover:bg-gray-200/50 dark:hover:bg-gray-700/30" : ""}
                  ${isRangeStart && selStart !== selEnd ? "rounded-r-none pr-0" : ""}
                  ${isRangeEnd && selStart !== selEnd ? "rounded-l-none pl-0" : ""}
                  ${selected && !isRangeStart && !isRangeEnd ? "rounded-none px-0" : ""}
                  ${selected && selStart === selEnd ? "rounded-sm" : ""}`}
              >
                {showIpa && wordIpa && (
                  <span className="font-mono text-[0.6rem] leading-tight text-gray-400 dark:text-gray-500 whitespace-nowrap">
                    {wordIpa}
                  </span>
                )}
                <span className={showIpa ? stressStyle[tok.s] : ""}>
                  {!isActive && stressDot[tok.s]}
                  {tok.t}
                </span>
              </span>
              {linked && (
                <svg className="inline-block self-end -mx-1 mb-[0.1em]" width="16" height="8" viewBox="0 0 16 8">
                  <path d="M1,1 Q8,9 15,1" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-amber-600 dark:text-amber-400" />
                </svg>
              )}
            </span>
          );
        })}
      </div>
      {hasSelection && (
        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={() => speakRange(selStart, selEnd)}
            className="font-mono text-sm text-amber-700 dark:text-amber-400 cursor-pointer bg-transparent border-none p-0"
          >
            <IconPlay size="sm" /> {tokens.slice(selStart, selEnd + 1).map(t => t.t).join(" ")}
          </button>
          <button
            onClick={clearSelection}
            className="font-mono text-sm text-gray-500 cursor-pointer bg-transparent border-none p-0"
          >
            <IconClose size="sm" />
          </button>
        </div>
      )}
    </div>
  );
}

export function StressLegend() {
  return (
    <div className="flex gap-4 flex-wrap mt-2.5 mb-4 items-center">
      <div className="flex items-center gap-1.5">
        <span className="inline-block w-2 h-2 rounded-full bg-amber-700 dark:bg-amber-400" />
        <span className="font-mono text-sm text-amber-800 dark:text-amber-400 font-semibold">primary</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="inline-block w-2 h-2 rounded-full border-2 border-amber-600 dark:border-amber-400" />
        <span className="font-mono text-sm text-amber-700 dark:text-amber-400">secondary</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-sm text-gray-400 dark:text-gray-500">unstressed</span>
      </div>
      <div className="flex items-center gap-1.5">
        <svg className="inline-block align-middle" width="20" height="8" viewBox="0 0 20 8">
          <path d="M1,1 Q10,9 19,1" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-amber-600 dark:text-amber-400" />
        </svg>
        <span className="font-mono text-sm text-gray-400 dark:text-gray-400">linked</span>
      </div>
    </div>
  );
}
