import { useState, useRef, useCallback } from "react";

export function TestRecorder() {
  const [log, setLog] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState(null);
  const [devices, setDevices] = useState([]);
  const [deviceId, setDeviceId] = useState("");
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);

  const addLog = useCallback((msg) => {
    const time = new Date().toLocaleTimeString("en", { hour12: false, fractionalSecondDigits: 3 });
    setLog(prev => [...prev, `[${time}] ${msg}`]);
  }, []);

  const enableMic = async () => {
    addLog("Requesting permission...");
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      s.getTracks().forEach(t => t.stop());
      const all = await navigator.mediaDevices.enumerateDevices();
      const mics = all.filter(d => d.kind === "audioinput");
      setDevices(mics);
      addLog(`${mics.length} mic(s) found`);
    } catch (e) {
      addLog(`FAILED: ${e.message}`);
    }
  };

  const startRecording = async () => {
    const constraints = deviceId
      ? { audio: { deviceId: { exact: deviceId } } }
      : { audio: true };

    addLog("getUserMedia...");
    const t0 = performance.now();
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    addLog(`OK in ${Math.round(performance.now() - t0)}ms — ${stream.getAudioTracks()[0].label}`);
    streamRef.current = stream;

    const recorder = new MediaRecorder(stream);
    mediaRecorderRef.current = recorder;
    chunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
      addLog(`Done: ${blob.size} bytes`);
      setAudioURL(URL.createObjectURL(blob));
      stream.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    };

    recorder.start();
    setIsRecording(true);
    addLog("Warming up...");
    await new Promise(r => setTimeout(r, 300));
    addLog("Recording — speak now!");
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    addLog("Stopped");
  };

  return (
    <div style={{ fontFamily: "system-ui", maxWidth: 500, margin: "40px auto", padding: "0 20px" }}>
      <h2>Recording Test</h2>

      {devices.length === 0 ? (
        <button onClick={enableMic} style={btnStyle("#2563eb")}>
          Allow Microphone
        </button>
      ) : (
        <>
          <select value={deviceId} onChange={e => setDeviceId(e.target.value)}
            style={{ padding: 8, fontSize: 14, width: "100%", marginBottom: 12 }}>
            <option value="">Default</option>
            {devices.map(d => (
              <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
            ))}
          </select>

          <button onClick={isRecording ? stopRecording : startRecording}
            style={btnStyle(isRecording ? "#dc2626" : "#16a34a")}>
            {isRecording ? "Stop" : "Record"}
          </button>
        </>
      )}

      {audioURL && <audio controls src={audioURL} style={{ width: "100%", marginTop: 16 }} />}

      <pre style={{ background: "#f5f5f5", padding: 16, fontSize: 12, maxHeight: 400,
        overflowY: "auto", marginTop: 20, whiteSpace: "pre-wrap" }}>
        {log.join("\n") || "..."}
      </pre>
    </div>
  );
}

const btnStyle = (bg) => ({
  padding: "16px 32px", fontSize: 18, cursor: "pointer",
  background: bg, color: "white", border: "none", borderRadius: 8,
});
