import { useState } from "react";
import { speak, stopSpeak } from "../services/tts";
import { IconPlay } from "./Icons";

export function SpeakWord({ word, ipa, children, className = "" }) {
  const [playing, setPlaying] = useState(false);

  function tap(e) {
    e.stopPropagation();
    if (playing) { stopSpeak(); setPlaying(false); return; }
    setPlaying(true);
    speak(word, () => setPlaying(false), () => {});
  }

  return (
    <span
      onClick={tap}
      className={`cursor-pointer select-none border-b border-dashed transition-all duration-150
        ${playing ? "border-current" : "border-transparent hover:border-gray-400 dark:hover:border-gray-600"}
        ${className}`}
      title={ipa || word}
    >
      {children || word}
      {playing && <span className="ml-1 opacity-60"><IconPlay size="sm" /></span>}
    </span>
  );
}
