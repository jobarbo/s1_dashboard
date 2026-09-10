import {useEffect, useRef} from "react";
import {useI18n} from "../../lib/use-i18n";
import {getVizPalette} from "../../lib/viz-theme";

/** Vertical scale in S-1 pot / display units (−255…255). */
const AXIS = 255;
/**
 * Fixed display gain (not auto-scale). Soft-tanh keeps loud main-volume peaks
 * inside ±255 so the wave is never lost past the rails.
 */
const SCOPE_GAIN = 70;

/** Map float sample → display units inside ±AXIS without hard clipping. */
function toScopeUnits(sample: number): number {
	return AXIS * Math.tanh(sample * SCOPE_GAIN);
}

interface UsbAudioWaveformProps {
	analyser: AnalyserNode | null;
	active?: boolean;
}

export function UsbAudioWaveform({analyser, active}: UsbAudioWaveformProps) {
	const {t} = useI18n();
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const wrapRef = useRef<HTMLDivElement>(null);
	const rafRef = useRef(0);

	useEffect(() => {
		const canvas = canvasRef.current;
		const wrap = wrapRef.current;
		if (!canvas || !wrap) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		const buffer = analyser ? new Float32Array(analyser.fftSize) : null;
		const triggerFloor = 0.0004;

		const syncSize = () => {
			const cssW = Math.max(80, Math.floor(wrap.clientWidth));
			const cssH = Math.max(24, Math.floor(wrap.clientHeight));
			const dpr = Math.min(window.devicePixelRatio || 1, 2);
			const w = Math.floor(cssW * dpr);
			const h = Math.floor(cssH * dpr);
			if (canvas.width !== w || canvas.height !== h) {
				canvas.width = w;
				canvas.height = h;
			}
			return {w, h, dpr};
		};

		const drawGrid = (w: number, h: number, dpr: number, padL: number, halfH: number, midY: number) => {
			const viz = getVizPalette();
			ctx.strokeStyle = viz.grid;
			ctx.lineWidth = dpr;

			for (const t of [-1, -0.5, 0, 0.5, 1]) {
				const y = midY - t * halfH;
				ctx.beginPath();
				ctx.moveTo(padL, y);
				ctx.lineTo(w, y);
				ctx.stroke();
			}

			const cols = 10;
			for (let i = 1; i < cols; i++) {
				const x = padL + (i / cols) * (w - padL);
				ctx.beginPath();
				ctx.moveTo(x, 0);
				ctx.lineTo(x, h);
				ctx.stroke();
			}

			ctx.strokeStyle = viz.gridMid;
			ctx.beginPath();
			ctx.moveTo(padL, midY);
			ctx.lineTo(w, midY);
			ctx.stroke();

			ctx.fillStyle = viz.envLabel;
			ctx.font = `${Math.max(9, 10 * dpr)}px ui-monospace, monospace`;
			ctx.textAlign = "right";
			ctx.textBaseline = "middle";
			ctx.fillText("255", padL - 4 * dpr, midY - halfH);
			ctx.fillText("128", padL - 4 * dpr, midY - halfH * 0.5);
			ctx.fillText("0", padL - 4 * dpr, midY);
			ctx.fillText("-128", padL - 4 * dpr, midY + halfH * 0.5);
			ctx.fillText("-255", padL - 4 * dpr, midY + halfH);
		};

		const findTrigger = (peak: number): number => {
			if (!buffer || peak < triggerFloor) return 0;
			const level = peak * 0.2;
			const searchEnd = Math.floor(buffer.length * 0.45);
			for (let i = 1; i < searchEnd; i++) {
				if (buffer[i - 1] < level && buffer[i] >= level) return i;
			}
			for (let i = 1; i < searchEnd; i++) {
				if (buffer[i - 1] < 0 && buffer[i] >= 0) return i;
			}
			return 0;
		};

		const draw = () => {
			const {w, h, dpr} = syncSize();
			const padL = Math.round(32 * dpr);
			const midY = h / 2;
			const halfH = h * 0.48;
			const plotW = Math.max(1, w - padL);

			ctx.clearRect(0, 0, w, h);
			ctx.imageSmoothingEnabled = false;
			drawGrid(w, h, dpr, padL, halfH, midY);

			if (analyser && active && buffer) {
				analyser.getFloatTimeDomainData(buffer);

				let peak = 0;
				for (let i = 0; i < buffer.length; i++) {
					const abs = Math.abs(buffer[i]);
					if (abs > peak) peak = abs;
				}

				const trigger = findTrigger(peak);
				const windowSamples = Math.floor(buffer.length * 0.5);
				const maxStart = buffer.length - windowSamples;
				const start = Math.min(trigger, maxStart);

				// Fixed gain + soft limit: loud volume compresses into ±255 instead of vanishing off-axis.
				const viz = getVizPalette();
				ctx.lineWidth = Math.max(1.5, dpr * 1.25);
				ctx.strokeStyle = viz.glow;
				ctx.shadowColor = viz.shadow;
				ctx.shadowBlur = 6 * dpr;
				ctx.beginPath();

				for (let x = 0; x < plotW; x++) {
					const i = start + Math.floor((x / plotW) * windowSamples);
					const sample = toScopeUnits(buffer[i]);
					const y = midY - (sample / AXIS) * halfH;
					const px = padL + x + 0.5;
					if (x === 0) ctx.moveTo(px, y);
					else ctx.lineTo(px, y);
				}
				ctx.stroke();
				ctx.shadowBlur = 0;
			}

			rafRef.current = requestAnimationFrame(draw);
		};

		rafRef.current = requestAnimationFrame(draw);
		const ro = new ResizeObserver(() => syncSize());
		ro.observe(wrap);
		return () => {
			cancelAnimationFrame(rafRef.current);
			ro.disconnect();
		};
	}, [analyser, active]);

	return (
		<div className='viz-block viz-block--scope'>
			<div className='viz-caption'>{t("vizScope")} {active ? "" : t("vizScopeOff")}</div>
			<div className='viz-canvas-wrap' ref={wrapRef}>
				<canvas ref={canvasRef} className={`viz-canvas viz-canvas--scope${!active ? " viz-canvas--idle" : ""}`} />
			</div>
		</div>
	);
}
