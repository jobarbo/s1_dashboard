import { useCallback, useRef } from "react";

interface KnobProps {
  label: string;
  value: number;
  displayMax?: number;
  displayValue: string;
  synced: boolean;
  disabled?: boolean;
  onChange: (value: number) => void;
}

export function Knob({
  label,
  value,
  displayMax = 127,
  displayValue,
  synced,
  disabled,
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
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
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

  const angle = -135 + (value / 127) * 270;
  const shown = toDisplay(value);

  return (
    <div className={`knob ${synced ? "synced" : "unsynced"} ${disabled ? "disabled" : ""}`}>
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
        <div className="knob-ring" />
        <div className="knob-pointer" style={{ transform: `rotate(${angle}deg)` }} />
      </div>
      <span className="knob-label">
        {label}
        {!synced && <span className="unsynced-mark">?</span>}
      </span>
      <span className="knob-value">{displayValue}</span>
    </div>
  );
}
