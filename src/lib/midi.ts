import { t } from "./messages";

export const MIDI_NO_INPUT = "";

export interface MidiTransport {
  readonly isMock: boolean;
  readonly inputName: string;
  readonly outputName: string;
  connect(): void;
  disconnect(): void;
  sendCC(channel: number, cc: number, value: number): void;
  sendProgramChange(channel: number, program: number): void;
  sendNoteOn(channel: number, note: number, velocity?: number): void;
  sendNoteOff(channel: number, note: number): void;
  onMessage: ((data: Uint8Array) => void) | null;
}

const ECHO_GUARD_MS = 50;

function clampMidi(value: number): number {
  return Math.max(0, Math.min(127, Math.round(value)));
}

function clampChannel(channel: number): number {
  return Math.max(1, Math.min(16, Math.round(channel)));
}

export function isWebMidiSupported(): boolean {
  return typeof navigator !== "undefined" && "requestMIDIAccess" in navigator;
}

export function isLikelyS1Port(name: string): boolean {
  const n = name.toLowerCase();
  return (
    /s-?1/.test(n) ||
    /aira\s*compact/.test(n) ||
    /compact.*s-?1/.test(n) ||
    /digital audio interface.*s-?1/.test(n)
  );
}

export interface MidiPortInfo {
  id: string;
  name: string;
  manufacturer: string;
}

export interface MidiPortPair {
  inputs: MidiPortInfo[];
  outputs: MidiPortInfo[];
  suggestedInputId?: string;
  suggestedOutputId?: string;
}

function portInfo(port: MIDIInput | MIDIOutput): MidiPortInfo {
  return {
    id: port.id,
    name: port.name || "Unnamed port",
    manufacturer: port.manufacturer || "",
  };
}

function normalizePortBase(name: string): string {
  return name
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/\s*(midi\s*)?(in|out|input|output)\s*$/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function scoreS1Port(name: string, manufacturer: string): number {
  let score = 0;
  const n = name.toLowerCase();
  const m = manufacturer.toLowerCase();
  if (/s-?1/.test(n)) score += 10;
  if (/digital audio interface/.test(n)) score += 8;
  if (/aira\s*compact/.test(n)) score += 6;
  if (/roland/.test(m)) score += 4;
  if (/s-?1/.test(m)) score += 6;
  return score;
}

function pickBestPort<T extends MIDIInput | MIDIOutput>(ports: T[]): T | undefined {
  if (ports.length === 0) return undefined;
  const ranked = [...ports].sort(
    (a, b) =>
      scoreS1Port(b.name ?? "", b.manufacturer ?? "") -
      scoreS1Port(a.name ?? "", a.manufacturer ?? ""),
  );
  const bestScore = scoreS1Port(ranked[0].name ?? "", ranked[0].manufacturer ?? "");
  if (bestScore > 0) return ranked[0];
  return ranked[0];
}

function findPairedPorts(access: MIDIAccess): { input?: MIDIInput; output?: MIDIOutput } {
  const inputs = [...access.inputs.values()];
  const outputs = [...access.outputs.values()];
  const output = pickBestPort(outputs);
  if (!output) return {};

  const outBase = normalizePortBase(output.name ?? "");
  const s1Inputs = inputs.filter(
    (p) =>
      isLikelyS1Port(p.name ?? "") ||
      isLikelyS1Port(p.manufacturer ?? "") ||
      normalizePortBase(p.name ?? "") === outBase,
  );
  const input =
    s1Inputs.find((p) => normalizePortBase(p.name ?? "") === outBase) ??
    pickBestPort(s1Inputs) ??
    pickBestPort(inputs);

  return { input, output };
}

export async function listMidiPorts(): Promise<MidiPortPair> {
  const access = await requestWebMidiAccess();
  const inputs = [...access.inputs.values()].map(portInfo);
  const outputs = [...access.outputs.values()].map(portInfo);
  const { input, output } = findPairedPorts(access);
  return {
    inputs,
    outputs,
    suggestedInputId: input?.id,
    suggestedOutputId: output?.id,
  };
}

function getPortById(access: MIDIAccess, id: string | undefined, direction: "input" | "output") {
  if (!id) return undefined;
  const map = direction === "input" ? access.inputs : access.outputs;
  return map.get(id);
}

export async function requestWebMidiAccess(): Promise<MIDIAccess> {
  if (!isWebMidiSupported()) {
    throw new Error(t("midiUnsupported"));
  }
  return navigator.requestMIDIAccess();
}

export class WebMidiTransport implements MidiTransport {
  readonly isMock = false;
  inputName = "";
  outputName = "";
  onMessage: ((data: Uint8Array) => void) | null = null;

  private access: MIDIAccess | null = null;
  private input: MIDIInput | null = null;
  private output: MIDIOutput | null = null;
  private recentSent = new Map<string, number>();

  constructor(
    private readonly inputId?: string,
    private readonly outputId?: string,
  ) {}

  static async create(options?: {
    inputId?: string;
    outputId?: string;
  }): Promise<WebMidiTransport> {
    const access = await requestWebMidiAccess();
    const paired = findPairedPorts(access);
    const output =
      getPortById(access, options?.outputId, "output") ??
      paired.output ??
      pickBestPort([...access.outputs.values()]);
    const input =
      getPortById(access, options?.inputId, "input") ??
      paired.input ??
      pickBestPort([...access.inputs.values()]);

    if (!output) {
      throw new Error(t("midiNoOutput"));
    }

    const transport = new WebMidiTransport(input?.id, output.id);
    transport.access = access;
    transport.input = input ?? null;
    transport.output = output;
    transport.inputName = input?.name ?? MIDI_NO_INPUT;
    transport.outputName = output.name ?? t("unknownPort");
    return transport;
  }

  connect(): void {
    if (this.input) {
      this.input.onmidimessage = (event) => {
        if (event.data) this.onMessage?.(event.data);
      };
      if (!this.input.connection || this.input.connection === "closed") {
        this.input.open?.();
      }
    }
    if (this.output && (!this.output.connection || this.output.connection === "closed")) {
      this.output.open?.();
    }
  }

  disconnect(): void {
    if (this.input) this.input.onmidimessage = null;
    this.onMessage = null;
  }

  private recordSent(channel: number, cc: number): void {
    this.recentSent.set(`${channel}:${cc}`, Date.now());
  }

  shouldIgnoreEcho(channel: number, cc: number): boolean {
    const key = `${channel}:${cc}`;
    const sentAt = this.recentSent.get(key);
    if (sentAt == null) return false;
    if (Date.now() - sentAt < ECHO_GUARD_MS) return true;
    this.recentSent.delete(key);
    return false;
  }

  sendCC(channel: number, cc: number, value: number): void {
    if (!this.output) return;
    const ch = clampChannel(channel);
    const v = clampMidi(value);
    this.recordSent(ch, cc);
    this.output.send([0xb0 | (ch - 1), cc, v]);
  }

  sendProgramChange(channel: number, program: number): void {
    if (!this.output) return;
    const ch = clampChannel(channel);
    this.output.send([0xc0 | (ch - 1), clampMidi(program)]);
  }

  sendNoteOn(channel: number, note: number, velocity = 100): void {
    if (!this.output) return;
    const ch = clampChannel(channel);
    this.output.send([0x90 | (ch - 1), clampMidi(note), clampMidi(velocity)]);
  }

  sendNoteOff(channel: number, note: number): void {
    if (!this.output) return;
    const ch = clampChannel(channel);
    this.output.send([0x80 | (ch - 1), clampMidi(note), 0]);
  }
}

/** Mock transport for development without hardware. Echoes sent CCs back after a short delay. */
export class MockMidiTransport implements MidiTransport {
  readonly isMock = true;
  readonly inputName = "Mock S-1 Input";
  readonly outputName = "Mock S-1 Output";
  onMessage: ((data: Uint8Array) => void) | null = null;

  private connected = false;
  private recentSent = new Map<string, number>();

  connect(): void {
    this.connected = true;
  }

  disconnect(): void {
    this.connected = false;
    this.onMessage = null;
  }

  shouldIgnoreEcho(channel: number, cc: number): boolean {
    const key = `${channel}:${cc}`;
    const sentAt = this.recentSent.get(key);
    if (sentAt == null) return false;
    if (Date.now() - sentAt < ECHO_GUARD_MS) return true;
    this.recentSent.delete(key);
    return false;
  }

  private echo(data: number[]): void {
    if (!this.connected || !this.onMessage) return;
    window.setTimeout(() => this.onMessage?.(new Uint8Array(data)), 20);
  }

  sendCC(channel: number, cc: number, value: number): void {
    const ch = clampChannel(channel);
    const v = clampMidi(value);
    this.recentSent.set(`${ch}:${cc}`, Date.now());
    this.echo([0xb0 | (ch - 1), cc, v]);
  }

  sendProgramChange(channel: number, program: number): void {
    const ch = clampChannel(channel);
    this.echo([0xc0 | (ch - 1), clampMidi(program)]);
  }

  sendNoteOn(channel: number, note: number, velocity = 100): void {
    const ch = clampChannel(channel);
    this.echo([0x90 | (ch - 1), clampMidi(note), clampMidi(velocity)]);
  }

  sendNoteOff(channel: number, note: number): void {
    const ch = clampChannel(channel);
    this.echo([0x80 | (ch - 1), clampMidi(note), 0]);
  }
}

export function parseMidiMessage(data: Uint8Array): {
  type: "cc" | "program" | "noteOn" | "noteOff" | "other";
  channel: number;
  cc?: number;
  value?: number;
  program?: number;
  note?: number;
  velocity?: number;
} | null {
  if (data.length < 2) return null;
  const status = data[0];
  const channel = (status & 0x0f) + 1;
  const command = status & 0xf0;

  if (command === 0xb0 && data.length >= 3) {
    return { type: "cc", channel, cc: data[1], value: data[2] };
  }
  if (command === 0xc0 && data.length >= 2) {
    return { type: "program", channel, program: data[1] };
  }
  if (command === 0x90 && data.length >= 3) {
    if (data[2] === 0) return { type: "noteOff", channel, note: data[1], velocity: 0 };
    return { type: "noteOn", channel, note: data[1], velocity: data[2] };
  }
  if (command === 0x80 && data.length >= 3) {
    return { type: "noteOff", channel, note: data[1], velocity: data[2] };
  }
  return { type: "other", channel };
}

export async function sendAllParameters(
  transport: MidiTransport,
  channel: number,
  entries: Array<{ cc: number; value: number; exclude?: boolean }>,
  delayMs = 5,
): Promise<void> {
  for (const entry of entries) {
    if (entry.exclude) continue;
    transport.sendCC(channel, entry.cc, entry.value);
    await new Promise((r) => setTimeout(r, delayMs));
  }
}

export function sendPanic(transport: MidiTransport, channel: number): void {
  transport.sendCC(channel, 120, 0);
  transport.sendCC(channel, 123, 0);
}
