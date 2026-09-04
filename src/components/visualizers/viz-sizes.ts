export const VIZ_SIZE = {
  full: { width: 320, height: 72 },
  compact: { width: 260, height: 36 },
} as const;

export function vizDimensions(compact?: boolean) {
  return compact ? VIZ_SIZE.compact : VIZ_SIZE.full;
}
