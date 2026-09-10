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
import { ThemeToggle } from "./ThemeToggle";
import { UsbAudioWaveform } from "./visualizers/UsbAudioVisualizers";
import { useI18n } from "../lib/use-i18n";

let storeSingleton: PatchStore | null = null;

function getStore(): PatchStore {
  if (!storeSingleton) storeSingleton = createPatchStore();
  return storeSingleton;
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
  const [audioAnalysers, setAudioAnalysers] = useState<UsbAudioAnalysers | null>(null);
  const [referenceOpen, setReferenceOpen] = useState(false);
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
      setAudioError(err instanceof Error ? err.message : t("audioStartFailed"));
      setAudioActive(false);
    }
  }, [selectedAudioId, stopAudio, t]);

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

  return (
    <div className="editor">
      <header className="editor-header">
        <div className="brand">
          <h1>{t("appTitle")}</h1>
          <p className="subtitle">{t("appSubtitle")}</p>
        </div>

        <div className="header-actions">
          <LanguageToggle />
          <ThemeToggle />
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

          {!isWebMidiSupported() && (
            <span className="badge badge-warn">{t("webMidiUnavailable")}</span>
          )}
          {connected && transportInfo && (
            <span className="badge badge-ok">
              {transportInfo.isMock ? t("mock") : t("live")} · {t("out")}: {outputLabel}
            </span>
          )}
          {audioActive && <span className="badge badge-ok">{t("usbAudioLive")}</span>}
          {noMidiIn && (
            <span className="badge badge-warn">{t("noMidiInputPort")}</span>
          )}
          {connected && unsynced > 0 && (
            <span className="badge badge-warn">{t("unsyncedCount", { n: unsynced })}</span>
          )}

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

          {!connected ? (
            <>
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
              <button type="button" className="btn btn-primary" disabled={connecting} onClick={handleConnect}>
                {connecting ? t("connecting") : t("connect")}
              </button>
            </>
          ) : (
            <>
              <button type="button" className="btn" onClick={() => store.sendTestNote()}>
                {t("testNote")}
              </button>
              {isAudioInputSupported() && !transportInfo?.isMock && (
                audioActive ? (
                  <button type="button" className="btn btn-ghost" onClick={stopAudio}>
                    {t("stopAudio")}
                  </button>
                ) : (
                  <button type="button" className="btn" onClick={() => startAudio()}>
                    {t("startAudio")}
                  </button>
                )
              )}
              <button type="button" className="btn" onClick={() => store.sendAll()}>
                {t("sendAll")}
              </button>
              <button type="button" className="btn" onClick={() => store.panic()}>
                {t("panic")}
              </button>
              <button type="button" className="btn btn-ghost" onClick={handleDisconnect}>
                {t("disconnect")}
              </button>
            </>
          )}
        </div>
      </header>

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
        <SectionCard title={t("oscilloscope")} className="scope-panel">
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
                noteOnGeneration={store.getNoteOnGeneration()}
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
          {t("footer")}
        </p>
      </footer>

      <ReferenceModal open={referenceOpen} onClose={() => setReferenceOpen(false)} />
    </div>
  );
}
