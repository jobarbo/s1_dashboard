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
  const attack = attackCc <= 0 ? 0 : modEnvTimeSeconds(attackCc, ADSR_MAX.attack);
  const decay = decayCc <= 0 ? 0 : modEnvTimeSeconds(decayCc, ADSR_MAX.decay);
  const release = releaseCc <= 0 ? 0 : modEnvTimeSeconds(releaseCc, ADSR_MAX.release);
  const sustain = 0.55;
  const scale = width / (attack + decay + sustain + release || 1);
  return {
    attack: attack * scale,
    decay: decay * scale,
    sustain: sustain * scale,
    release: release * scale,
  };
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

/** Note lengths for LFO Sync ON, in quarter-note beats (Roland S-1 RATE table). */
export const LFO_SYNC_BEATS = [
  32, 24, 64 / 3, 16, 12, 32 / 3, 8, 6, 16 / 3, 4, 3, 8 / 3, 2, 1.5, 4 / 3, 1, 0.75, 2 / 3, 0.5,
  0.375, 1 / 3, 0.25, 0.1875, 1 / 6, 0.125, 0.09375, 1 / 12, 0.0625, 0.046875, 1 / 24, 0.03125,
] as const;

export function lfoSyncBeats(rateCc: number): number {
  const idx = ccToOptionIndex(rateCc, LFO_SYNC_BEATS.length);
  return LFO_SYNC_BEATS[idx];
}

export function wrap01(phase: number): number {
  return phase - Math.floor(phase);
}

export function phaseDelta(from: number, to: number): number {
  let d = wrap01(to) - wrap01(from);
  if (d > 0.5) d -= 1;
  if (d < -0.5) d += 1;
  return d;
}

export function lfoRateHz(rateCc: number, syncOn: boolean, fast = false, bpm = 120): number {
  if (syncOn) return bpm / 60 / lfoSyncBeats(rateCc);
  // Heuristic — Roland only documents RATE as 0–255, no Hz table.
  // Normal ≈ 0.05–20 Hz; Fast stretches into audio-rate territory.
  const n = Math.max(0, Math.min(127, rateCc)) / 127;
  if (fast) return 0.5 + Math.pow(n, 1.35) * 320;
  return 0.05 + Math.pow(n, 2.05) * 19.95;
}

/** Human-readable estimate for UI captions. */
export function formatLfoRateLabel(
  rateCc: number,
  syncOn: boolean,
  fast = false,
  bpm: number | null = null,
): string {
  if (syncOn) {
    const beats = lfoSyncBeats(rateCc);
    const note =
      beats >= 4
        ? `${beats / 4} bars`
        : beats === 1
          ? "1/4"
          : beats === 0.5
            ? "1/8"
            : beats === 0.25
              ? "1/16"
              : `${beats.toFixed(2)} beats`;
    const hz = lfoRateHz(rateCc, true, false, bpm ?? 120);
    return bpm != null ? `${note} @ ${Math.round(bpm)} BPM (~${hz.toFixed(2)} Hz)` : `${note} (no clock)`;
  }
  const hz = lfoRateHz(rateCc, false, fast, 120);
  return `${hz < 10 ? hz.toFixed(2) : hz.toFixed(1)} Hz${fast ? " fast" : ""}`;
}

export function spectrumBrightness(bins: Uint8Array): number {
  let lo = 0;
  let hi = 0;
  const mid = Math.max(4, Math.floor(bins.length * 0.1));
  for (let i = 1; i < mid; i++) lo += bins[i];
  for (let i = mid; i < bins.length; i++) hi += bins[i];
  const t = lo + hi;
  return t > 8 ? hi / t : 0;
}

export function spectrumCentroidNorm(bins: Uint8Array): number {
  let num = 0;
  let den = 0;
  for (let i = 1; i < bins.length; i++) {
    const v = bins[i];
    num += i * v;
    den += v;
  }
  return den > 8 ? num / den / bins.length : 0;
}

export function waveformRms(samples: Uint8Array): number {
  let s = 0;
  for (let i = 0; i < samples.length; i++) {
    const v = (samples[i] - 128) / 128;
    s += v * v;
  }
  return Math.sqrt(s / Math.max(1, samples.length));
}

export function bestLfoPhase(
  type: LfoWaveform,
  rateHz: number,
  nowMs: number,
  history: { t: number; v: number }[],
  steps = 36,
): { phase: number; score: number } {
  let bestPhase = 0;
  let best = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < steps; i++) {
    const cand = i / steps;
    let score = 0;
    for (const h of history) {
      const age = (nowMs - h.t) / 1000;
      score += h.v * sampleWaveform(type, cand - rateHz * age);
    }
    if (score > best) {
      best = score;
      bestPhase = cand;
    }
  }
  return { phase: bestPhase, score: best };
}

/** Cutoff CC after filter envelope. Not clamped so the env curve can sit above a wide-open filter. */
export function filterCutoffWithEnv(cutoffCc: number, envCc: number, envLevel = 1): number {
  return cutoffCc + (Math.max(0, Math.min(127, envCc)) / 127) * 127 * envLevel;
}

/**
 * Lowest freq on the log axis, as a fraction of Nyquist (~20 Hz at 44.1 kHz).
 * Must stay in sync with cutoffCcToFreqNorm so the filter curve sits on the USB spectrum.
 */
export const FREQ_AXIS_MIN_NORM = 20 / 22050;

/**
 * Map cutoff CC onto the same log frequency axis as the spectrum.
 * Values above 127 (cutoff + ENV) are allowed past Nyquist so the ENV
 * curve keeps opening after the resonance peak leaves the right edge,
 * instead of freezing at the canvas limit mid-Env Amount.
 */
export function cutoffCcToFreqNorm(cutoffCc: number, minNorm = FREQ_AXIS_MIN_NORM): number {
  const t = Math.max(0, cutoffCc / 127);
  return minNorm * Math.pow(1 / minNorm, t);
}

/** Log frequency 0–1 along the filter/spectrum x axis (Nyquist at the right). */
export function filterFreqNormAtX(x: number, width: number, minNorm = FREQ_AXIS_MIN_NORM): number {
  const t = Math.max(0, Math.min(1, x / Math.max(1, width - 1)));
  return minNorm * Math.pow(1 / minNorm, t);
}

export function filterResponseDb(freqNorm: number, cutoffCc: number, resoCc: number): number {
  const cutoff = Math.max(FREQ_AXIS_MIN_NORM, cutoffCcToFreqNorm(cutoffCc));
  const reso = Math.pow(Math.max(0, Math.min(1, resoCc / 127)), 1.12);
  const x = Math.max(FREQ_AXIS_MIN_NORM, freqNorm);
  const oct = Math.log2(x / cutoff);
  const lowpass = -24 * Math.max(0, oct);
  const widthOct = 0.28 * Math.pow(1 - reso * 0.88, 1.55) + 0.028;
  const peakDb = reso * 28;
  const peak = peakDb * Math.exp(-(oct * oct) / (2 * widthOct * widthOct));
  return Math.max(-48, Math.min(22, lowpass + peak));
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
