/** Realtime MIDI clock (0xF8) / start-stop. LFO can read live BPM; the UI badge uses a latched value. */

let lastPulseMs = 0;
let smoothedPulseSec = 60 / 120 / 24;
let pulses = 0;
let heardClock = false;

/** Last BPM shown in the UI — set once, then only on stable encoder-sized jumps. */
let latchedBpm: number | null = null;
let pendingRound: number | null = null;
let pendingHits = 0;

type TempoListener = (bpm: number | null) => void;
const tempoListeners = new Set<TempoListener>();

function notifyTempo(): void {
  const value = latchedBpm == null ? null : Math.round(latchedBpm);
  for (const listener of tempoListeners) listener(value);
}

function considerTempoLatch(bpm: number): void {
  const rounded = Math.round(bpm);

  if (latchedBpm == null) {
    latchedBpm = bpm;
    pendingRound = null;
    pendingHits = 0;
    notifyTempo();
    return;
  }

  const latchedRound = Math.round(latchedBpm);
  if (rounded === latchedRound) {
    // Same displayed value — track float quietly, no UI refresh.
    latchedBpm = bpm;
    pendingRound = null;
    pendingHits = 0;
    return;
  }

  // Require a few consistent readings before treating this as an encoder change.
  if (pendingRound === rounded) {
    pendingHits += 1;
    if (pendingHits >= 5) {
      latchedBpm = bpm;
      pendingRound = null;
      pendingHits = 0;
      notifyTempo();
    }
  } else {
    pendingRound = rounded;
    pendingHits = 1;
  }
}

export function ingestMidiRealtime(data: Uint8Array): boolean {
  if (data.length < 1) return false;
  const status = data[0];
  if (status === 0xf8) {
    const now = performance.now();
    if (lastPulseMs > 0) {
      const dt = (now - lastPulseMs) / 1000;
      if (dt > 0.004 && dt < 0.12) {
        smoothedPulseSec += (dt - smoothedPulseSec) * 0.14;
        heardClock = true;
        considerTempoLatch(60 / (smoothedPulseSec * 24));
      }
    }
    lastPulseMs = now;
    pulses += 1;
    return true;
  }
  if (status === 0xfa || status === 0xfb) {
    pulses = 0;
    heardClock = true;
    return true;
  }
  if (status === 0xfc) {
    heardClock = false;
    // Keep latched BPM — tempo encoder value does not clear when clock stops.
    return true;
  }
  return false;
}

/** Live estimate while clock is flowing (visualizers / LFO sync). */
export function midiClockBpm(): number | null {
  if (!heardClock) return null;
  if (lastPulseMs === 0) return null;
  if (performance.now() - lastPulseMs > 450) return null;
  return 60 / (smoothedPulseSec * 24);
}

/** Stable BPM for the header badge (survives clock stop; sparse updates). */
export function getLatchedTempoBpm(): number | null {
  return latchedBpm == null ? null : Math.round(latchedBpm);
}

export function subscribeTempo(listener: TempoListener): () => void {
  tempoListeners.add(listener);
  listener(getLatchedTempoBpm());
  return () => {
    tempoListeners.delete(listener);
  };
}

/** Quarter-note beats since last Start (or since first pulse). */
export function midiClockBeats(): number {
  return pulses / 24;
}
