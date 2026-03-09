import { useState, useEffect, useCallback } from "react";
import { SpeakWord } from "./SpeakWord";
import { IconBack } from "./Icons";
import { getContent } from "../services/content";
import { useAuth } from "./AuthContext";

// Static chart structure — placement × manner with voiceless/voiced pairs
const CHART = [
  {
    manner: "Stops",
    desc: "Breath is stopped and released.",
    cells: [
      { col: 0, voiceless: { ipa: "/p/", word: "pie" },  voiced: { ipa: "/b/", word: "buy" } },
      { col: 3, voiceless: { ipa: "/t/", word: "time" }, voiced: { ipa: "/d/", word: "dime" } },
      { col: 5, voiceless: { ipa: "/k/", word: "key" },  voiced: { ipa: "/g/", word: "go" } },
    ],
  },
  {
    manner: "Fricatives",
    desc: "Breath is constricted.",
    cells: [
      { col: 1, voiceless: { ipa: "/f/", word: "fan" },  voiced: { ipa: "/v/", word: "van" } },
      { col: 2, voiceless: { ipa: "/θ/", word: "think" }, voiced: { ipa: "/ð/", word: "them" } },
      { col: 3, voiceless: { ipa: "/s/", word: "so" },   voiced: { ipa: "/z/", word: "zoo" } },
      { col: 4, voiceless: { ipa: "/ʃ/", word: "shoe" }, voiced: { ipa: "/ʒ/", word: "measure" } },
      { col: 6, voiceless: { ipa: "/h/", word: "home" }, voiced: null },
    ],
  },
  {
    manner: "Affricates",
    desc: "Breath is stopped and constricted.",
    cells: [
      { col: 4, voiceless: { ipa: "/tʃ/", word: "choose" }, voiced: { ipa: "/dʒ/", word: "juice" } },
    ],
  },
  {
    manner: "Nasals",
    desc: "Breath is released through the nose.",
    cells: [
      { col: 0, voiceless: null, voiced: { ipa: "/m/", word: "my" } },
      { col: 3, voiceless: null, voiced: { ipa: "/n/", word: "no" } },
      { col: 5, voiceless: null, voiced: { ipa: "/ŋ/", word: "sing" } },
    ],
  },
  {
    manner: "Liquids",
    desc: "Breath is not obstructed.",
    cells: [
      { col: 3, voiceless: null, voiced: { ipa: "/l/", word: "let" } },
      { col: 4, voiceless: null, voiced: { ipa: "/r/", word: "red" } },
    ],
  },
  {
    manner: "Glides",
    desc: "Mouth glides from one position to another.",
    cells: [
      { col: 0, voiceless: null, voiced: { ipa: "/w/", word: "we" } },
      { col: 4, voiceless: null, voiced: { ipa: "/j/", word: "yes" } },
    ],
  },
];

const PLACEMENTS = [
  "Both Lips",
  "Lip–Teeth",
  "Tongue–Teeth",
  "Gum Ridge",
  "Hard Palate",
  "Soft Palate",
  "Throat",
];

const LESSON_DEF = {
  id: "consonant-chart",
  prompt: `You are an American English pronunciation expert.
Generate 3 fresh example words for EACH of the 24 North American English consonant sounds below. Use common everyday words different from the defaults.

Sounds: /p/, /b/, /t/, /d/, /k/, /g/, /f/, /v/, /θ/, /ð/, /s/, /z/, /ʃ/, /ʒ/, /h/, /tʃ/, /dʒ/, /m/, /n/, /ŋ/, /l/, /r/, /w/, /j/

Respond ONLY with valid JSON (no markdown, no backticks):
{
  "examples": {
    "/p/": [{"word":"...","ipa":"/IPA/"},{"word":"...","ipa":"/IPA/"},{"word":"...","ipa":"/IPA/"}],
    "/b/": [{"word":"...","ipa":"/IPA/"},{"word":"...","ipa":"/IPA/"},{"word":"...","ipa":"/IPA/"}],
    "/t/": [{"word":"...","ipa":"/IPA/"},{"word":"...","ipa":"/IPA/"},{"word":"...","ipa":"/IPA/"}],
    "/d/": [{"word":"...","ipa":"/IPA/"},{"word":"...","ipa":"/IPA/"},{"word":"...","ipa":"/IPA/"}],
    "/k/": [{"word":"...","ipa":"/IPA/"},{"word":"...","ipa":"/IPA/"},{"word":"...","ipa":"/IPA/"}],
    "/g/": [{"word":"...","ipa":"/IPA/"},{"word":"...","ipa":"/IPA/"},{"word":"...","ipa":"/IPA/"}],
    "/f/": [{"word":"...","ipa":"/IPA/"},{"word":"...","ipa":"/IPA/"},{"word":"...","ipa":"/IPA/"}],
    "/v/": [{"word":"...","ipa":"/IPA/"},{"word":"...","ipa":"/IPA/"},{"word":"...","ipa":"/IPA/"}],
    "/θ/": [{"word":"...","ipa":"/IPA/"},{"word":"...","ipa":"/IPA/"},{"word":"...","ipa":"/IPA/"}],
    "/ð/": [{"word":"...","ipa":"/IPA/"},{"word":"...","ipa":"/IPA/"},{"word":"...","ipa":"/IPA/"}],
    "/s/": [{"word":"...","ipa":"/IPA/"},{"word":"...","ipa":"/IPA/"},{"word":"...","ipa":"/IPA/"}],
    "/z/": [{"word":"...","ipa":"/IPA/"},{"word":"...","ipa":"/IPA/"},{"word":"...","ipa":"/IPA/"}],
    "/ʃ/": [{"word":"...","ipa":"/IPA/"},{"word":"...","ipa":"/IPA/"},{"word":"...","ipa":"/IPA/"}],
    "/ʒ/": [{"word":"...","ipa":"/IPA/"},{"word":"...","ipa":"/IPA/"},{"word":"...","ipa":"/IPA/"}],
    "/h/": [{"word":"...","ipa":"/IPA/"},{"word":"...","ipa":"/IPA/"},{"word":"...","ipa":"/IPA/"}],
    "/tʃ/": [{"word":"...","ipa":"/IPA/"},{"word":"...","ipa":"/IPA/"},{"word":"...","ipa":"/IPA/"}],
    "/dʒ/": [{"word":"...","ipa":"/IPA/"},{"word":"...","ipa":"/IPA/"},{"word":"...","ipa":"/IPA/"}],
    "/m/": [{"word":"...","ipa":"/IPA/"},{"word":"...","ipa":"/IPA/"},{"word":"...","ipa":"/IPA/"}],
    "/n/": [{"word":"...","ipa":"/IPA/"},{"word":"...","ipa":"/IPA/"},{"word":"...","ipa":"/IPA/"}],
    "/ŋ/": [{"word":"...","ipa":"/IPA/"},{"word":"...","ipa":"/IPA/"},{"word":"...","ipa":"/IPA/"}],
    "/l/": [{"word":"...","ipa":"/IPA/"},{"word":"...","ipa":"/IPA/"},{"word":"...","ipa":"/IPA/"}],
    "/r/": [{"word":"...","ipa":"/IPA/"},{"word":"...","ipa":"/IPA/"},{"word":"...","ipa":"/IPA/"}],
    "/w/": [{"word":"...","ipa":"/IPA/"},{"word":"...","ipa":"/IPA/"},{"word":"...","ipa":"/IPA/"}],
    "/j/": [{"word":"...","ipa":"/IPA/"},{"word":"...","ipa":"/IPA/"},{"word":"...","ipa":"/IPA/"}]
  }
}
Use common everyday American English words. All IPA must be accurate.`,
};

function SoundCell({ sound, onSelect, selected }) {
  if (!sound) return null;
  const isActive = selected === sound.ipa;
  // Strip slashes for TTS: "/p/" → "p", "/tʃ/" → "tʃ"
  const bare = sound.ipa.replace(/\//g, "");
  return (
    <span
      className={`inline-flex flex-col items-center gap-0.5 px-1.5 py-1 rounded transition-colors
        ${isActive ? "bg-amber-100 dark:bg-amber-900/30" : ""}`}
      onClick={() => onSelect(sound.ipa)}
    >
      <SpeakWord word={bare} ipa={sound.ipa} className="!border-none">
        <span className="font-mono text-sm font-semibold cursor-pointer">{sound.ipa}</span>
      </SpeakWord>
      <SpeakWord word={sound.word} ipa={sound.ipa} className="!border-none">
        <span className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer border-b border-dashed border-transparent hover:border-gray-400">{sound.word}</span>
      </SpeakWord>
    </span>
  );
}

export function ConsonantChart({ onBack, darkToggle }) {
  const { user } = useAuth();
  const [selected, setSelected] = useState(null);
  const [examples, setExamples] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadExamples = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getContent(LESSON_DEF, { user });
      if (data?.examples) setExamples(data.examples);
    } catch (e) {
      console.error("Failed to load chart examples:", e);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { loadExamples(); }, [loadExamples]);

  const toggleSelect = useCallback((ipa) => {
    setSelected(prev => prev === ipa ? null : ipa);
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1 -ml-1 cursor-pointer bg-transparent border-none">
            <IconBack />
          </button>
          <div>
            <h1 className="text-lg font-semibold">Consonant Chart</h1>
            <p className="font-mono text-xs text-gray-500">24 North American English consonant sounds</p>
          </div>
        </div>
        {darkToggle}
      </div>

      {/* Legend */}
      <div className="flex gap-4 flex-wrap mb-4 text-xs font-mono text-gray-500">
        <span>Top = <strong className="text-gray-700 dark:text-gray-300">voiceless</strong></span>
        <span>Bottom = <strong className="text-gray-700 dark:text-gray-300">voiced</strong></span>
        <span>Tap any sound to hear it</span>
      </div>

      {/* Chart */}
      <div className="overflow-x-auto -mx-4 px-4">
        <table className="w-full text-center border-collapse min-w-[640px]">
          <thead>
            <tr>
              <th className="text-left text-xs font-mono text-gray-400 dark:text-gray-500 pb-2 pr-2 w-28" rowSpan={2}>
                <span className="block text-[10px] uppercase tracking-wider">Manner</span>
              </th>
              <th className="text-xs font-mono text-gray-400 dark:text-gray-500 pb-1 uppercase tracking-wider" colSpan={7}>
                Placement
              </th>
            </tr>
            <tr>
              {PLACEMENTS.map(p => (
                <th key={p} className="text-[10px] font-mono text-gray-400 dark:text-gray-500 pb-2 px-1 font-normal whitespace-nowrap">
                  {p}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CHART.map((row) => {
              // Check if selected sound is in this row
              const selectedInRow = selected && row.cells.some(c =>
                c.voiceless?.ipa === selected || c.voiced?.ipa === selected
              );
              const selectedExamples = selected && examples?.[selected];

              return [
                <tr key={row.manner} className="border-t border-gray-200 dark:border-gray-700">
                  <td className="text-left py-2.5 pr-2 align-top">
                    <span className="text-sm font-medium">{row.manner}</span>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 leading-tight">{row.desc}</p>
                  </td>
                  {PLACEMENTS.map((_, colIdx) => {
                    const cell = row.cells.find(c => c.col === colIdx);
                    if (!cell) return <td key={colIdx} className="py-2.5 px-1" />;
                    return (
                      <td key={colIdx} className="py-2.5 px-1 align-middle">
                        <div className="flex flex-col items-center gap-1">
                          {cell.voiceless && (
                            <SoundCell sound={cell.voiceless} onSelect={toggleSelect} selected={selected} />
                          )}
                          {cell.voiced && (
                            <SoundCell sound={cell.voiced} onSelect={toggleSelect} selected={selected} />
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>,
                selectedInRow && (
                  <tr key={`${row.manner}-detail`} className="bg-amber-50/50 dark:bg-amber-900/10">
                    <td colSpan={8} className="py-3 px-3">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-mono text-sm font-semibold shrink-0">{selected}</span>
                        {loading && !selectedExamples && (
                          <span className="text-xs text-gray-400">Loading…</span>
                        )}
                        {selectedExamples && selectedExamples.map((ex, i) => (
                          <SpeakWord key={i} word={ex.word} ipa={ex.ipa}>
                            <span className="inline-flex items-baseline gap-1 px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700 hover:border-amber-400 transition-colors text-sm">
                              <span className="font-medium">{ex.word}</span>
                              <span className="font-mono text-xs text-gray-400">{ex.ipa}</span>
                            </span>
                          </SpeakWord>
                        ))}
                      </div>
                    </td>
                  </tr>
                ),
              ];
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
