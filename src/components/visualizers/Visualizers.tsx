import { useEffect, useRef } from "react";
import {
  adsrHasRise,
  adsrSegmentWidths,
  filterCutoffWithEnv,
  filterFreqNormAtX,
  filterResponseDb,
  lfoRateHz,
  lfoWaveformFromCc,
  pulseWidthNorm,
  oscMixLevels,
  sampleDrawWaveform,
  sampleWaveform,
  WAVEFORM_DISPLAY_CYCLES,
} from "../../lib/visualizers";
import { vizDimensions, VIZ_SIZE } from "./viz-sizes";

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
  const { width, height } = vizDimensions(compact);

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
      <canvas ref={canvasRef} width={width} height={height} className="viz-canvas" />
    </div>
  );
}

interface LfoVisualizerProps {
  rateCc: number;
  waveformCc: number;
  syncOn: boolean;
  compact?: boolean;
}

export function LfoVisualizer({ rateCc, waveformCc, syncOn, compact }: LfoVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phaseRef = useRef(0);
  const rafRef = useRef(0);
  const { width, height } = vizDimensions(compact);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const wf = lfoWaveformFromCc(waveformCc);
    const pw = 0.5;
    let last = performance.now();

    const draw = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      phaseRef.current += lfoRateHz(rateCc, syncOn) * dt;

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
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
      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [rateCc, waveformCc, syncOn, compact, width, height]);

  return (
    <div className={`viz-block${compact ? " viz-block--compact" : ""}`}>
      <div className="viz-caption">{compact ? "LFO (CC est.)" : "LFO shape (animated estimate)"}</div>
      <canvas ref={canvasRef} width={width} height={height} className="viz-canvas" />
    </div>
  );
}

interface FilterVisualizerProps {
  cutoff: number;
  resonance: number;
  envAmount?: number;
  envSustain?: number;
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
  return h * 0.1 + ((12 - db) / 60) * (h * 0.85);
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

export function FilterVisualizer({
  cutoff,
  resonance,
  envAmount = 0,
  envSustain = 127,
  analyser = null,
  audioActive = false,
  compact,
}: FilterVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const specGainRef = useRef(1);
  const { width, height } = compact ? VIZ_SIZE.filterCompact : vizDimensions(false);

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
        ctx.fillStyle = "rgba(255, 190, 120, 0.22)";
        ctx.fill();

        ctx.strokeStyle = "rgba(255, 210, 150, 0.75)";
        ctx.lineWidth = compact ? 1 : 1.5;
        ctx.setLineDash([4, 3]);
        strokeFilterCurve(ctx, w, h, peakCutoff, resonance);
        if (Math.abs(sustainCutoff - peakCutoff) > 2 && Math.abs(sustainCutoff - cutoff) > 2) {
          ctx.strokeStyle = "rgba(255, 190, 120, 0.45)";
          ctx.setLineDash([2, 4]);
          strokeFilterCurve(ctx, w, h, sustainCutoff, resonance);
        }
        ctx.setLineDash([]);
      }

      ctx.strokeStyle = "rgba(255, 190, 120, 0.95)";
      ctx.lineWidth = compact ? 1.25 : 2;
      strokeFilterCurve(ctx, w, h, liveCutoff, resonance);
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
  }, [cutoff, resonance, envAmount, envSustain, analyser, audioActive, compact, width, height]);

  return (
    <div className={`viz-block${compact ? " viz-block--compact" : ""}`}>
      <div className="viz-caption">
        {compact
          ? audioActive
            ? "Filter + USB spectrum"
            : envAmount > 0
              ? "Filter + env"
              : "Filter curve (CC)"
          : audioActive
            ? "Filter curve over live USB spectrum"
            : envAmount > 0
              ? "Filter response (env amount)"
              : "Filter response (estimated)"}
      </div>
      <canvas ref={canvasRef} width={width} height={height} className="viz-canvas" />
    </div>
  );
}

interface AdsrVisualizerProps {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  compact?: boolean;
}

export function AdsrVisualizer({ attack, decay, sustain, release, compact }: AdsrVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { width, height } = vizDimensions(compact);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const baseY = h - 4;
    const peakY = 4;
    const sustainY = baseY - (sustain / 127) * (baseY - peakY);
    const { attack: attackW, decay: decayW, sustain: sustainW, release: releaseW } =
      adsrSegmentWidths(w, attack, decay, release);
    const rises = adsrHasRise(attack, decay, sustain);

    const x0 = 0;
    const x1 = x0 + attackW;
    const x2 = x1 + decayW;
    const x3 = x2 + sustainW;
    const x4 = x3 + releaseW;

    ctx.strokeStyle = "rgba(180, 140, 255, 0.95)";
    ctx.lineWidth = compact ? 1 : 2;
    ctx.beginPath();
    ctx.moveTo(x0, baseY);

    if (attackW > 0 || rises) ctx.lineTo(x1, peakY);
    // decayW === 0 keeps x2 === x1, so this is a vertical drop, not a slope
    ctx.lineTo(x2, sustainY);
    ctx.lineTo(x3, sustainY);
    ctx.lineTo(releaseW > 0 ? x4 : x3, baseY);

    ctx.stroke();
  }, [attack, decay, sustain, release, compact, width, height]);

  return (
    <div className={`viz-block${compact ? " viz-block--compact" : ""}`}>
      <div className="viz-caption">{compact ? "ADSR (CC est.)" : "ADSR envelope (approximate timing)"}</div>
      <canvas ref={canvasRef} width={width} height={height} className="viz-canvas" />
    </div>
  );
}
