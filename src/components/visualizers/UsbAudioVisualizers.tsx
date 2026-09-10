import {useEffect, useRef} from "react";
import {getVizPalette} from "../../lib/viz-theme";

interface UsbAudioWaveformProps {
	analyser: AnalyserNode | null;
	active?: boolean;
}

export function UsbAudioWaveform({analyser, active}: UsbAudioWaveformProps) {
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
		let noiseFloor = 0.001;
		let gated = false;

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

		const drawGrid = (w: number, h: number, dpr: number) => {
			const midY = h / 2;
			const viz = getVizPalette();
			ctx.strokeStyle = viz.grid;
			ctx.lineWidth = dpr;

			for (const t of [-1, -0.5, 0, 0.5, 1]) {
				const y = midY - t * (h * 0.48);
				ctx.beginPath();
				ctx.moveTo(0, y);
				ctx.lineTo(w, y);
				ctx.stroke();
			}

			const cols = 10;
			for (let i = 1; i < cols; i++) {
				const x = (i / cols) * w;
				ctx.beginPath();
				ctx.moveTo(x, 0);
				ctx.lineTo(x, h);
				ctx.stroke();
			}

			ctx.strokeStyle = viz.gridMid;
			ctx.beginPath();
			ctx.moveTo(0, midY);
			ctx.lineTo(w, midY);
			ctx.stroke();
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
			const midY = h / 2;
			const halfH = h * 0.48;
			ctx.clearRect(0, 0, w, h);
			ctx.imageSmoothingEnabled = false;
			drawGrid(w, h, dpr);

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

				let windowPeak = 0;
				for (let i = 0; i < windowSamples; i++) {
					const abs = Math.abs(buffer[start + i]);
					if (abs > windowPeak) windowPeak = abs;
				}

				if (windowPeak < noiseFloor * 1.4) {
					noiseFloor += (windowPeak - noiseFloor) * 0.08;
				} else if (!gated) {
					noiseFloor += (Math.min(windowPeak, noiseFloor * 1.05) - noiseFloor) * 0.01;
				}
				noiseFloor = Math.max(1e-5, noiseFloor);

				const openAt = noiseFloor * 10;
				const closeAt = noiseFloor * 4;
				if (gated) {
					if (windowPeak < closeAt) gated = false;
				} else if (windowPeak > openAt) {
					gated = true;
				}

				const gain = gated ? 0.92 / windowPeak : 0.92 / (openAt * 4);

				const viz = getVizPalette();
				ctx.lineWidth = Math.max(1.5, dpr * 1.25);
				ctx.strokeStyle = viz.glow;
				ctx.shadowColor = viz.shadow;
				ctx.shadowBlur = 6 * dpr;
				ctx.beginPath();

				for (let x = 0; x < w; x++) {
					const i = start + Math.floor((x / w) * windowSamples);
					const sample = buffer[i] * gain;
					const y = midY - sample * halfH;
					if (x === 0) ctx.moveTo(x + 0.5, y);
					else ctx.lineTo(x + 0.5, y);
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
			<div className='viz-caption'>USB oscilloscope {active ? "" : "(off)"}</div>
			<div className='viz-canvas-wrap' ref={wrapRef}>
				<canvas ref={canvasRef} className={`viz-canvas viz-canvas--scope${!active ? " viz-canvas--idle" : ""}`} />
			</div>
		</div>
	);
}
