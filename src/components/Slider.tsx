import { useCallback, useRef } from "react";

interface SliderProps {
  label: string;
  value: number;
  displayMax?: number;
  displayValue: string;
  synced: boolean;
  disabled?: boolean;
  /** Fill grows from the center instead of the left edge. */
  bipolar?: boolean;
  onChange: (value: number) => void;
}

export function Slider({
  label,
  value,
  displayMax = 127,
  displayValue,
  synced,
  disabled,
  bipolar,
  onChange,
}: SliderProps) {
  const dragging = useRef(false);

  const toDisplay = (cc: number) =>
    displayMax <= 127 ? cc : Math.round((cc * displayMax) / 127);
  const toCc = (display: number) =>
    displayMax <= 127 ? display : Math.round((display * 127) / displayMax);

  /** Absolute positioning: the thumb jumps to wherever the pointer is on the track. */
  const setFromPointer = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const p = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      onChange(toCc(Math.round(p * displayMax)));
    },
    [displayMax, onChange],
  );

  const onPointerDown = (e: React.PointerEvent<HTMLElement>) => {
    if (disabled) return;
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.focus({ preventScroll: true });
    setFromPointer(e);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    if (dragging.current && !disabled) setFromPointer(e);
  };

  const endDrag = () => {
    dragging.current = false;
  };

  const shown = toDisplay(value);
  const norm = value / 127;
  const from = bipolar ? Math.min(norm, 0.5) : 0;
  const to = bipolar ? Math.max(norm, 0.5) : norm;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    const step = e.shiftKey ? 10 : 1;
    let next: number | null = null;
    if (e.key === "ArrowUp" || e.key === "ArrowRight") next = shown + step;
    else if (e.key === "ArrowDown" || e.key === "ArrowLeft") next = shown - step;
    else if (e.key === "PageUp") next = shown + 10;
    else if (e.key === "PageDown") next = shown - 10;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = displayMax;
    if (next == null) return;
    e.preventDefault();
    onChange(toCc(Math.max(0, Math.min(displayMax, next))));
  };

  return (
    <div className={`slider ${synced ? "synced" : "unsynced"} ${disabled ? "disabled" : ""}`}>
      <div className="slider-head">
        <span className="slider-label">{label}</span>
        <span className="slider-value">{displayValue}</span>
      </div>
      <div
        className={`slider-track${bipolar ? " is-bipolar" : ""}`}
        style={
          {
            "--from": from,
            "--to": to,
            "--p": norm,
          } as React.CSSProperties
        }
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onKeyDown}
        role="slider"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={displayMax}
        aria-valuenow={shown}
        aria-valuetext={displayValue}
        tabIndex={disabled ? -1 : 0}
      >
        <span className="slider-fill" />
        <span className="slider-thumb" />
      </div>
    </div>
  );
}
