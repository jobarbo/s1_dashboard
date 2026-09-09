import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getParamsBySection,
  SECTION_LABELS,
  SECTION_ORDER,
  VIZ_SECTIONS,
} from "../lib/parameters";
import {
  isWebMidiSupported,
  listMidiPorts,
  MockMidiTransport,
  type MidiPortInfo,
  WebMidiTransport,
} from "../lib/midi";
import { createPatchStore, type PatchStore } from "../lib/patch-store";
import {
  isAudioInputSupported,
  listAudioInputDevices,
  pickS1AudioDevice,
  startUsbAudioCapture,
  type AudioInputDevice,
  type UsbAudioAnalysers,
  type UsbAudioSession,
} from "../lib/usb-audio";
import { ParameterGrid } from "./ParameterControl";
import { SectionCard } from "./SectionCard";
import { SectionVisualizer } from "./SectionVisualizer";
import { UsbAudioWaveform } from "./visualizers/UsbAudioVisualizers";

const KEYBOARD_NOTES = [
  { label: "C", note: 60 },
  { label: "D", note: 62 },
  { label: "E", note: 64 },
  { label: "F", note: 65 },
  { label: "G", note: 67 },
  { label: "A", note: 69 },
  { label: "B", note: 71 },
  { label: "C+", note: 72 },
];

let storeSingleton: PatchStore | null = null;

function getStore(): PatchStore {
  if (!storeSingleton) storeSingleton = createPatchStore();
  return storeSingleton;
}

export default function Editor() {
  const store = useMemo(() => getStore(), []);
  const [, tick] = useState(0);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [useMock, setUseMock] = useState(false);
  const [activeNotes, setActiveNotes] = useState<Set<number>>(new Set());
  const [midiInputs, setMidiInputs] = useState<MidiPortInfo[]>([]);
  const [midiOutputs, setMidiOutputs] = useState<MidiPortInfo[]>([]);
  const [selectedInputId, setSelectedInputId] = useState("");
  const [selectedOutputId, setSelectedOutputId] = useState("");
  const [audioInputs, setAudioInputs] = useState<AudioInputDevice[]>([]);
  const [selectedAudioId, setSelectedAudioId] = useState("");
  const [audioActive, setAudioActive] = useState(false);
  const [audioAnalysers, setAudioAnalysers] = useState<UsbAudioAnalysers | null>(null);
  const audioSessionRef = useRef<UsbAudioSession | null>(null);

  useEffect(() => {
    return store.subscribe(() => tick((n) => n + 1));
  }, [store]);

  useEffect(() => {
    if (!isWebMidiSupported()) return;
    listMidiPorts()
      .then((ports) => {
        setMidiInputs(ports.inputs);
        setMidiOutputs(ports.outputs);
        if (ports.suggestedInputId) setSelectedInputId(ports.suggestedInputId);
        if (ports.suggestedOutputId) setSelectedOutputId(ports.suggestedOutputId);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!isAudioInputSupported()) return;
    listAudioInputDevices()
      .then((devices) => {
        setAudioInputs(devices);
        const s1 = pickS1AudioDevice(devices);
        if (s1) setSelectedAudioId(s1.deviceId);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    return () => {
      audioSessionRef.current?.stop();
      audioSessionRef.current = null;
    };
  }, []);

  const connected = store.isConnected();
  const transportInfo = store.getTransportInfo();
  const states = store.getAllStates();
  const channel = store.getChannel();
  const unsynced = store.unsyncedCount;
  const midiActivity = store.getLastMidiActivity();

  const getVal = useCallback(
    (id: string, fallback = 0) => store.getState(id)?.value ?? fallback,
    [store, states],
  );

  const stopAudio = useCallback(() => {
    audioSessionRef.current?.stop();
    audioSessionRef.current = null;
    setAudioAnalysers(null);
    setAudioActive(false);
  }, []);

  const startAudio = useCallback(async (deviceId?: string) => {
    setAudioError(null);
    try {
      stopAudio();
      const session = await startUsbAudioCapture(deviceId || selectedAudioId || undefined);
      audioSessionRef.current = session;
      setAudioAnalysers(session.analysers);
      setAudioActive(true);
    } catch (err) {
      setAudioError(err instanceof Error ? err.message : "Failed to start USB audio");
      setAudioActive(false);
    }
  }, [selectedAudioId, stopAudio]);

  const handleConnect = async () => {
    setError(null);
    setConnecting(true);
    try {
      const transport = useMock
        ? new MockMidiTransport()
        : await WebMidiTransport.create({
            inputId: selectedInputId || undefined,
            outputId: selectedOutputId || undefined,
          });
      store.connect(transport, channel);
      if (!useMock) {
        listMidiPorts()
          .then((ports) => {
            setMidiInputs(ports.inputs);
            setMidiOutputs(ports.outputs);
          })
          .catch(() => undefined);
        if (isAudioInputSupported()) {
          const devices = await listAudioInputDevices();
          setAudioInputs(devices);
          const s1 = pickS1AudioDevice(devices);
          const id = selectedAudioId || s1?.deviceId;
          if (id) await startAudio(id);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect MIDI");
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = () => {
    store.disconnect();
    stopAudio();
    setActiveNotes(new Set());
  };

  const handleParamChange = (id: string, value: number) => {
    store.setValue(id, value);
  };

  const handleNote = (note: number, down: boolean) => {
    if (!connected) return;
    store.sendNote(note, down);
    setActiveNotes((prev) => {
      const next = new Set(prev);
      if (down) next.add(note);
      else next.delete(note);
      return next;
    });
  };

  return (
    <div className="editor">
      <header className="editor-header">
        <div className="brand">
          <h1>S-1 Web Editor</h1>
          <p className="subtitle">Unofficial Roland AIRA Compact S-1 dashboard</p>
        </div>

        <div className="header-actions">
          {!isWebMidiSupported() && (
            <span className="badge badge-warn">Web MIDI unavailable — using mock</span>
          )}
          {connected && transportInfo && (
            <span className="badge badge-ok">
              {transportInfo.isMock ? "Mock" : "Live"} · out: {transportInfo.output}
            </span>
          )}
          {audioActive && <span className="badge badge-ok">USB audio live</span>}
          {connected && transportInfo && !transportInfo.isMock && transportInfo.input.startsWith("(none") && (
            <span className="badge badge-warn">No MIDI input port</span>
          )}
          {connected && unsynced > 0 && (
            <span className="badge badge-warn">{unsynced} unsynced</span>
          )}

          <label className="channel-input">
            Ch
            <input
              type="number"
              min={1}
              max={16}
              value={channel}
              disabled={connected}
              onChange={(e) => store.setChannel(Number(e.target.value))}
            />
          </label>

          {!connected ? (
            <>
              {isWebMidiSupported() && (
                <>
                  <label className="port-select">
                    MIDI out
                    <select
                      value={selectedOutputId}
                      onChange={(e) => setSelectedOutputId(e.target.value)}
                    >
                      <option value="">Auto-detect S-1</option>
                      {midiOutputs.map((port) => (
                        <option key={port.id} value={port.id}>
                          {port.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="port-select">
                    MIDI in
                    <select
                      value={selectedInputId}
                      onChange={(e) => setSelectedInputId(e.target.value)}
                    >
                      <option value="">Auto-detect S-1</option>
                      {midiInputs.map((port) => (
                        <option key={port.id} value={port.id}>
                          {port.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  {isAudioInputSupported() && (
                    <label className="port-select">
                      Audio in
                      <select
                        value={selectedAudioId}
                        onChange={(e) => setSelectedAudioId(e.target.value)}
                      >
                        <option value="">Auto-detect S-1</option>
                        {audioInputs.map((port) => (
                          <option key={port.deviceId} value={port.deviceId}>
                            {port.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <label className="mock-toggle">
                    Mock MIDI
                    <input
                      type="checkbox"
                      checked={useMock}
                      onChange={(e) => setUseMock(e.target.checked)}
                    />
                  </label>
                </>
              )}
              <button type="button" className="btn btn-primary" disabled={connecting} onClick={handleConnect}>
                {connecting ? "Connecting…" : "Connect"}
              </button>
            </>
          ) : (
            <>
              <button type="button" className="btn" onClick={() => store.sendTestNote()}>
                Test note
              </button>
              {isAudioInputSupported() && !transportInfo?.isMock && (
                audioActive ? (
                  <button type="button" className="btn btn-ghost" onClick={stopAudio}>
                    Stop audio
                  </button>
                ) : (
                  <button type="button" className="btn" onClick={() => startAudio()}>
                    Start audio
                  </button>
                )
              )}
              <button type="button" className="btn" onClick={() => store.sendAll()}>
                Send All
              </button>
              <button type="button" className="btn" onClick={() => store.panic()}>
                Panic
              </button>
              <button type="button" className="btn btn-ghost" onClick={handleDisconnect}>
                Disconnect
              </button>
            </>
          )}
        </div>
      </header>

      {error && <div className="alert alert-error">{error}</div>}
      {audioError && <div className="alert alert-error">{audioError}</div>}

      {!connected && (
        <div className="alert alert-info">
          <strong>Before connecting:</strong> Turn <strong>AIRA LINK</strong> off on the S-1, then power-cycle.
          Connect starts MIDI and USB audio (browser will ask for mic/audio permission — pick your S-1 input).
        </div>
      )}

      {connected && !transportInfo?.isMock && (
        <div className="alert alert-info">
          CC visualizers in each section are estimates. The top oscilloscope shows live USB audio. The Filter
          graph overlays the live USB spectrum on the estimated cutoff curve.
        </div>
      )}

      {connected && (midiActivity.inbound || midiActivity.outbound) && (
        <div className="midi-activity">
          {midiActivity.outbound && <span>{midiActivity.outbound}</span>}
          {midiActivity.inbound && <span>{midiActivity.inbound}</span>}
        </div>
      )}

      <div className="dash-top">
        <SectionCard title="Oscilloscope" className="scope-panel">
          <UsbAudioWaveform
            analyser={audioAnalysers?.waveform ?? null}
            active={audioActive}
          />
        </SectionCard>

        <div className="dash-vizs">
          {VIZ_SECTIONS.map((section) => (
            <SectionCard key={section} title={SECTION_LABELS[section]} className="viz-only-card">
              <SectionVisualizer
                section={section}
                getVal={getVal}
                audioAnalysers={audioAnalysers}
                audioActive={audioActive}
              />
            </SectionCard>
          ))}
        </div>
      </div>

      <div className="sections-grid">
        {SECTION_ORDER.map((section) => {
          const defs = getParamsBySection(section);
          const sectionStates = defs
            .map((d) => store.getState(d.id))
            .filter((s): s is NonNullable<typeof s> => s != null);
          return (
            <SectionCard key={section} title={SECTION_LABELS[section]}>
              <ParameterGrid
                params={sectionStates}
                disabled={!connected}
                onChange={handleParamChange}
              />
            </SectionCard>
          );
        })}
      </div>

      <footer className="editor-footer">
        <p>
          Not affiliated with Roland. Save patterns on the hardware (Shift + Write). CC-only — no
          SysEx, no .PRM writing in v1.
        </p>
      </footer>

      <SectionCard title="Keyboard" className="keyboard-panel keyboard-row">
        <p className="keyboard-hint">Audition notes on MIDI channel {channel}</p>
        <div className="keyboard">
          {KEYBOARD_NOTES.map(({ label, note }) => (
            <button
              key={note}
              type="button"
              className={`key ${activeNotes.has(note) ? "active" : ""}`}
              disabled={!connected}
              onMouseDown={() => handleNote(note, true)}
              onMouseUp={() => handleNote(note, false)}
              onMouseLeave={() => activeNotes.has(note) && handleNote(note, false)}
              onTouchStart={(e) => {
                e.preventDefault();
                handleNote(note, true);
              }}
              onTouchEnd={() => handleNote(note, false)}
            >
              {label}
            </button>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
