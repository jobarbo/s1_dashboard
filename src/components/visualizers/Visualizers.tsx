import { useEffect, useRef } from "react";
import {
  ADSR_MAX,
  bestLfoPhase,
  filterCutoffWithEnv,
  filterFreqNormAtX,
  filterResponseDb,
  lfoRateHz,
  lfoSyncBeats,
  lfoWaveformFromCc,
  modEnvTimeSeconds,
  phaseDelta,
  pulseWidthNorm,
  oscMixLevels,
  sampleDrawWaveform,
  sampleWaveform,
  spectrumBrightness,
  spectrumCentroidNorm,
  waveformRms,
  wrap01,
  WAVEFORM_DISPLAY_CYCLES,
} from "../../lib/visualizers";
import { midiClockBeats, midiClockBpm } from "../../lib/midi-clock";
import { useVizFillSize } from "./viz-sizes";

interface OscVisualizerProps {
  square: number;
  saw: number;
  sub: number;
  noise: number;
  pulseWidth: number;
  drawMode: number;
  subOct: number;
  compact?: boolean;
}

export function OscVisualizer({
  square,
  saw,
  sub,
  noise,
  pulseWidth,
  drawMode,
  subOct,
  compact,
}: OscVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const noisePhaseRef = useRef(0);
  const { wrapRef, width, height } = useVizFillSize();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const pw = pulseWidthNorm(pulseWidth);
    const mix = oscMixLevels({ square, saw, sub, noise });
    const subPhaseMul = subOct === 2 ? 0.5 : 0.25;
    const subPw = subOct === 0 ? 0.25 : 0.5;
    const animateNoise = drawMode === 0 && noise > 0;

    const paint = (noisePhase: number) => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = "rgba(230, 245, 240, 0.9)";
      ctx.lineWidth = compact ? 1 : 1.5;
      ctx.beginPath();

      for (let x = 0; x < w; x++) {
        const phase = (x / w) * WAVEFORM_DISPLAY_CYCLES;
        let y = 0;
        if (drawMode > 0) {
          y = sampleDrawWaveform(drawMode, phase);
        } else {
          if (mix.square > 0) y += sampleWaveform("square", phase, pw) * mix.square;
          if (mix.saw > 0) y += sampleWaveform("saw", phase) * mix.saw;
          if (mix.sub > 0) {
            y += sampleWaveform("square", phase * subPhaseMul, subPw) * mix.sub * 0.8;
          }
          if (mix.noise > 0) {
            y += sampleWaveform("noise", phase * 16 + noisePhase) * mix.noise;
          }
        }

        const py = h / 2 - y * (h * 0.38);
        if (x === 0) ctx.moveTo(x, py);
        else ctx.lineTo(x, py);
      }
      ctx.stroke();
    };

    if (!animateNoise) {
      paint(0);
      return;
    }

    let last = performance.now();
    const draw = (now: number) => {
      noisePhaseRef.current += ((now - last) / 1000) * 1.2;
      last = now;
      paint(noisePhaseRef.current);
      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [square, saw, sub, noise, pulseWidth, drawMode, subOct, compact, width, height]);

  return (
    <div className={`viz-block${compact ? " viz-block--compact" : ""}`}>
      <div className="viz-caption">
        {compact
          ? drawMode > 0
            ? drawMode === 1
              ? "Wave (Draw Step)"
              : "Wave (Draw Slope)"
            : "Wave (CC est.)"
          : drawMode > 0
            ? drawMode === 1
              ? "Draw oscillator (step, schematic)"
              : "Draw oscillator (slope, schematic)"
            : "Oscillator mix (estimated)"}
      </div>
      <div className="viz-canvas-wrap" ref={wrapRef}>
        <canvas ref={canvasRef} width={width} height={height} className="viz-canvas" />
      </div>
    </div>
  );
}

interface LfoVisualizerProps {
  rateCc: number;
  waveformCc: number;
  syncOn: boolean;
  fastMode?: boolean;
  keyTrigger?: boolean;
  noteOnGeneration?: number;
  analyser?: AnalyserNode | null;
  waveAnalyser?: AnalyserNode | null;
  audioActive?: boolean;
  compact?: boolean;
}

export function LfoVisualizer({
  rateCc,
  waveformCc,
  syncOn,
  fastMode = false,
  keyTrigger = false,
  noteOnGeneration = 0,
  analyser = null,
  waveAnalyser = null,
  audioActive = false,
  compact,
}: LfoVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phaseRef = useRef(0);
  const rafRef = useRef(0);
  const specGainRef = useRef(1);
  const dcRef = useRef(0);
  const absRef = useRef(0.02);
  const histRef = useRef<{ t: number; v: number }[]>([]);
  const lastNoteRef = useRef(noteOnGeneration);
  const noteGenRef = useRef(noteOnGeneration);
  const clockTrimRef = useRef(0);
  noteGenRef.current = noteOnGeneration;
  const { wrapRef, width, height } = useVizFillSize();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const wf = lfoWaveformFromCc(waveformCc);
    const pw = 0.5;
    let last = performance.now();
    const bins = analyser && audioActive ? new Uint8Array(analyser.frequencyBinCount) : null;
    const waveBuf =
      waveAnalyser && audioActive ? new Uint8Array(waveAnalyser.fftSize) : null;

    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      const clockBpm = midiClockBpm();
      const rateHz = lfoRateHz(rateCc, syncOn, fastMode, clockBpm ?? 120);

      if (syncOn && clockBpm != null) {
        phaseRef.current = wrap01(midiClockBeats() / lfoSyncBeats(rateCc) + clockTrimRef.current);
      } else {
        phaseRef.current += rateHz * dt;
      }

      if (keyTrigger && noteGenRef.current !== lastNoteRef.current) {
        lastNoteRef.current = noteGenRef.current;
        phaseRef.current = 0;
      }

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      if (bins && analyser && audioActive) {
        analyser.getByteFrequencyData(bins);
        let peak = 1;
        for (let i = 0; i < bins.length; i++) {
          if (bins[i] > peak) peak = bins[i];
        }
        const target = peak < 6 ? 1 : Math.min(8, 230 / peak);
        const follow = target > specGainRef.current ? 0.4 : 0.14;
        specGainRef.current += (target - specGainRef.current) * follow;
        ctx.save();
        ctx.globalAlpha = 0.38;
        fillSpectrum(ctx, w, h, bins, specGainRef.current);
        ctx.restore();

        let raw = spectrumCentroidNorm(bins) * 0.55 + spectrumBrightness(bins) * 0.45;
        if (waveBuf && waveAnalyser) {
          waveAnalyser.getByteTimeDomainData(waveBuf);
          raw = raw * 0.82 + waveformRms(waveBuf) * 0.18;
        }
        dcRef.current += (raw - dcRef.current) * 0.045;
        const ac = raw - dcRef.current;
        absRef.current += (Math.abs(ac) - absRef.current) * 0.08;
        const gain = Math.max(absRef.current, 0.004);
        const mod = Math.max(-1, Math.min(1, ac / (gain * 2.2)));

        if (absRef.current > 0.012 && peak > 8) {
          const hist = histRef.current;
          hist.push({ t: now, v: mod });
          const keepAfter = now - 750;
          while (hist.length > 0 && hist[0].t < keepAfter) hist.shift();

          if (hist.length > 18) {
            const fit = bestLfoPhase(wf, rateHz, now, hist);
            if (fit.score / hist.length > 0.12) {
              const pull = phaseDelta(phaseRef.current, fit.phase);
              // Phase only — never retune Hz from USB (notes, filter env, etc.).
              const catchUp = Math.min(0.045, 1.15 * dt);
              if (syncOn && clockBpm != null) {
                clockTrimRef.current = wrap01(clockTrimRef.current + pull * catchUp);
              } else {
                phaseRef.current += pull * catchUp;
              }
            }
          }
        }
      }

      phaseRef.current = wrap01(phaseRef.current);

      ctx.strokeStyle = "rgba(120, 210, 190, 0.95)";
      ctx.lineWidth = compact ? 1 : 1.5;
      ctx.beginPath();

      for (let x = 0; x < w; x++) {
        const phase = phaseRef.current + (x / w) * WAVEFORM_DISPLAY_CYCLES;
        const yVal =
          wf === "noise" ? sampleWaveform("noise", phase) : sampleWaveform(wf, phase, pw);
        const py = h / 2 - yVal * (h * 0.38);
        if (x === 0) ctx.moveTo(x, py);
        else ctx.lineTo(x, py);
      }
      ctx.stroke();

      const nowY = h / 2 - sampleWaveform(wf, phaseRef.current, pw) * (h * 0.38);
      ctx.fillStyle = "rgba(160, 255, 220, 0.95)";
      ctx.beginPath();
      ctx.arc(2.5, nowY, compact ? 2.2 : 3, 0, Math.PI * 2);
      ctx.fill();

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [
    rateCc,
    waveformCc,
    syncOn,
    fastMode,
    keyTrigger,
    analyser,
    waveAnalyser,
    audioActive,
    compact,
    width,
    height,
  ]);

  return (
    <div className={`viz-block${compact ? " viz-block--compact" : ""}`}>
      <div className="viz-caption">
        {compact
          ? audioActive
            ? "LFO locked to USB"
            : "LFO (CC / clock)"
          : audioActive
            ? "LFO phase-locked to live USB modulation"
            : "LFO (rate from CC, clock if sync)"}
      </div>
      <div className="viz-canvas-wrap" ref={wrapRef}>
        <canvas ref={canvasRef} width={width} height={height} className="viz-canvas" />
      </div>
    </div>
  );
}

interface FilterVisualizerProps {
  cutoff: number;
  resonance: number;
  envAmount?: number;
  envAttack?: number;
  envDecay?: number;
  envSustain?: number;
  envRelease?: number;
  analyser?: AnalyserNode | null;
  audioActive?: boolean;
  compact?: boolean;
}

function filterCurveY(
  h: number,
  w: number,
  x: number,
  cutoff: number,
  resonance: number,
): number {
  const db = filterResponseDb(filterFreqNormAtX(x, w), cutoff, resonance);
  return h * 0.08 + ((18 - db) / 66) * (h * 0.86);
}

function strokeFilterCurve(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  cutoff: number,
  resonance: number,
) {
  ctx.beginPath();
  for (let x = 0; x < w; x++) {
    const py = filterCurveY(h, w, x, cutoff, resonance);
    if (x === 0) ctx.moveTo(x, py);
    else ctx.lineTo(x, py);
  }
  ctx.stroke();
}

function fillSpectrum(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  bins: Uint8Array,
  gain: number,
) {
  const last = bins.length - 1;
  const ys = new Float32Array(w);
  for (let x = 0; x < w; x++) {
    const startF = filterFreqNormAtX(x, w) * last;
    const endF = filterFreqNormAtX(Math.min(w - 1, x + 1), w) * last;
    const i0 = Math.min(last, Math.max(0, Math.floor(startF)));
    const i1 = Math.min(last, Math.max(i0, Math.ceil(endF)));
    let peak = 0;
    for (let i = i0; i <= i1; i++) {
      if (bins[i] > peak) peak = bins[i];
    }
    const mag = Math.min(1, Math.pow((peak / 255) * gain, 0.62));
    ys[x] = h * (0.9 - mag * 0.84);
  }

  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let x = 0; x < w; x++) ctx.lineTo(x, ys[x]);
  ctx.lineTo(w - 1, h);
  ctx.closePath();
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, "rgba(110, 230, 200, 0.85)");
  grad.addColorStop(0.4, "rgba(94, 207, 184, 0.55)");
  grad.addColorStop(1, "rgba(94, 207, 184, 0.12)");
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(0, ys[0]);
  for (let x = 1; x < w; x++) ctx.lineTo(x, ys[x]);
  ctx.strokeStyle = "rgba(140, 255, 220, 0.95)";
  ctx.lineWidth = 1.25;
  ctx.stroke();
}

const FILTER_ADSR_OVERLAY = {
  attack: { color: "rgb(110, 190, 255)", dash: [5, 3] as number[] },
  decay: { color: "rgb(186, 140, 255)", dash: [3, 3] as number[] },
  sustain: { color: "rgb(255, 214, 90)", dash: [7, 4] as number[] },
  release: { color: "rgb(255, 120, 165)", dash: [2, 3] as number[] },
} as const;

/** Time overlay: A, D, S, R left to right. CC 0 = vertical; low CC stays nearly vertical. */
function adsrTimeSegmentWidths(
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

function strokeDashedSegment(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: string,
  dash: number[],
  compact?: boolean,
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = compact ? 1.5 : 2;
  ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.setLineDash([]);
}

function yFromCutoffCc(h: number, cutoffCc: number): number {
  const padT = Math.max(10, Math.round(h * 0.1));
  const padB = Math.max(4, Math.round(h * 0.08));
  // Allow cutoff+ENV (>127) to keep rising past the top pad, matching the unclamped freq axis.
  const t = Math.max(0, cutoffCc / 127);
  return padT + (1 - t) * (h - padT - padB);
}

function drawAdsrTimeOverlay(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  cutoff: number,
  envAmount: number,
  attack: number,
  decay: number,
  sustain: number,
  release: number,
  compact?: boolean,
) {
  const baseY = yFromCutoffCc(h, cutoff);
  const peakY = yFromCutoffCc(h, filterCutoffWithEnv(cutoff, envAmount, 1));
  const sustainY = yFromCutoffCc(h, filterCutoffWithEnv(cutoff, envAmount, sustain / 127));
  const { attack: aW, decay: dW, sustain: sW, release: rW } = adsrTimeSegmentWidths(
    w,
    attack,
    decay,
    release,
  );

  const x0 = 0;
  const x1 = x0 + aW;
  const x2 = x1 + dW;
  const x3 = x2 + sW;
  const x4 = x3 + rW;

  strokeDashedSegment(
    ctx, x0, baseY, x1, peakY,
    FILTER_ADSR_OVERLAY.attack.color, FILTER_ADSR_OVERLAY.attack.dash, compact,
  );
  strokeDashedSegment(
    ctx, x1, peakY, x2, sustainY,
    FILTER_ADSR_OVERLAY.decay.color, FILTER_ADSR_OVERLAY.decay.dash, compact,
  );
  strokeDashedSegment(
    ctx, x2, sustainY, x3, sustainY,
    FILTER_ADSR_OVERLAY.sustain.color, FILTER_ADSR_OVERLAY.sustain.dash, compact,
  );
  strokeDashedSegment(
    ctx, x3, sustainY, x4, baseY,
    FILTER_ADSR_OVERLAY.release.color, FILTER_ADSR_OVERLAY.release.dash, compact,
  );

  const font = compact ? 9 : 11;
  ctx.font = `${font}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const labels = [
    [aW < 8 ? x1 + 7 : (x0 + x1) / 2, (baseY + peakY) / 2, "A", FILTER_ADSR_OVERLAY.attack.color],
    [dW < 8 ? x2 + 7 : (x1 + x2) / 2, (peakY + sustainY) / 2, "D", FILTER_ADSR_OVERLAY.decay.color],
    [(x2 + x3) / 2, sustainY - 8, "S", FILTER_ADSR_OVERLAY.sustain.color],
    [rW < 8 ? x3 - 7 : (x3 + x4) / 2, (sustainY + baseY) / 2, "R", FILTER_ADSR_OVERLAY.release.color],
  ] as const;
  for (const [x, y, label, color] of labels) {
    ctx.fillStyle = color;
    ctx.fillText(label, x, y);
  }
}

export function FilterVisualizer({
  cutoff,
  resonance,
  envAmount = 0,
  envAttack = 0,
  envDecay = 0,
  envSustain = 127,
  envRelease = 0,
  analyser = null,
  audioActive = false,
  compact,
}: FilterVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const specGainRef = useRef(1);
  const { wrapRef, width, height } = useVizFillSize();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const peakCutoff = filterCutoffWithEnv(cutoff, envAmount, 1);
    const sustainCutoff = filterCutoffWithEnv(cutoff, envAmount, envSustain / 127);
    const showEnv = envAmount > 0;
    const liveCutoff = cutoff;
    const bins = analyser && audioActive ? new Uint8Array(analyser.frequencyBinCount) : null;

    const paint = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      if (bins && analyser) {
        analyser.getByteFrequencyData(bins);
        let peak = 1;
        for (let i = 0; i < bins.length; i++) {
          if (bins[i] > peak) peak = bins[i];
        }
        const target = peak < 6 ? 1 : Math.min(8, 230 / peak);
        const follow = target > specGainRef.current ? 0.4 : 0.14;
        specGainRef.current += (target - specGainRef.current) * follow;
        fillSpectrum(ctx, w, h, bins, specGainRef.current);
      }

      if (resonance > 3) {
        ctx.beginPath();
        for (let x = 0; x < w; x++) {
          const py = filterCurveY(h, w, x, liveCutoff, resonance);
          if (x === 0) ctx.moveTo(x, py);
          else ctx.lineTo(x, py);
        }
        for (let x = w - 1; x >= 0; x--) {
          ctx.lineTo(x, filterCurveY(h, w, x, liveCutoff, 0));
        }
        ctx.closePath();
        const glow = ctx.createLinearGradient(0, 0, 0, h);
        glow.addColorStop(0, "rgba(255, 140, 90, 0.45)");
        glow.addColorStop(0.55, "rgba(255, 170, 110, 0.16)");
        glow.addColorStop(1, "rgba(255, 190, 120, 0.02)");
        ctx.fillStyle = glow;
        ctx.fill();
      }

      if (showEnv) {
        ctx.beginPath();
        for (let x = 0; x < w; x++) {
          const py = filterCurveY(h, w, x, peakCutoff, resonance);
          if (x === 0) ctx.moveTo(x, py);
          else ctx.lineTo(x, py);
        }
        for (let x = w - 1; x >= 0; x--) {
          ctx.lineTo(x, filterCurveY(h, w, x, cutoff, resonance));
        }
        ctx.closePath();
        ctx.fillStyle = "rgba(255, 190, 120, 0.14)";
        ctx.fill();
      }

      ctx.strokeStyle = "rgba(255, 190, 120, 0.95)";
      ctx.lineWidth = compact ? 1.25 : 2;
      strokeFilterCurve(ctx, w, h, liveCutoff, resonance);

      if (showEnv) {
        ctx.setLineDash([7, 4]);
        ctx.lineWidth = compact ? 1.75 : 2.25;
        ctx.strokeStyle = "rgba(255, 252, 235, 0.38)";
        strokeFilterCurve(ctx, w, h, peakCutoff, resonance);
        if (Math.abs(sustainCutoff - peakCutoff) > 2 && Math.abs(sustainCutoff - cutoff) > 2) {
          ctx.setLineDash([3, 4]);
          ctx.lineWidth = compact ? 1.25 : 1.6;
          ctx.strokeStyle = "rgba(255, 230, 190, 0.28)";
          strokeFilterCurve(ctx, w, h, sustainCutoff, resonance);
        }
        ctx.setLineDash([]);

        let envPeakX = 0;
        let envPeakY = h;
        for (let x = 0; x < w; x++) {
          const py = filterCurveY(h, w, x, peakCutoff, resonance);
          if (py < envPeakY) {
            envPeakY = py;
            envPeakX = x;
          }
        }
        ctx.font = `${compact ? 8 : 10}px system-ui, sans-serif`;
        ctx.textAlign = "left";
        ctx.textBaseline = "bottom";
        ctx.fillStyle = "rgba(255, 252, 235, 0.4)";
        ctx.fillText("ENV", Math.min(w - 22, envPeakX + 4), Math.max(10, envPeakY - 1));
      }

      if (showEnv) {
        drawAdsrTimeOverlay(
          ctx,
          w,
          h,
          cutoff,
          envAmount,
          envAttack,
          envDecay,
          envSustain,
          envRelease,
          compact,
        );
      }
    };

    if (!bins) {
      paint();
      return;
    }

    const draw = () => {
      paint();
      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [cutoff, resonance, envAmount, envAttack, envDecay, envSustain, envRelease, analyser, audioActive, compact, width, height]);

  return (
    <div className={`viz-block${compact ? " viz-block--compact" : ""}`}>
      <div className="viz-caption">
        {compact
          ? audioActive
            ? envAmount > 0
              ? "Filter + ADSR time overlay"
              : "Filter + USB spectrum"
            : envAmount > 0
              ? "Filter + ADSR time overlay"
              : "Filter curve (CC)"
          : audioActive
            ? envAmount > 0
              ? "Orange = cutoff (freq). Dotted A→D→S→R = time, left to right"
              : "Filter curve over live USB spectrum"
            : envAmount > 0
              ? "Filter response with A/D/S/R env overlays"
              : "Filter response (estimated)"}
      </div>
      <div className="viz-canvas-wrap" ref={wrapRef}>
        <canvas ref={canvasRef} width={width} height={height} className="viz-canvas" />
      </div>
    </div>
  );
}

interface AdsrVisualizerProps {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  analyser?: AnalyserNode | null;
  audioActive?: boolean;
  compact?: boolean;
}

function adsrLevelAtX(
  x: number,
  x0: number,
  x1: number,
  x2: number,
  x3: number,
  x4: number,
  sustainN: number,
): number {
  if (x1 > x0 && x < x1) return (x - x0) / (x1 - x0);
  if (x2 > x1 && x < x2) return 1 + (sustainN - 1) * ((x - x1) / (x2 - x1));
  if (x4 > x3 && x > x3) return Math.max(0, sustainN * (1 - (x - x3) / (x4 - x3)));
  if (x >= x2) return sustainN;
  if (x >= x1) return 1;
  return 0;
}

export function AdsrVisualizer({
  attack,
  decay,
  sustain,
  release,
  analyser = null,
  audioActive = false,
  compact,
}: AdsrVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const { wrapRef, width, height } = useVizFillSize();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const sustainN = sustain / 127;
    const cycles = compact ? 10 : 16;
    const live = !!(analyser && audioActive);
    const capture = live ? new Float32Array(analyser.fftSize) : null;
    const history = live ? new Float32Array(720) : null;
    let histWrite = 0;
    const samplesPerFrame = 14;

    const paint = (phase: number) => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const midY = h / 2;
      const halfH = h * 0.42;
      const { attack: aW, decay: dW, sustain: sW, release: rW } = adsrTimeSegmentWidths(
        w,
        attack,
        decay,
        release,
      );
      const x0 = 0;
      const x1 = x0 + aW;
      const x2 = x1 + dW;
      const x3 = x2 + sW;
      const x4 = x3 + rW;

      const yEnv = (level: number) => midY - level * halfH;
      const segs = [
        { xA: x0, xB: x1, yA: yEnv(0), yB: yEnv(1), w: aW, ...FILTER_ADSR_OVERLAY.attack, label: "A" },
        { xA: x1, xB: x2, yA: yEnv(1), yB: yEnv(sustainN), w: dW, ...FILTER_ADSR_OVERLAY.decay, label: "D" },
        { xA: x2, xB: x3, yA: yEnv(sustainN), yB: yEnv(sustainN), w: sW, ...FILTER_ADSR_OVERLAY.sustain, label: "S" },
        { xA: x3, xB: x4, yA: yEnv(sustainN), yB: yEnv(0), w: rW, ...FILTER_ADSR_OVERLAY.release, label: "R" },
      ];

      const envAt = (x: number) => adsrLevelAtX(x, x0, x1, x2, x3, x4, sustainN);

      for (const seg of segs) {
        if (seg.w > 0.5) {
          const xStart = Math.floor(seg.xA);
          const xEnd = Math.max(xStart, Math.ceil(seg.xB) - 1);
          ctx.beginPath();
          for (let x = xStart; x <= xEnd; x++) {
            const y = midY - envAt(x) * halfH;
            if (x === xStart) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          for (let x = xEnd; x >= xStart; x--) {
            ctx.lineTo(x, midY + envAt(x) * halfH);
          }
          ctx.closePath();
          ctx.globalAlpha = 0.18;
          ctx.fillStyle = seg.color;
          ctx.fill();
          ctx.globalAlpha = 1;
        }

        ctx.strokeStyle = seg.color;
        ctx.lineWidth = compact ? 1.5 : 2;
        ctx.beginPath();
        ctx.moveTo(seg.xA, seg.yA);
        ctx.lineTo(seg.xB, seg.yB);
        ctx.stroke();
      }

      if (live && capture && history && analyser) {
        analyser.getFloatTimeDomainData(capture);
        const step = Math.max(1, Math.floor(capture.length / samplesPerFrame));
        for (let i = 0; i < samplesPerFrame; i++) {
          history[histWrite] = capture[Math.min(capture.length - 1, i * step)];
          histWrite = (histWrite + 1) % history.length;
        }

        // Fixed gain (not auto-normalize): soft stays small, loud fills/clips.
        // USB float peaks are often ~0.05–0.15 at "full" S-1 level.
        const fixedGain = 10;

        ctx.strokeStyle = "rgb(140, 255, 220)";
        ctx.lineWidth = compact ? 1.15 : 1.4;
        ctx.beginPath();
        for (let x = 0; x < w; x++) {
          const i = (histWrite + Math.floor((x / w) * history.length)) % history.length;
          const sample = Math.max(-1, Math.min(1, history[i] * fixedGain));
          const y = midY - sample * halfH;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      } else {
        ctx.strokeStyle = "rgba(230, 245, 240, 0.92)";
        ctx.lineWidth = compact ? 1 : 1.25;
        ctx.beginPath();
        for (let x = 0; x < w; x++) {
          const env = envAt(x);
          const osc = Math.sin((x / w) * cycles * Math.PI * 2 + phase);
          const y = midY - osc * env * halfH;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      const font = compact ? 9 : 11;
      ctx.font = `${font}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      for (const seg of segs) {
        const instant = seg.w < 8;
        const midX = instant ? seg.xA + 8 : (seg.xA + seg.xB) / 2;
        ctx.fillStyle = seg.color;
        ctx.fillText(seg.label, midX, Math.max(font + 1, Math.min(seg.yA, seg.yB) - 2));
      }
    };

    const draw = (now: number) => {
      paint((now / 1000) * Math.PI * 3);
      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [attack, decay, sustain, release, analyser, audioActive, compact, width, height]);

  return (
    <div className={`viz-block${compact ? " viz-block--compact" : ""}`}>
      <div className="viz-caption">
        {compact
          ? audioActive
            ? "ADSR + USB wave"
            : "ADSR × tone (amp)"
          : audioActive
            ? "Live USB wave with estimated amp envelope"
            : "Amplitude envelope on a tone (estimated)"}
      </div>
      <div className="viz-canvas-wrap" ref={wrapRef}>
        <canvas ref={canvasRef} width={width} height={height} className="viz-canvas" />
      </div>
    </div>
  );
}
