import { useCallback, useRef } from "react";

interface KnobProps {
  label: string;
  value: number;
  displayMax?: number;
  displayValue: string;
  synced: boolean;
  disabled?: boolean;
  /** Arc starts at 12 o'clock instead of 7 o'clock. */
  bipolar?: boolean;
  /** Encoder color slot (0–3), cycled like the four OP-XY encoders. */
  colorIndex?: number;
  onChange: (value: number) => void;
}

const SWEEP = 270;
const START = -135;
const R = 15;
const C = 18;

function polar(deg: number, r = R) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: C + r * Math.cos(rad), y: C + r * Math.sin(rad) };
}

function arcPath(from: number, to: number) {
  if (Math.abs(to - from) < 0.01) return "";
  const a = Math.min(from, to);
  const b = Math.max(from, to);
  const p0 = polar(a);
  const p1 = polar(b);
  const large = b - a > 180 ? 1 : 0;
  return `M ${p0.x} ${p0.y} A ${R} ${R} 0 ${large} 1 ${p1.x} ${p1.y}`;
}

const TRACK = arcPath(START, START + SWEEP);

export function Knob({
  label,
  value,
  displayMax = 127,
  displayValue,
  synced,
  disabled,
  bipolar,
  colorIndex = 0,
  onChange,
}: KnobProps) {
  const dragging = useRef(false);
  const startY = useRef(0);
  const startDisplay = useRef(0);

  const toDisplay = (cc: number) =>
    displayMax <= 127 ? cc : Math.round((cc * displayMax) / 127);
  const toCc = (display: number) =>
    displayMax <= 127 ? display : Math.round((display * 127) / displayMax);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled) return;
      dragging.current = true;
      startY.current = e.clientY;
      startDisplay.current = toDisplay(value);
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [disabled, displayMax, value],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current || disabled) return;
      const delta = startY.current - e.clientY;
      const nextDisplay = Math.max(
        0,
        Math.min(displayMax, startDisplay.current + Math.round(delta / 1.2)),
      );
      onChange(toCc(nextDisplay));
    },
    [disabled, displayMax, onChange],
  );

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  const angle = START + (value / 127) * SWEEP;
  const shown = toDisplay(value);
  const origin = bipolar ? 0 : START;
  const dot = polar(angle, R - 6);

  return (
    <div
      className={`knob knob-c${colorIndex % 4} ${synced ? "synced" : "unsynced"} ${disabled ? "disabled" : ""}`}
    >
      <div
        className="knob-dial"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        role="slider"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={displayMax}
        aria-valuenow={shown}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === "ArrowUp" || e.key === "ArrowRight") {
            onChange(toCc(Math.min(displayMax, shown + 1)));
          }
          if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
            onChange(toCc(Math.max(0, shown - 1)));
          }
        }}
      >
        <svg viewBox="0 0 36 36" aria-hidden="true">
          <circle className="knob-cap" cx={C} cy={C} r={R - 3.5} />
          <path className="knob-track" d={TRACK} />
          <path className="knob-arc" d={arcPath(origin, angle)} />
          <circle className="knob-dot" cx={dot.x} cy={dot.y} r={1.6} />
        </svg>
      </div>
      <span className="knob-value">{displayValue}</span>
      <span className="knob-label">{label}</span>
    </div>
  );
}
