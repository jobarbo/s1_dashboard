import { useEffect, useRef, useState } from "react";

export const VIZ_SIZE = {
  full: { width: 320, height: 72 },
  compact: { width: 260, height: 36 },
  filterCompact: { width: 260, height: 72 },
} as const;

export function vizDimensions(compact?: boolean) {
  return compact ? VIZ_SIZE.compact : VIZ_SIZE.full;
}

/** CSS-pixel size of a fill wrapper; canvas bitmap should match this. */
export function useVizFillSize(minWidth = 40, minHeight = 28) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 260, height: 72 });

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => {
      const width = Math.max(minWidth, Math.floor(el.clientWidth));
      const height = Math.max(minHeight, Math.floor(el.clientHeight));
      setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [minWidth, minHeight]);

  return { wrapRef, width: size.width, height: size.height };
}
