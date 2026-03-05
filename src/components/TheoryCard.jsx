import { useState } from "react";
import { WordBadge } from "./WordBadge";
import { IconUp, IconDown } from "./Icons";

export function TheoryCard({ item }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className={`card mb-2 cursor-pointer ${open ? "bg-white dark:bg-gray-900" : "bg-gray-50 dark:bg-gray-950"}`}
      onClick={() => setOpen(v => !v)}
    >
      <div className="flex items-center gap-3.5 px-4 py-3.5">
        <span className="font-mono text-base min-w-14 shrink-0">{item.symbol}</span>
        <div className="flex-1 min-w-0">
          <div className="text-[0.95rem]">{item.name}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{item.rule}</div>
        </div>
        <span className="text-gray-400 dark:text-gray-500 shrink-0">
          {open ? <IconUp size="sm" /> : <IconDown size="sm" />}
        </span>
      </div>
      {open && (
        <div className="px-4 pb-4 divider" onClick={e => e.stopPropagation()}>
          <div className="flex flex-wrap gap-2 mt-3.5 mb-3">
            {item.examples.map((ex, i) => <WordBadge key={i} word={ex.word} ipa={ex.ipa} syllables={ex.syllables} />)}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 italic leading-relaxed">{item.tip}</div>
        </div>
      )}
    </div>
  );
}
