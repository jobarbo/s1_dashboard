export type S1Section =
  | "controls"
  | "lfo"
  | "voice"
  | "oscillator"
  | "filter"
  | "envelope"
  | "effects";

export type ParameterType =
  | "continuous"
  | "toggle"
  | "dropdown"
  | "bipolar";

export interface S1ParameterDef {
  id: string;
  name: string;
  cc: number;
  section: S1Section;
  type: ParameterType;
  initialValue: number;
  options?: readonly string[];
  /** Exclude from Send All bulk */
  excludeBulkSend?: boolean;
  /** Named cluster inside a section (Mix, Chord, etc.) */
  group?: string;
  /**
   * Value shown on the S-1 (TEMPO/VALUE is 0–255 for most knobs).
   * MIDI CC is still 0–127. Omit for 0–127 (toggles/dropdowns).
   */
  displayMax?: number;
}

export const SECTION_LABELS: Record<S1Section, string> = {
  controls: "Controls",
  lfo: "LFO",
  voice: "Voice",
  oscillator: "Oscillator",
  filter: "Filter",
  envelope: "Envelope",
  effects: "Effects",
};

export const SECTION_ORDER: S1Section[] = [
  "lfo",
  "oscillator",
  "filter",
  "envelope",
  "effects",
  "voice",
  "controls",
];

export const VIZ_SECTIONS: S1Section[] = ["lfo", "oscillator", "filter", "envelope"];

/** CC numbers excluded from Send All (sustain pedal). */
export const NO_BULK_SEND = new Set([64]);

export const S1_PARAMETERS: S1ParameterDef[] = [
  // Controls
  { id: "mod-wheel", name: "Mod Wheel", cc: 1, section: "controls", type: "continuous", initialValue: 0 },
  { id: "exp-pedal", name: "Exp Pedal", cc: 11, section: "controls", type: "continuous", initialValue: 127 },
  { id: "damper", name: "Damper Pedal", cc: 64, section: "controls", type: "toggle", initialValue: 0, excludeBulkSend: true },

  // LFO
  { id: "lfo-rate", name: "Rate", cc: 3, section: "lfo", type: "continuous", initialValue: 64 },
  {
    id: "lfo-waveform",
    name: "Waveform",
    cc: 12,
    section: "lfo",
    type: "dropdown",
    initialValue: 0,
    options: ["Sawtooth", "Inv Saw", "Triangle", "Square", "Random", "Noise"],
  },
  { id: "lfo-mod-depth", name: "Mod Depth", cc: 17, section: "lfo", type: "continuous", initialValue: 0 },
  {
    id: "lfo-mode",
    name: "Mode",
    cc: 79,
    section: "lfo",
    type: "dropdown",
    initialValue: 0,
    options: ["Normal", "Fast"],
  },
  {
    id: "lfo-key-trigger",
    name: "Key Trigger",
    cc: 105,
    section: "lfo",
    type: "dropdown",
    initialValue: 0,
    options: ["Off", "On"],
  },
  {
    id: "lfo-sync",
    name: "Sync",
    cc: 106,
    section: "lfo",
    type: "dropdown",
    initialValue: 0,
    options: ["Off", "On"],
  },

  // Voice
  { id: "glide-time", name: "Glide Time", cc: 5, section: "voice", type: "continuous", initialValue: 0 },
  { id: "pan", name: "Pan", cc: 10, section: "voice", type: "continuous", initialValue: 64 },
  {
    id: "portamento-mode",
    name: "Portamento",
    cc: 31,
    section: "voice",
    type: "dropdown",
    initialValue: 0,
    options: ["Off", "Auto", "On"],
  },
  { id: "portamento", name: "Porta On", cc: 65, section: "voice", type: "toggle", initialValue: 0 },
  { id: "transpose", name: "Transpose", cc: 77, section: "voice", type: "bipolar", initialValue: 64 },
  {
    id: "polyphony",
    name: "Polyphony",
    cc: 80,
    section: "voice",
    type: "dropdown",
    initialValue: 0,
    options: ["Mono", "Unison", "Poly", "Chord"],
  },
  { id: "ch-v2", name: "Ch V2 On/Off", cc: 81, section: "voice", type: "toggle", initialValue: 0, group: "Chord" },
  { id: "ch-v3", name: "Ch V3 On/Off", cc: 82, section: "voice", type: "toggle", initialValue: 0, group: "Chord" },
  { id: "ch-v4", name: "Ch V4 On/Off", cc: 83, section: "voice", type: "toggle", initialValue: 0, group: "Chord" },
  { id: "v2-shift", name: "V2 Key Shift", cc: 85, section: "voice", type: "bipolar", initialValue: 64, group: "Chord" },
  { id: "v3-shift", name: "V3 Key Shift", cc: 86, section: "voice", type: "bipolar", initialValue: 64, group: "Chord" },
  { id: "v4-shift", name: "V4 Key Shift", cc: 87, section: "voice", type: "bipolar", initialValue: 64, group: "Chord" },

  // Oscillator
  { id: "osc-lfo-pitch", name: "LFO Pitch", cc: 13, section: "oscillator", type: "continuous", initialValue: 0, group: "Pitch / PWM" },
  {
    id: "osc-range",
    name: "Range",
    cc: 14,
    section: "oscillator",
    type: "dropdown",
    initialValue: 0,
    options: ["64'", "32'", "16'", "8'", "4'", "2'"],
  },
  { id: "square-pw", name: "Square PW", cc: 15, section: "oscillator", type: "continuous", initialValue: 64, group: "Pitch / PWM" },
  {
    id: "pwm-source",
    name: "PWM Source",
    cc: 16,
    section: "oscillator",
    type: "dropdown",
    initialValue: 0,
    options: ["Envelope", "Manual", "LFO"],
  },
  { id: "osc-bend", name: "Bend Amount", cc: 18, section: "oscillator", type: "continuous", initialValue: 0, group: "Pitch / PWM" },
  { id: "square-level", name: "Square", cc: 19, section: "oscillator", type: "continuous", initialValue: 127, group: "Mix" },
  { id: "saw-level", name: "Saw", cc: 20, section: "oscillator", type: "continuous", initialValue: 0, group: "Mix" },
  { id: "sub-level", name: "Sub", cc: 21, section: "oscillator", type: "continuous", initialValue: 0, group: "Mix" },
  {
    id: "sub-oct",
    name: "Sub Oct Type",
    cc: 22,
    section: "oscillator",
    type: "dropdown",
    initialValue: 0,
    options: ["-2 Oct Asym", "-2 Oct", "-1 Oct"],
  },
  { id: "noise-level", name: "Noise", cc: 23, section: "oscillator", type: "continuous", initialValue: 0, group: "Mix" },
  { id: "fine-tune", name: "Fine Tune", cc: 76, section: "oscillator", type: "bipolar", initialValue: 64, group: "Pitch / PWM" },
  {
    id: "noise-mode",
    name: "Noise Mode",
    cc: 78,
    section: "oscillator",
    type: "dropdown",
    initialValue: 0,
    options: ["Pink", "White"],
  },
  { id: "draw-multiply", name: "Draw Multiply", cc: 102, section: "oscillator", type: "continuous", initialValue: 0, group: "Draw / Chop" },
  { id: "chop-overtone", name: "Chop Overtone", cc: 103, section: "oscillator", type: "continuous", initialValue: 0, group: "Draw / Chop" },
  { id: "chop-comb", name: "Chop Comb", cc: 104, section: "oscillator", type: "continuous", initialValue: 0, group: "Draw / Chop" },
  {
    id: "draw-sw",
    name: "Draw",
    cc: 107,
    section: "oscillator",
    type: "dropdown",
    initialValue: 0,
    options: ["Off", "Step", "Slope"],
  },

  // Filter
  { id: "filter-cutoff", name: "Cutoff", cc: 74, section: "filter", type: "continuous", initialValue: 127, group: "Tone" },
  { id: "filter-reso", name: "Resonance", cc: 71, section: "filter", type: "continuous", initialValue: 0, group: "Tone" },
  { id: "filter-env", name: "Env Amount", cc: 24, section: "filter", type: "continuous", initialValue: 0, group: "Mod" },
  { id: "filter-lfo", name: "LFO Amount", cc: 25, section: "filter", type: "continuous", initialValue: 0, group: "Mod" },
  { id: "filter-keytrack", name: "Keytracking", cc: 26, section: "filter", type: "continuous", initialValue: 0, group: "Mod" },
  { id: "filter-bend", name: "Bend Amount", cc: 27, section: "filter", type: "continuous", initialValue: 0, group: "Mod" },

  // Envelope
  {
    id: "amp-env-mode",
    name: "Amp Env Mode",
    cc: 28,
    section: "envelope",
    type: "dropdown",
    initialValue: 0,
    options: ["Gate", "Envelope"],
  },
  {
    id: "env-trigger",
    name: "Trigger Mode",
    cc: 29,
    section: "envelope",
    type: "dropdown",
    initialValue: 1,
    options: ["LFO", "Gate", "Gate+Trig"],
  },
  { id: "env-attack", name: "Attack", cc: 73, section: "envelope", type: "continuous", initialValue: 0 },
  { id: "env-decay", name: "Decay", cc: 75, section: "envelope", type: "continuous", initialValue: 0 },
  { id: "env-sustain", name: "Sustain", cc: 30, section: "envelope", type: "continuous", initialValue: 127 },
  { id: "env-release", name: "Release", cc: 72, section: "envelope", type: "continuous", initialValue: 0 },

  // Effects (MIDI CCs only — deeper menus: see Reference modal)
  { id: "reverb-time", name: "Time", cc: 89, section: "effects", type: "continuous", initialValue: 64, group: "Reverb" },
  { id: "reverb-level", name: "Level", cc: 91, section: "effects", type: "continuous", initialValue: 0, group: "Reverb" },
  { id: "delay-time", name: "Time", cc: 90, section: "effects", type: "continuous", initialValue: 64, group: "Delay" },
  { id: "delay-level", name: "Level", cc: 92, section: "effects", type: "continuous", initialValue: 0, group: "Delay" },
  {
    id: "chorus-type",
    name: "Type",
    cc: 93,
    section: "effects",
    type: "dropdown",
    initialValue: 0,
    group: "Chorus",
    options: ["Off", "Type 1", "Type 2", "Type 3", "Type 4"],
  },
];

export const PARAM_BY_CC = new Map(S1_PARAMETERS.map((p) => [p.cc, p]));
export const PARAM_BY_ID = new Map(S1_PARAMETERS.map((p) => [p.id, p]));

export function getParamsBySection(section: S1Section): S1ParameterDef[] {
  return S1_PARAMETERS.filter((p) => p.section === section);
}

/** Map CC value to dropdown index. Small values (0..n-1) map directly; knob positions use buckets.
 * Visualizers that follow a dropdown (LFO waveform, Draw, Sync, Sub Oct) must use this, not raw 0–127 buckets. */

export function ccToOptionIndex(value: number, optionCount: number): number {
  if (optionCount <= 1) return 0;
  const v = Math.max(0, Math.min(127, Math.round(value)));
  if (v < optionCount) return v;
  const idx = Math.floor((v / 128) * optionCount);
  return Math.min(optionCount - 1, Math.max(0, idx));
}

/** Map dropdown index to CC value for outgoing messages.
 * S-1 discrete menus use 0..n-1 (e.g. chorus Off/1/2/3/4). Do not send 0–127 bucket
 * centers — values above n-1 are ignored or clamped, so only the first change appears to work. */
export function optionIndexToCc(index: number, optionCount: number): number {
  if (optionCount <= 1) return 0;
  return Math.min(optionCount - 1, Math.max(0, index));
}

export function paramDisplayMax(def: S1ParameterDef): number {
  if (def.displayMax != null) return def.displayMax;
  return def.type === "continuous" ? 255 : 127;
}

/** S-1 panel/VALUE readout (0–255) from a 7-bit CC. */
export function ccToDisplayValue(cc: number, displayMax: number): number {
  const v = Math.max(0, Math.min(127, Math.round(cc)));
  if (displayMax <= 127) return v;
  return Math.round((v * displayMax) / 127);
}

/** 7-bit CC from an S-1 display value. */
export function displayValueToCc(display: number, displayMax: number): number {
  const d = Math.max(0, Math.min(displayMax, Math.round(display)));
  if (displayMax <= 127) return d;
  return Math.round((d * 127) / displayMax);
}

export function formatParameterValue(def: S1ParameterDef, value: number): string {
  if (def.type === "bipolar") {
    const semitones = value - 64;
    return semitones > 0 ? `+${semitones}` : `${semitones}`;
  }
  if (def.type === "toggle") {
    return value >= 64 ? "On" : "Off";
  }
  if (def.type === "dropdown" && def.options) {
    const idx = ccToOptionIndex(value, def.options.length);
    return def.options[idx] ?? String(value);
  }
  return String(ccToDisplayValue(value, paramDisplayMax(def)));
}

export function getCcForToggle(on: boolean): number {
  return on ? 127 : 0;
}

export function isToggleOn(value: number): boolean {
  return value >= 64;
}
