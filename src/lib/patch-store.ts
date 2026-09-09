import {
  NO_BULK_SEND,
  PARAM_BY_CC,
  S1_PARAMETERS,
  type S1ParameterDef,
} from "./parameters";
import {
  parseMidiMessage,
  sendAllParameters,
  sendPanic,
  type MidiTransport,
} from "./midi";
import { ingestMidiRealtime } from "./midi-clock";

export interface ParameterState {
  def: S1ParameterDef;
  value: number;
  synced: boolean;
}

export type PatchStoreListener = () => void;

const STORAGE_KEY = "s1-editor-ui-values";

function loadStoredValues(): Record<string, number> {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, number>;
  } catch {
    return {};
  }
}

function saveStoredValues(values: Record<string, number>): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
  } catch {
    /* ignore quota errors */
  }
}

export class PatchStore {
  private states = new Map<string, ParameterState>();
  private listeners = new Set<PatchStoreListener>();
  private transport: MidiTransport | null = null;
  private channel = 3;
  private receiveChannel: number | null = null;
  private suppressSend = false;
  private lastInbound: string | null = null;
  private lastOutbound: string | null = null;
  private noteOnGeneration = 0;

  constructor() {
    const stored = loadStoredValues();
    for (const def of S1_PARAMETERS) {
      const value = stored[def.id] ?? def.initialValue;
      this.states.set(def.id, { def, value, synced: false });
    }
  }

  subscribe(listener: PatchStoreListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }

  getChannel(): number {
    return this.channel;
  }

  setChannel(channel: number): void {
    this.channel = Math.max(1, Math.min(16, channel));
    this.notify();
  }

  isConnected(): boolean {
    return this.transport != null;
  }

  getTransportInfo(): { input: string; output: string; isMock: boolean } | null {
    if (!this.transport) return null;
    return {
      input: this.transport.inputName,
      output: this.transport.outputName,
      isMock: this.transport.isMock,
    };
  }

  getReceiveChannel(): number | null {
    return this.receiveChannel;
  }

  getLastMidiActivity(): { inbound: string | null; outbound: string | null } {
    return { inbound: this.lastInbound, outbound: this.lastOutbound };
  }

  getAllStates(): ParameterState[] {
    return S1_PARAMETERS.map((def) => this.states.get(def.id)!);
  }

  getState(id: string): ParameterState | undefined {
    return this.states.get(id);
  }

  getValueByCc(cc: number): number | undefined {
    const def = PARAM_BY_CC.get(cc);
    if (!def) return undefined;
    return this.states.get(def.id)?.value;
  }

  get unsyncedCount(): number {
    return this.getAllStates().filter(
      (s) => !s.synced && !NO_BULK_SEND.has(s.def.cc),
    ).length;
  }

  connect(transport: MidiTransport, channel = 3): void {
    this.disconnect();
    this.transport = transport;
    this.channel = channel;
    this.receiveChannel = null;
    this.lastInbound = null;
    this.lastOutbound = null;
    this.resetAllSync();
    transport.onMessage = (data) => this.handleIncoming(data, transport);
    transport.connect();
    this.notify();
  }

  disconnect(): void {
    if (this.transport) {
      this.transport.disconnect();
      this.transport = null;
    }
    this.notify();
  }

  resetAllSync(): void {
    for (const state of this.states.values()) {
      state.synced = false;
    }
    this.notify();
  }

  markAllSynced(): void {
    for (const state of this.states.values()) {
      state.synced = true;
    }
    this.notify();
  }

  markSynced(id: string): void {
    const state = this.states.get(id);
    if (!state || state.synced) return;
    state.synced = true;
    this.notify();
  }

  setValue(id: string, value: number, options?: { fromMidi?: boolean; markSynced?: boolean }): void {
    const state = this.states.get(id);
    if (!state) return;
    const clamped = Math.max(0, Math.min(127, Math.round(value)));
    if (state.value === clamped) {
      if (options?.fromMidi || options?.markSynced) {
        if (!state.synced) {
          state.synced = true;
          this.notify();
        }
      }
      return;
    }

    state.value = clamped;
    if (options?.fromMidi || options?.markSynced) {
      state.synced = true;
    }

    this.persistValues();

    if (!options?.fromMidi && this.transport && !this.suppressSend) {
      this.transport.sendCC(this.channel, state.def.cc, clamped);
      this.lastOutbound = `Sent CC${state.def.cc}=${clamped} on ch ${this.channel}`;
      state.synced = true;
    }

    this.notify();
  }

  private persistValues(): void {
    const values: Record<string, number> = {};
    for (const [id, state] of this.states) {
      values[id] = state.value;
    }
    saveStoredValues(values);
  }

  getNoteOnGeneration(): number {
    return this.noteOnGeneration;
  }

  handleIncoming(data: Uint8Array, transport: MidiTransport): void {
    if (ingestMidiRealtime(data)) return;

    const msg = parseMidiMessage(data);
    if (!msg) return;

    if (msg.type === "cc" && msg.cc != null && msg.value != null) {
      this.receiveChannel = msg.channel;
      this.lastInbound = `Received CC${msg.cc}=${msg.value} on ch ${msg.channel}`;

      const def = PARAM_BY_CC.get(msg.cc);
      if (!def) {
        this.notify();
        return;
      }

      if ("shouldIgnoreEcho" in transport && transport.shouldIgnoreEcho(msg.channel, msg.cc)) {
        return;
      }

      this.setValue(def.id, msg.value, { fromMidi: true });
      return;
    }

    if (msg.type === "noteOn" || msg.type === "noteOff") {
      if (msg.type === "noteOn") this.noteOnGeneration += 1;
      this.lastInbound = `${msg.type === "noteOn" ? "Note on" : "Note off"} ${msg.note} ch ${msg.channel}`;
      this.notify();
    }
  }

  async sendAll(): Promise<void> {
    if (!this.transport) return;
    const entries = this.getAllStates().map((s) => ({
      cc: s.def.cc,
      value: s.value,
      exclude: NO_BULK_SEND.has(s.def.cc) || s.def.excludeBulkSend,
    }));
    await sendAllParameters(this.transport, this.channel, entries);
    for (const state of this.states.values()) {
      if (!NO_BULK_SEND.has(state.def.cc)) {
        state.synced = true;
      }
    }
    this.notify();
  }

  panic(): void {
    if (!this.transport) return;
    sendPanic(this.transport, this.channel);
  }

  sendNote(note: number, on: boolean, velocity = 100): void {
    if (!this.transport) return;
    if (on) {
      this.noteOnGeneration += 1;
      this.transport.sendNoteOn(this.channel, note, velocity);
      this.lastOutbound = `Sent note ${note} vel ${velocity} on ch ${this.channel}`;
    } else {
      this.transport.sendNoteOff(this.channel, note);
      this.lastOutbound = `Sent note off ${note} on ch ${this.channel}`;
    }
    this.notify();
  }

  sendTestNote(): void {
    this.sendNote(60, true, 100);
    window.setTimeout(() => this.sendNote(60, false), 200);
  }

  /** Load values without sending MIDI (e.g. after reconnect from localStorage). */
  applyValuesSilently(values: Record<string, number>): void {
    this.suppressSend = true;
    try {
      for (const [id, value] of Object.entries(values)) {
        if (this.states.has(id)) {
          this.setValue(id, value, { fromMidi: true });
        }
      }
    } finally {
      this.suppressSend = false;
    }
  }
}

export function createPatchStore(): PatchStore {
  return new PatchStore();
}
