import { useState, useCallback } from "react";
import { speak, stopSpeak } from "../services/tts";
import { IconPlay, IconClose } from "./Icons";

export function PhraseAnnotation({ tokens }) {
  if (!tokens || tokens.length === 0) return null;

  const [selStart, setSelStart] = useState(null);
  const [selEnd, setSelEnd] = useState(null);
  const [playing, setPlaying] = useState(false);

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

  return (
    <div className="pt-3 pb-1">
      <div className="flex flex-wrap items-baseline gap-x-1 gap-y-2">
        {tokens.map((tok, i) => {
          const isLast = i === tokens.length - 1;
          const linked = tok.lk && !isLast;
          const selected = isInRange(i);
          const isRangeStart = hasSelection && i === selStart;
          const isRangeEnd = hasSelection && i === selEnd;

          return (
            <span key={i} className="inline-flex items-baseline">
              <span
                onClick={(e) => { e.stopPropagation(); handleTap(i); }}
                className={`cursor-pointer select-none transition-all duration-150 rounded-sm px-0.5 -mx-0.5
                  ${stressStyle[tok.s]}
                  ${selected
                    ? "bg-amber-200/50 dark:bg-amber-400/15"
                    : "hover:bg-gray-200/50 dark:hover:bg-gray-700/30"}
                  ${isRangeStart && selStart !== selEnd ? "rounded-r-none pr-0" : ""}
                  ${isRangeEnd && selStart !== selEnd ? "rounded-l-none pl-0" : ""}
                  ${selected && !isRangeStart && !isRangeEnd ? "rounded-none px-0" : ""}
                  ${selected && selStart === selEnd ? "rounded-sm" : ""}`}
              >
                {stressDot[tok.s]}
                {tok.t}
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
