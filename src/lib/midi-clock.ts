/** Realtime MIDI clock (0xF8) / start-stop, updated without React re-renders. */

let lastPulseMs = 0;
let smoothedPulseSec = 60 / 120 / 24;
let pulses = 0;
let heardClock = false;

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
    return true;
  }
  return false;
}

export function midiClockBpm(): number | null {
  if (!heardClock) return null;
  if (lastPulseMs === 0) return null;
  if (performance.now() - lastPulseMs > 450) return null;
  return 60 / (smoothedPulseSec * 24);
}

/** Quarter-note beats since last Start (or since first pulse). */
export function midiClockBeats(): number {
  return pulses / 24;
}
