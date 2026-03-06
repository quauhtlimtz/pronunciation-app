import { useState, useEffect } from "react";
import { IconMic } from "./Icons";

export function MicBar({ deviceId, onChange, onStreamReady, visible, micStreamRef }) {
  const [devices, setDevices] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [enabled, setEnabled] = useState(false);

  // Detect when stream has been invalidated so we show re-enable state
  const [micLive, setMicLive] = useState(false);
  useEffect(() => {
    const check = () => {
      const track = micStreamRef?.current?.getAudioTracks()[0];
      setMicLive(!!track && track.readyState === "live");
    };
    check();
    const iv = setInterval(check, 500);
    return () => clearInterval(iv);
  }, [micStreamRef]);

  async function enableMic() {
    setLoading(true);
    try {
      const constraints = deviceId
        ? { audio: { deviceId: { exact: deviceId } } }
        : { audio: true };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
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
    } catch { /* fallback: keep old stream */ }
  }

  if (!visible) return null;

  const current = devices.find(d => d.deviceId === deviceId);
  const label = current?.label || (deviceId ? "Selected microphone" : "Default microphone");
  const needsEnable = !enabled || !micLive;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-[calc(env(safe-area-inset-bottom,0px)+0.5rem)] px-3 pointer-events-none">
      {needsEnable ? (
        <button
          className="btn btn-primary btn-sm gap-1.5 shadow-lg pointer-events-auto"
          onClick={enableMic}
          disabled={loading}
        >
          <IconMic size="sm" />
          <span>{loading ? "enabling…" : enabled ? "Re-enable Microphone" : "Enable Microphone"}</span>
        </button>
      ) : (
        <div className="relative pointer-events-auto">
          <button
            className="btn btn-primary btn-sm gap-1.5 text-left max-w-[calc(100vw-2rem)] shadow-lg"
            onClick={() => devices.length > 1 ? setOpen(!open) : null}
          >
            <IconMic size="sm" />
            <span className="truncate text-xs">{label}</span>
          </button>
          {open && devices.length > 1 && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[16rem] max-w-[calc(100vw-2rem)]">
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
      )}
    </div>
  );
}
