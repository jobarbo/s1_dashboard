import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getParamsBySection,
  SECTION_LABELS,
  SECTION_ORDER,
  VIZ_SECTIONS,
} from "../lib/parameters";
import { MIDI_NO_INPUT, isWebMidiSupported, listMidiPorts, MockMidiTransport, type MidiPortInfo, WebMidiTransport } from "../lib/midi";
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
import { LanguageToggle } from "./LanguageToggle";
import { ReferenceModal } from "./ReferenceModal";
import { SectionCard } from "./SectionCard";
import { SectionVisualizer } from "./SectionVisualizer";
import { SnapshotsPanel } from "./SnapshotsPanel";
import { TempoBadge } from "./TempoBadge";
import { ThemeToggle } from "./ThemeToggle";
import { UsbAudioWaveform } from "./visualizers/UsbAudioVisualizers";
import { useI18n } from "../lib/use-i18n";

let storeSingleton: PatchStore | null = null;

function getStore(): PatchStore {
  if (!storeSingleton) storeSingleton = createPatchStore();
  return storeSingleton;
}

function SpeakerIcon({ muted }: { muted: boolean }) {
  if (muted) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M11 5 6 9H3v6h3l5 4V5z"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="m16 9 5 5M21 9l-5 5"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M11 5 6 9H3v6h3l5 4V5z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

const KEY_ICON_PATHS = {
  setup: "M4 7h10M18 7h2M4 17h4M12 17h8M14 4v6M8 14v6",
  connect: "M9 7V3M15 7V3M6 7h12v4a6 6 0 0 1-12 0V7zM12 17v4",
  note: "M9 18V5l10-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM19 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z",
  send: "M12 15V3M7 8l5-5 5 5M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4",
  init: "M3 12a9 9 0 1 0 3-6.7M3 4v5h5",
  panic: "M12 8v5M12 16.5v.5M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z",
  disconnect: "M5 15h14M12 4l7 8H5l7-8zM5 19h14",
} as const;

function KeyIcon({ name }: { name: keyof typeof KEY_ICON_PATHS }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d={KEY_ICON_PATHS[name]}
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Editor() {
  const { t, locale } = useI18n();
  const store = useMemo(() => getStore(), []);
  const [, tick] = useState(0);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [useMock, setUseMock] = useState(false);
  const [midiInputs, setMidiInputs] = useState<MidiPortInfo[]>([]);
  const [midiOutputs, setMidiOutputs] = useState<MidiPortInfo[]>([]);
  const [selectedInputId, setSelectedInputId] = useState("");
  const [selectedOutputId, setSelectedOutputId] = useState("");
  const [audioInputs, setAudioInputs] = useState<AudioInputDevice[]>([]);
  const [selectedAudioId, setSelectedAudioId] = useState("");
  const [audioActive, setAudioActive] = useState(false);
  const [audioMonitor, setAudioMonitor] = useState(false);
  const [audioAnalysers, setAudioAnalysers] = useState<UsbAudioAnalysers | null>(null);
  const [referenceOpen, setReferenceOpen] = useState(false);
  const [snapshotsOpen, setSnapshotsOpen] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
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
    setAudioMonitor(false);
  }, []);

  const startAudio = useCallback(async (deviceId?: string, monitor = false) => {
    setAudioError(null);
    try {
      stopAudio();
      const session = await startUsbAudioCapture(deviceId || selectedAudioId || undefined);
      session.setMonitorEnabled(monitor);
      audioSessionRef.current = session;
      setAudioAnalysers(session.analysers);
      setAudioActive(true);
      setAudioMonitor(monitor);
    } catch (err) {
      setAudioError(err instanceof Error ? err.message : t("audioStartFailed"));
      setAudioActive(false);
      setAudioMonitor(false);
    }
  }, [selectedAudioId, stopAudio, t]);

  const toggleSpeaker = useCallback(async () => {
    if (audioMonitor) {
      audioSessionRef.current?.setMonitorEnabled(false);
      setAudioMonitor(false);
      return;
    }
    if (audioSessionRef.current) {
      if (audioSessionRef.current.context.state === "suspended") {
        await audioSessionRef.current.context.resume();
      }
      audioSessionRef.current.setMonitorEnabled(true);
      setAudioMonitor(true);
      return;
    }
    await startAudio(undefined, true);
  }, [audioMonitor, startAudio]);

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
          // Capture for visualizers; speaker stays off until the user toggles it.
          if (id) await startAudio(id, false);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("midiConnectFailed"));
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = () => {
    store.disconnect();
    stopAudio();
  };

  const handleParamChange = (id: string, value: number) => {
    store.setValue(id, value);
  };

  useEffect(() => {
    document.title = t("pageTitle");
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", t("pageDescription"));
  }, [locale, t]);

  const [connectBefore, connectAfter] = t("connectHint").split("{aira}");
  const noMidiIn =
    connected && transportInfo && !transportInfo.isMock && (transportInfo.input === MIDI_NO_INPUT || transportInfo.input.startsWith("(none"));
  const outputLabel = transportInfo
    ? transportInfo.output || t("unknownPort")
    : "";
  const portLabel = (ports: MidiPortInfo[], id: string) =>
    ports.find((p) => p.id === id)?.name ?? t("portAuto");
  const speakerLabel = audioMonitor ? t("audioSpeakerOn") : t("audioSpeakerOff");

  return (
    <div className={`editor${connected ? "" : " is-offline"}`}>
      <header className="editor-header">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">s-1</span>
          <div className="brand-text">
            <h1>{t("appTitle")}</h1>
            <p className="subtitle">{t("appSubtitle")}</p>
          </div>
        </div>

        <div className="status-strip">
          <TempoBadge />

          {!isWebMidiSupported() && (
            <span className="badge badge-warn">{t("webMidiUnavailable")}</span>
          )}
          {noMidiIn && (
            <span className="badge badge-warn">{t("noMidiInputPort")}</span>
          )}
          {connected && unsynced > 0 && (
            <span className="badge badge-warn">{t("unsyncedCount", { n: unsynced })}</span>
          )}
        </div>

        <div className="header-actions">
          <LanguageToggle />
          <ThemeToggle />
          {isAudioInputSupported() && (
            <button
              type="button"
              className={`btn btn-ghost btn-icon${audioMonitor ? " btn-icon-active" : ""}`}
              title={speakerLabel}
              aria-label={speakerLabel}
              aria-pressed={audioMonitor}
              onClick={() => void toggleSpeaker()}
            >
              <SpeakerIcon muted={!audioMonitor} />
            </button>
          )}
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            title={t("snapshots")}
            aria-label={t("snapshots")}
            onClick={() => setSnapshotsOpen(true)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M4 7h16M4 12h16M4 17h10"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            title={t("openReferenceTitle")}
            aria-label={t("openReference")}
            onClick={() => setReferenceOpen(true)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M8 7h8M8 11h6"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </header>

      <div className="transport-bar">
        <div className="transport-screen" role="status">
          <span className="transport-state">
            <span className={`transport-led${connected ? (transportInfo?.isMock ? " is-mock" : " is-live") : ""}`} />
            {connected ? (transportInfo?.isMock ? t("mock") : t("live")) : t("offline")}
          </span>
          <span className="transport-field">
            <em>{t("channel")}</em>
            {String(channel).padStart(2, "0")}
          </span>
          <span className="transport-field">
            <em>{t("out")}</em>
            {outputLabel || portLabel(midiOutputs, selectedOutputId)}
          </span>
          <span className="transport-field">
            <em>in</em>
            {transportInfo?.input || portLabel(midiInputs, selectedInputId)}
          </span>
          {isAudioInputSupported() && (
            <span className={`transport-field${audioActive ? " is-on" : ""}`}>
              <em>usb</em>
              {audioActive ? "on" : "off"}
            </span>
          )}
        </div>

        {!connected && (
          <button
            type="button"
            className={`btn btn-icon${setupOpen ? " btn-icon-active" : ""}`}
            title={t("connectionSettings")}
            aria-label={t("connectionSettings")}
            aria-expanded={setupOpen}
            aria-controls="transport-setup"
            onClick={() => setSetupOpen((v) => !v)}
          >
            <KeyIcon name="setup" />
          </button>
        )}

        <div className="transport-keys">
          {!connected ? (
            <button type="button" className="btn btn-primary btn-key" disabled={connecting} onClick={handleConnect}>
              <KeyIcon name="connect" />
              {connecting ? t("connecting") : t("connect")}
            </button>
          ) : (
            <>
              <button type="button" className="btn btn-key" onClick={() => store.sendTestNote()}>
                <KeyIcon name="note" />
                {t("testNote")}
              </button>
              <button
                type="button"
                className="btn btn-key"
                title={t("sendAllTitle")}
                onClick={() => void store.sendAll()}
              >
                <KeyIcon name="send" />
                {t("sendAll")}
              </button>
              <button
                type="button"
                className="btn btn-key"
                title={t("initSquareTitle")}
                onClick={() => void store.sendInitSquare()}
              >
                <KeyIcon name="init" />
                {t("initSquare")}
              </button>
              <span className="transport-sep" aria-hidden="true" />
              <button type="button" className="btn btn-key btn-panic" onClick={() => store.panic()}>
                <KeyIcon name="panic" />
                {t("panic")}
              </button>
              <button type="button" className="btn btn-key btn-ghost" onClick={handleDisconnect}>
                <KeyIcon name="disconnect" />
                {t("disconnect")}
              </button>
            </>
          )}
        </div>
      </div>

      {!connected && setupOpen && (
        <div className="transport-setup" id="transport-setup">
          <label className="channel-input">
            {t("channel")}
            <input
              type="number"
              min={1}
              max={16}
              value={channel}
              disabled={connected}
              onChange={(e) => store.setChannel(Number(e.target.value))}
            />
          </label>
          {isWebMidiSupported() && (
            <>
              <label className="port-select">
                {t("midiOut")}
                <select
                  value={selectedOutputId}
                  onChange={(e) => setSelectedOutputId(e.target.value)}
                >
                  <option value="">{t("autoDetectS1")}</option>
                  {midiOutputs.map((port) => (
                    <option key={port.id} value={port.id}>
                      {port.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="port-select">
                {t("midiIn")}
                <select
                  value={selectedInputId}
                  onChange={(e) => setSelectedInputId(e.target.value)}
                >
                  <option value="">{t("autoDetectS1")}</option>
                  {midiInputs.map((port) => (
                    <option key={port.id} value={port.id}>
                      {port.name}
                    </option>
                  ))}
                </select>
              </label>
              {isAudioInputSupported() && (
                <label className="port-select">
                  {t("audioIn")}
                  <select
                    value={selectedAudioId}
                    onChange={(e) => setSelectedAudioId(e.target.value)}
                  >
                    <option value="">{t("autoDetectS1")}</option>
                    {audioInputs.map((port) => (
                      <option key={port.deviceId} value={port.deviceId}>
                        {port.label}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="mock-toggle">
                {t("mockMidi")}
                <input
                  type="checkbox"
                  checked={useMock}
                  onChange={(e) => setUseMock(e.target.checked)}
                />
              </label>
            </>
          )}
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}
      {audioError && <div className="alert alert-error">{audioError}</div>}

      {!connected && (
        <div className="alert alert-info">
          <strong>{t("connectHintTitle")}</strong> {connectBefore}
          <strong>AIRA LINK</strong>
          {connectAfter}
        </div>
      )}

      {connected && !transportInfo?.isMock && (
        <div className="alert alert-info">
          {t("liveHint")}
        </div>
      )}

      {connected && (midiActivity.inbound || midiActivity.outbound) && (
        <div className="midi-activity">
          {midiActivity.outbound && <span>{midiActivity.outbound}</span>}
          {midiActivity.inbound && <span>{midiActivity.inbound}</span>}
        </div>
      )}

      <div className="dash-top">
        <SectionCard title={t("oscilloscope")} className="scope-panel" index={0} colorIndex={3}>
          <UsbAudioWaveform
            analyser={audioAnalysers?.waveform ?? null}
            active={audioActive}
          />
        </SectionCard>

        <div className="dash-vizs">
          {VIZ_SECTIONS.map((section) => (
            <SectionCard
              key={section}
              title={SECTION_LABELS[section]}
              className="viz-only-card"
              colorIndex={SECTION_ORDER.indexOf(section)}
            >
              <SectionVisualizer
                section={section}
                getVal={getVal}
                audioAnalysers={audioAnalysers}
                audioActive={audioActive}
                noteOnGeneration={store.getNoteOnGeneration()}
              />
            </SectionCard>
          ))}
        </div>
      </div>

      <div className="sections-grid">
        {SECTION_ORDER.map((section, i) => {
          const defs = getParamsBySection(section);
          const sectionStates = defs
            .map((d) => store.getState(d.id))
            .filter((s): s is NonNullable<typeof s> => s != null);
          return (
            <SectionCard key={section} title={SECTION_LABELS[section]} index={i + 1} colorIndex={i}>
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
          {t("footer")}
        </p>
      </footer>

      <ReferenceModal open={referenceOpen} onClose={() => setReferenceOpen(false)} />
      <SnapshotsPanel store={store} open={snapshotsOpen} onClose={() => setSnapshotsOpen(false)} />
    </div>
  );
}
