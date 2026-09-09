import {useEffect, useRef} from "react";

interface UsbAudioWaveformProps {
	analyser: AnalyserNode | null;
	active?: boolean;
}

const SCOPE_HEIGHT = 160;
const SCOPE_CSS_HEIGHT = 160;

export function UsbAudioWaveform({analyser, active}: UsbAudioWaveformProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const wrapRef = useRef<HTMLDivElement>(null);
	const rafRef = useRef(0);

	useEffect(() => {
		const canvas = canvasRef.current;
		const wrap = wrapRef.current;
		if (!canvas || !wrap || !analyser || !active) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		const buffer = new Float32Array(analyser.fftSize);
		const triggerFloor = 0.0004;

		const syncSize = () => {
			const cssW = Math.max(320, Math.floor(wrap.clientWidth));
			const dpr = Math.min(window.devicePixelRatio || 1, 2);
			const w = Math.floor(cssW * dpr);
			const h = Math.floor(SCOPE_HEIGHT * dpr);
			if (canvas.width !== w || canvas.height !== h) {
				canvas.width = w;
				canvas.height = h;
			}
			return {w, h, dpr};
		};

		const drawGrid = (w: number, h: number, dpr: number) => {
			const midY = h / 2;
			ctx.strokeStyle = "rgba(94, 207, 184, 0.12)";
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

			ctx.strokeStyle = "rgba(94, 207, 184, 0.28)";
			ctx.beginPath();
			ctx.moveTo(0, midY);
			ctx.lineTo(w, midY);
			ctx.stroke();
		};

		/** Rising-edge trigger so each frame starts at the same phase (locked, not scrolling). */
		const findTrigger = (peak: number): number => {
			if (peak < triggerFloor) return 0;
			const level = peak * 0.2;
			// Leave enough samples after the trigger to fill the display window.
			const searchEnd = Math.floor(buffer.length * 0.45);
			for (let i = 1; i < searchEnd; i++) {
				if (buffer[i - 1] < level && buffer[i] >= level) return i;
			}
			// Fallback: first rising zero-crossing
			for (let i = 1; i < searchEnd; i++) {
				if (buffer[i - 1] < 0 && buffer[i] >= 0) return i;
			}
			return 0;
		};

		const draw = () => {
			const {w, h, dpr} = syncSize();
			const midY = h / 2;
			const halfH = h * 0.48;

			analyser.getFloatTimeDomainData(buffer);
			ctx.clearRect(0, 0, w, h);
			ctx.imageSmoothingEnabled = false;
			drawGrid(w, h, dpr);

			let peak = 0;
			for (let i = 0; i < buffer.length; i++) {
				const abs = Math.abs(buffer[i]);
				if (abs > peak) peak = abs;
			}

			const trigger = findTrigger(peak);
			// Show a fixed time window after the trigger so the shape stays put on screen.
			const windowSamples = Math.floor(buffer.length * 0.5);
			const maxStart = buffer.length - windowSamples;
			const start = Math.min(trigger, maxStart);

			let windowPeak = 0;
			for (let i = 0; i < windowSamples; i++) {
				const abs = Math.abs(buffer[start + i]);
				if (abs > windowPeak) windowPeak = abs;
			}

			// Map the visible window onto the full display height, independent of volume.
			const gain = windowPeak > 1e-6 ? 0.92 / windowPeak : 0;

			ctx.lineWidth = Math.max(1.5, dpr * 1.25);
			ctx.strokeStyle = "rgb(110, 230, 200)";
			ctx.shadowColor = "rgba(94, 207, 184, 0.55)";
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

			rafRef.current = requestAnimationFrame(draw);
		};

		rafRef.current = requestAnimationFrame(draw);

		const onResize = () => syncSize();
		window.addEventListener("resize", onResize);
		return () => {
			cancelAnimationFrame(rafRef.current);
			window.removeEventListener("resize", onResize);
		};
	}, [analyser, active]);

	return (
		<div className='viz-block viz-block--scope' ref={wrapRef}>
			<div className='viz-caption'>USB oscilloscope {active ? "" : "(off)"}</div>
			<canvas ref={canvasRef} height={SCOPE_HEIGHT} style={{height: SCOPE_CSS_HEIGHT}} className={`viz-canvas viz-canvas--scope${!active ? " viz-canvas--idle" : ""}`} />
		</div>
	);
}
