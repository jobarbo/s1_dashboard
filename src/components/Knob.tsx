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

  const norm = value / 127;
  const shown = toDisplay(value);

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
        style={
          {
            "--p": norm,
            "--a": `${(bipolar ? Math.min(norm, 0.5) : 0) * SWEEP}deg`,
            "--b": `${(bipolar ? Math.max(norm, 0.5) : norm) * SWEEP}deg`,
          } as React.CSSProperties
        }
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
        <i />
      </div>
      <span className="knob-value">{displayValue}</span>
      <span className="knob-label">{label}</span>
    </div>
  );
}
