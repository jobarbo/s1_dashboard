import { useEffect, useRef } from "react";
import {
  adsrHasRise,
  adsrSegmentWidths,
  filterResponseDb,
  lfoRateHz,
  lfoWaveformFromCc,
  pulseWidthNorm,
  sampleWaveform,
} from "../../lib/visualizers";
import { vizDimensions } from "./viz-sizes";

interface OscVisualizerProps {
  square: number;
  saw: number;
  sub: number;
  noise: number;
  pulseWidth: number;
  drawMode: number;
  compact?: boolean;
}

export function OscVisualizer({
  square,
  saw,
  sub,
  noise,
  pulseWidth,
  drawMode,
  compact,
}: OscVisualizerProps) {
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

    const pw = pulseWidthNorm(pulseWidth);
    const total = square + saw + sub + noise || 1;

    ctx.strokeStyle = "rgba(230, 245, 240, 0.9)";
    ctx.lineWidth = compact ? 1 : 1.5;
    ctx.beginPath();

    for (let x = 0; x < w; x++) {
      const phase = x / w;
      let y = 0;
      if (square > 0) y += sampleWaveform("square", phase, pw) * (square / total);
      if (saw > 0) y += sampleWaveform("saw", phase) * (saw / total);
      if (sub > 0) y += sampleWaveform("square", phase * 0.5, 0.5) * (sub / total) * 0.8;
      if (noise > 0) y += sampleWaveform("noise", phase + x * 0.01) * (noise / total) * 0.35;

      const py = h / 2 - y * (h * 0.38);
      if (x === 0) ctx.moveTo(x, py);
      else ctx.lineTo(x, py);
    }
    ctx.stroke();

    if (drawMode > 0 && !compact) {
      ctx.fillStyle = "rgba(100, 220, 180, 0.15)";
      ctx.fillRect(0, 0, w, 8);
      ctx.fillStyle = "rgba(100, 220, 180, 0.85)";
      ctx.font = "10px system-ui";
      ctx.fillText(drawMode === 1 ? "DRAW: Step" : "DRAW: Slope", 6, 7);
    }
  }, [square, saw, sub, noise, pulseWidth, drawMode, compact, width, height]);

  return (
    <div className={`viz-block${compact ? " viz-block--compact" : ""}`}>
      <div className="viz-caption">{compact ? "Wave (CC est.)" : "Oscillator mix (estimated)"}</div>
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
        const phase = phaseRef.current + x / w;
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
  compact?: boolean;
}

export function FilterVisualizer({ cutoff, resonance, compact }: FilterVisualizerProps) {
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

    ctx.strokeStyle = "rgba(255, 190, 120, 0.95)";
    ctx.lineWidth = compact ? 1 : 2;
    ctx.beginPath();
    for (let x = 0; x < w; x++) {
      const freqNorm = 0.001 + (x / w) * 0.999;
      const db = filterResponseDb(freqNorm, cutoff, resonance);
      const py = h * 0.1 + ((12 - db) / 60) * (h * 0.85);
      if (x === 0) ctx.moveTo(x, py);
      else ctx.lineTo(x, py);
    }
    ctx.stroke();
  }, [cutoff, resonance, compact, width, height]);

  return (
    <div className={`viz-block${compact ? " viz-block--compact" : ""}`}>
      <div className="viz-caption">{compact ? "Filter curve (CC)" : "Filter response (estimated)"}</div>
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

    if (attackW > 0) ctx.lineTo(x1, peakY);
    else if (rises) ctx.lineTo(x0, peakY);

    if (decayW > 0) ctx.lineTo(x2, sustainY);
    else if (rises && sustainY < peakY - 0.5) ctx.lineTo(x2, sustainY);

    ctx.lineTo(x3, sustainY);

    if (releaseW > 0) ctx.lineTo(x4, baseY);
    else ctx.lineTo(x3, baseY);

    ctx.stroke();
  }, [attack, decay, sustain, release, compact, width, height]);

  return (
    <div className={`viz-block${compact ? " viz-block--compact" : ""}`}>
      <div className="viz-caption">{compact ? "ADSR (CC est.)" : "ADSR envelope (approximate timing)"}</div>
      <canvas ref={canvasRef} width={width} height={height} className="viz-canvas" />
    </div>
  );
}
