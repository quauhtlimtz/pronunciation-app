import { useState } from "react";
import { SpeakWord } from "./SpeakWord";

export function WordBadge({ word, ipa, syllables }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className={`inline-block border rounded p-2.5 cursor-pointer select-none min-h-11
        ${open ? "border-gray-400 dark:border-gray-500" : "border-gray-200 dark:border-gray-700"}`}
      onClick={e => { e.stopPropagation(); setOpen(!open); }}
    >
      <SpeakWord word={word} ipa={ipa} className="block text-base mb-0.5">{word}</SpeakWord>
      <div className="mono-muted mt-0.5">{ipa}</div>
      {open && (
        <div className="mono-dim mt-1.5 pt-1.5 divider">{syllables}</div>
      )}
    </div>
  );
}
