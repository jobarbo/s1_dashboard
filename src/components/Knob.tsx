import { useCallback, useRef } from "react";

interface KnobProps {
  label: string;
  value: number;
  displayValue: string;
  synced: boolean;
  disabled?: boolean;
  onChange: (value: number) => void;
}

export function Knob({
  label,
  value,
  displayValue,
  synced,
  disabled,
  onChange,
}: KnobProps) {
  const dragging = useRef(false);
  const startY = useRef(0);
  const startValue = useRef(0);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled) return;
      dragging.current = true;
      startY.current = e.clientY;
      startValue.current = value;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [disabled, value],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current || disabled) return;
      const delta = startY.current - e.clientY;
      const next = Math.max(0, Math.min(127, startValue.current + Math.round(delta / 1.5)));
      onChange(next);
    },
    [disabled, onChange],
  );

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  const angle = -135 + (value / 127) * 270;

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
        aria-valuemax={127}
        aria-valuenow={value}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === "ArrowUp" || e.key === "ArrowRight") onChange(Math.min(127, value + 1));
          if (e.key === "ArrowDown" || e.key === "ArrowLeft") onChange(Math.max(0, value - 1));
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
