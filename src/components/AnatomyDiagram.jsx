import { useState, useRef, useEffect } from "react";
import { ANATOMY_REGIONS } from "../data/anatomy";
import { SpeakWord } from "./SpeakWord";
import { IconBack, IconClose } from "./Icons";
import { ThemeToggle } from "./ThemeToggle";
import { Footer } from "./Footer";

export function AnatomyDiagram({ onBack, darkToggle, dark }) {
  const [selected, setSelected] = useState(null);
  const detailRef = useRef(null);
  const dotRefs = useRef({});

  // Resolve current theme (dark prop can be null = system)
  const isDark = dark === true || (dark === null && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  const imgSrc = isDark ? "/anatomy_dark.png" : "/anatomy_light.png";

  const region = selected ? ANATOMY_REGIONS.find(r => r.id === selected) : null;

  useEffect(() => {
    if (region && detailRef.current) {
      detailRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [selected]);

  return (
    <div className="page">
      {/* header */}
      <div className="sticky top-0 z-50 bg-gray-50 dark:bg-gray-950">
        <div className="border-b border-gray-100 dark:border-gray-800 px-3 sm:px-4 py-2.5 sm:py-3">
          <div className="flex items-center gap-2">
            <button
              className="p-2 rounded cursor-pointer text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 active:opacity-50 transition-colors"
              onClick={onBack}
            >
              <IconBack size="md" />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-sm sm:text-base truncate">Vocal Tract Anatomy</p>
            </div>
            {darkToggle}
          </div>
        </div>
      </div>

      <div className="page-content">
        <p className="text-sm text-gray-500 mb-4 leading-relaxed">
          Tap a dot to see which sounds are produced there
        </p>

        {/* diagram with hotspots */}
        <div className="relative mb-4">
          <img
            src={imgSrc}
            alt="Sagittal cross-section of the vocal tract"
            className="w-full rounded"
            draggable={false}
          />

          {/* hotspot dots */}
          {ANATOMY_REGIONS.map(r => {
            const isActive = selected === r.id;
            return (
              <button
                key={r.id}
                ref={el => dotRefs.current[r.id] = el}
                onClick={() => setSelected(isActive ? null : r.id)}
                className={`absolute rounded-full transition-all duration-200 cursor-pointer
                  ${isActive
                    ? "w-2.5 h-2.5 -ml-[5px] -mt-[5px] bg-amber-400"
                    : "w-5 h-5 -ml-2.5 -mt-2.5 bg-transparent border border-transparent hover:bg-amber-500/20 hover:border-amber-400/50"}`}
                style={{
                  left: `${r.x}%`,
                  top: `${r.y}%`,
                  animation: isActive ? "hotspot-ping 1.5s ease-out infinite" : "none",
                }}
                aria-label={r.label}
              >
              </button>
            );
          })}
        </div>

        {/* detail panel */}
        {region && (
          <div ref={detailRef} className="card p-4 mb-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <p className="text-base font-semibold">{region.label}</p>
                {region.aliases && (
                  <p className="font-mono text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    also: {region.aliases}
                  </p>
                )}
              </div>
              <button
                onClick={() => setSelected(null)}
                className="p-1 text-gray-400 cursor-pointer shrink-0"
              >
                <IconClose size="sm" />
              </button>
            </div>

            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-3">
              {region.desc}
            </p>

            {region.sounds.length > 0 && (
              <div className="flex flex-col gap-2">
                {region.sounds.map((s, i) => (
                  <div key={i} className="flex items-center gap-3 py-1.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
                    <span className="font-mono text-base text-amber-700 dark:text-amber-400 min-w-[4rem] shrink-0">
                      {s.ipa}
                    </span>
                    <SpeakWord word={s.word.split(",")[0].trim()} className="text-sm font-semibold">
                      {s.word}
                    </SpeakWord>
                    <span className="font-mono text-xs text-gray-400 dark:text-gray-500 ml-auto hidden sm:block">
                      {s.note}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* quick reference list */}
        <div className="mt-6">
          <p className="mono-label mb-3">All regions</p>
          <div className="flex flex-col">
            {ANATOMY_REGIONS.map(r => (
              <button
                key={r.id}
                onClick={() => setSelected(selected === r.id ? null : r.id)}
                className={`text-left px-3 py-2.5 border-b border-gray-100 dark:border-gray-800 cursor-pointer transition-colors
                  ${selected === r.id
                    ? "bg-amber-500/10"
                    : "hover:bg-white dark:hover:bg-gray-900"}`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-gray-400 dark:text-gray-500 w-6 shrink-0">{r.num}</span>
                  <span className="text-sm">{r.label}</span>
                  {r.sounds.length > 0 && (
                    <span className="font-mono text-xs text-amber-700 dark:text-amber-400 ml-auto">
                      {r.sounds.map(s => s.ipa).join(" ")}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-[40rem] mx-auto px-4 w-full">
        <Footer />
      </div>
    </div>
  );
}
