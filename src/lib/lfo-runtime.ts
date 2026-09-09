/** Shared LFO clock so Filter + LFO panels stay phase-locked. */

function wrap01(phase: number): number {
  return phase - Math.floor(phase);
}

let phase0 = 0;
let t0 =
  typeof performance !== "undefined" ? performance.now() : 0;
let rateHz = 1;

/** Rebase phase so changing rate does not jump. */
export function setSharedLfoRateHz(hz: number, now = performance.now()): void {
  const safe = Math.max(1e-4, hz);
  if (Math.abs(safe - rateHz) / rateHz < 0.0005) {
    rateHz = safe;
    return;
  }
  phase0 = getSharedLfoPhase(now);
  t0 = now;
  rateHz = safe;
}

export function getSharedLfoPhase(now = performance.now()): number {
  return wrap01(phase0 + rateHz * ((now - t0) / 1000));
}

export function getSharedLfoRateHz(): number {
  return rateHz;
}

export function nudgeSharedLfoPhase(delta: number, now = performance.now()): void {
  phase0 = wrap01(getSharedLfoPhase(now) + delta);
  t0 = now;
}

export function resetSharedLfoPhase(now = performance.now()): void {
  phase0 = 0;
  t0 = now;
}
