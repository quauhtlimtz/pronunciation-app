import { useState, useRef, useCallback } from "react";
import { ShadowCard } from "./ShadowCard";
import { StressLegend } from "./PhraseAnnotation";
import { IconBack, IconMic, IconArrow } from "./Icons";

function MicSelector({ deviceId, onChange, onStreamReady }) {
  const [devices, setDevices] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [enabled, setEnabled] = useState(false);

  async function enableMic() {
    setLoading(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const all = await navigator.mediaDevices.enumerateDevices();
      const mics = all.filter(d => d.kind === "audioinput");
      setDevices(mics);
      setEnabled(true);
      const track = stream.getAudioTracks()[0];
      const actualId = track?.getSettings?.()?.deviceId || "";
      if (actualId) onChange(actualId);
      onStreamReady(stream);
    } catch { /* permission denied */ }
    finally { setLoading(false); }
  }

  async function switchDevice(newId) {
    onChange(newId);
    setOpen(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: { exact: newId } }
      });
      onStreamReady(stream);
    } catch {}
  }

  const current = devices.find(d => d.deviceId === deviceId);
  const label = current?.label || (deviceId ? "Selected microphone" : "Default microphone");

  if (!enabled) {
    return (
      <button className="btn btn-default btn-sm gap-1.5" onClick={enableMic} disabled={loading}>
        <IconMic size="sm" />
        <span>{loading ? "…" : "Enable Mic"}</span>
      </button>
    );
  }

  return (
    <div className="relative shrink-0">
      <button className="btn btn-default btn-sm gap-1.5 text-left max-w-full" onClick={() => setOpen(!open)}>
        <IconMic size="sm" />
        <span className="truncate">{label}</span>
      </button>
      {open && devices.length > 0 && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[16rem] max-w-[calc(100vw-2rem)]">
            {devices.map(d => (
              <button key={d.deviceId}
                className={`block w-full text-left px-3 py-2 text-sm truncate cursor-pointer
                  ${d.deviceId === deviceId
                    ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50"}`}
                onClick={() => switchDevice(d.deviceId)}
              >
                {d.label || `Microphone ${d.deviceId.slice(0, 8)}`}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function FreeShadow({ onBack, darkToggle }) {
  const [phrase, setPhrase] = useState("");
  const [activePhrase, setActivePhrase] = useState(null);
  const [micDeviceId, setMicDeviceId] = useState("");
  const micStreamRef = useRef(null);

  const handleStreamReady = useCallback((stream) => {
    if (micStreamRef.current && micStreamRef.current !== stream) {
      micStreamRef.current.getTracks().forEach(t => t.stop());
    }
    micStreamRef.current = stream;
  }, []);

  const go = () => {
    const trimmed = phrase.trim();
    if (trimmed) setActivePhrase(trimmed);
  };

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
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <MicSelector deviceId={micDeviceId} onChange={setMicDeviceId} onStreamReady={handleStreamReady} />
              {darkToggle}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[40rem] mx-auto px-4 pt-5 pb-safe flex-1 w-full">
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={phrase}
            onChange={e => setPhrase(e.target.value)}
            onKeyDown={e => e.key === "Enter" && go()}
            placeholder="Type any English phrase…"
            className="flex-1 px-3 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:border-gray-400 dark:focus:border-gray-500"
          />
          <button className="btn btn-primary btn-sm gap-1" onClick={go} disabled={!phrase.trim()}>
            Go <IconArrow size="sm" />
          </button>
        </div>

        {activePhrase && (
          <div>
            <StressLegend />
            <ShadowCard
              key={activePhrase}
              phrase={activePhrase}
              ipa=""
              syllables=""
              note=""
              tokens={null}
              micStreamRef={micStreamRef}
            />
          </div>
        )}
      </div>
    </div>
  );
}
