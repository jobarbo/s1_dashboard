# Roland S-1 Web Editor

Unofficial browser dashboard for the Roland AIRA Compact **S-1** synthesizer. Connect over **USB-C** (class-compliant MIDI) and edit LFO, oscillator, filter, envelope, effects, and voice parameters from a visual UI with waveform visualizers.

Not affiliated with Roland Corporation.

## Requirements

- **Browser:** Chrome or Edge (Web MIDI API). Safari is not supported.
- **Cable:** USB-C data cable (not charge-only).
- **Synth:** Roland S-1 on default MIDI channel **3** for CCs.

The S-1 does **not** accept SysEx, so the editor cannot read the current patch from hardware. After connecting, move a knob on the S-1 or click **Send All** to sync.

## Quick start

```bash
npm install
npm run dev
```

Open `http://localhost:4321` in Chrome.

1. Uncheck **Mock MIDI** if your S-1 is plugged in.
2. Click **Connect** and allow MIDI access.
3. Click **Send All** to push the dashboard values to the synth (or twist hardware knobs to pull values in).

## Features

- All **54 MIDI CC** parameters from the official S-1 implementation chart
- Section cards: LFO, Oscillator, Filter, Envelope, Effects, Voice, Controls
- **Unsynced (`?`)** indicators until values are confirmed from hardware or Send All
- Heuristic **osc mix, LFO, filter curve, and ADSR** visualizers
- On-screen keyboard for auditioning on channel 3
- **Send All**, **Panic**, localStorage for last UI values
- **Mock MIDI** for development without hardware

## Build

```bash
npm run build
npm run preview
```

## Hardware verification

See [HARDWARE_VERIFICATION.md](./HARDWARE_VERIFICATION.md) for the mock/browser checklist and steps to validate against a real S-1.

## References

- [Roland S-1 MIDI implementation chart (v1.02)](https://static.roland.com/manuals/s-1_manual_v102/eng/87294690.html)
- [midi.guide S-1 CC list](https://midi.guide/d/roland/s-1/)
