/** Heuristic visualizer math — estimated from CC values, not hardware dumps. */

import { ccToOptionIndex } from "./parameters";

/** Cycles shown across the LFO / oscillator canvases (1 = fully zoomed in). */
export const WAVEFORM_DISPLAY_CYCLES = 2.5;

export function modEnvTimeSeconds(cc: number, maxSecs: number): number {
  const n = Math.max(0, Math.min(127, cc)) / 127;
  return 0.001 + n * n * maxSecs;
}

export const ADSR_MAX = {
  attack: 3.57,
  decay: 15.0,
  release: 19.5,
} as const;

export interface AdsrPoint {
  t: number;
  level: number;
}

export function buildAdsrEnvelope(
  attackCc: number,
  decayCc: number,
  sustainCc: number,
  releaseCc: number,
  totalDuration = 4,
): AdsrPoint[] {
  const attack = modEnvTimeSeconds(attackCc, ADSR_MAX.attack);
  const decay = modEnvTimeSeconds(decayCc, ADSR_MAX.decay);
  const release = modEnvTimeSeconds(releaseCc, ADSR_MAX.release);
  const sustain = sustainCc / 127;

  const sustainHold = Math.max(0.2, totalDuration * 0.35);
  const points: AdsrPoint[] = [{ t: 0, level: 0 }];

  points.push({ t: attack, level: 1 });
  points.push({ t: attack + decay, level: sustain });
  points.push({ t: attack + decay + sustainHold, level: sustain });
  points.push({ t: attack + decay + sustainHold + release, level: 0 });

  return points;
}

export function adsrSegmentWidths(
  width: number,
  attackCc: number,
  decayCc: number,
  releaseCc: number,
): { attack: number; decay: number; sustain: number; release: number } {
  const attack = attackCc > 0 ? width * (0.05 + (attackCc / 127) * 0.18) : 0;
  const decay = decayCc > 0 ? width * (0.05 + (decayCc / 127) * 0.22) : 0;
  const sustain = width * 0.28;
  const release = releaseCc > 0 ? width * (0.05 + (releaseCc / 127) * 0.22) : 0;
  return { attack, decay, sustain, release };
}

export function adsrHasRise(attackCc: number, decayCc: number, sustainCc: number): boolean {
  return attackCc > 0 || decayCc > 0 || sustainCc > 0;
}

/** Deterministic -1..1 from an integer, for S&H / noise traces that stay stable while scrolling. */
function hashSigned(n: number): number {
  const s = Math.sin(n * 12.9898) * 43758.5453;
  return (s - Math.floor(s)) * 2 - 1;
}

export function sampleWaveform(
  type: "saw" | "invSaw" | "triangle" | "square" | "random" | "noise",
  phase: number,
  pulseWidth = 0.5,
): number {
  const p = ((phase % 1) + 1) % 1;
  switch (type) {
    case "saw":
      return 2 * p - 1;
    case "invSaw":
      return 1 - 2 * p;
    case "triangle":
      return p < 0.5 ? 4 * p - 1 : 3 - 4 * p;
    case "square":
      return p < pulseWidth ? 1 : -1;
    case "random":
      // Sample-and-hold: stepped levels, not a lumpy sine.
      return hashSigned(Math.floor(phase * 8));
    case "noise":
      return hashSigned(Math.floor(phase * 96));
    default:
      return 0;
  }
}

/** Schematic 16-step DRAW table (real table is PRM-only). */
const DRAW_PREVIEW = [
  -0.2, 0.4, 0.9, 0.6, -0.1, -0.7, -0.4, 0.2, 0.85, 0.3, -0.5, -0.9, -0.2, 0.5, 1, -0.15,
];

export function sampleDrawWaveform(drawMode: number, phase: number): number {
  const steps = DRAW_PREVIEW.length;
  const p = ((phase % 1) + 1) % 1;
  const idx = Math.min(steps - 1, Math.floor(p * steps));
  if (drawMode === 1) return DRAW_PREVIEW[idx];
  const next = DRAW_PREVIEW[(idx + 1) % steps];
  const t = p * steps - idx;
  return DRAW_PREVIEW[idx] + (next - DRAW_PREVIEW[idx]) * t;
}

export const LFO_WAVEFORMS = ["saw", "invSaw", "triangle", "square", "random", "noise"] as const;
export type LfoWaveform = (typeof LFO_WAVEFORMS)[number];

export function lfoWaveformFromCc(value: number): LfoWaveform {
  const idx = ccToOptionIndex(value, LFO_WAVEFORMS.length);
  return LFO_WAVEFORMS[idx];
}

export function lfoRateHz(rateCc: number, syncOn: boolean): number {
  if (syncOn) return 0.5 + (rateCc / 127) * 8;
  return 0.05 + Math.pow(rateCc / 127, 2) * 20;
}

/** Cutoff CC after filter envelope. Not clamped so the env curve can sit above a wide-open filter. */
export function filterCutoffWithEnv(cutoffCc: number, envCc: number, envLevel = 1): number {
  return cutoffCc + (Math.max(0, Math.min(127, envCc)) / 127) * 127 * envLevel;
}

/** Log frequency 0–1 along the filter/spectrum x axis (Nyquist at the right). */
export function filterFreqNormAtX(x: number, width: number): number {
  const min = 0.015;
  const max = 1;
  const t = Math.max(0, Math.min(1, x / Math.max(1, width - 1)));
  return min * Math.pow(max / min, t);
}

export function filterResponseDb(freqNorm: number, cutoffCc: number, resoCc: number): number {
  const cutoff = 0.02 + (cutoffCc / 127) * 0.98;
  const reso = resoCc / 127;
  const x = Math.max(0.001, freqNorm);
  const distance = Math.log2(x / cutoff);
  let db = -24 * Math.max(0, distance);
  const peakWidth = 0.08 + (1 - reso) * 0.12;
  const peak = Math.exp(-Math.pow(distance / peakWidth, 2)) * reso * 18;
  db += peak;
  return Math.max(-48, Math.min(12, db));
}

/** Mix gains for the osc viz. A single oscillator grows 0–127 instead of jumping to 100% at 1. */
export function oscMixLevels(values: {
  square: number;
  saw: number;
  sub: number;
  noise: number;
}): { square: number; saw: number; sub: number; noise: number } {
  const sum = values.square + values.saw + values.sub + values.noise;
  const scale = Math.max(127, sum) || 1;
  return {
    square: values.square / scale,
    saw: values.saw / scale,
    sub: values.sub / scale,
    noise: values.noise / scale,
  };
}

export function pulseWidthNorm(pwCc: number): number {
  return 0.05 + (pwCc / 127) * 0.9;
}
