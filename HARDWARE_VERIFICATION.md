# Hardware verification checklist

## Verified without hardware (mock MIDI)

Date: 2026-09-02  
Environment: Chrome, `npm run dev`, Mock MIDI enabled

| Step | Result |
|------|--------|
| Page loads with all section cards (LFO, OSC, Filter, ENV, EFX, Voice, Controls) | Pass |
| Connect with Mock MIDI | Pass |
| Controls enabled after connect | Pass |
| Parameters show `?` while unsynced | Pass |
| Send All marks parameters synced (except CC64 damper) | Pass |
| Mock echo updates values after Send All | Pass |
| Wave visualizers render (osc, LFO animation, filter, ADSR) | Pass |
| On-screen keyboard sends note on/off when connected | Pass |
| Build (`npm run build`) | Pass |

## Real S-1 hardware (manual pass required)

Perform these steps with the S-1 connected via USB-C in Chrome or Edge. Uncheck **Mock MIDI** before Connect.

| Step | Expected | Pass |
|------|----------|------|
| Connect | Browser prompts for MIDI; output shows `S-1` | ☐ |
| Move **Filter FREQ** on hardware | Cutoff knob + filter curve update; value loses `?` | ☐ |
| Drag **LFO Rate** in UI | Hardware LFO rate changes | ☐ |
| **Send All** | All bulk CCs applied on synth; unsynced count → 0 (damper may stay `?`) | ☐ |
| **Panic** | Hanging notes cleared | ☐ |
| Discrete: **LFO Waveform** | Each option matches hardware display | ☐ |
| Discrete: **Osc Range** | 64′–2′ options match hardware | ☐ |
| Discrete: **Polyphony** | Mono / Unison / Poly / Chord match | ☐ |

### Discrete CC encoding notes

Dropdown CC values use even 0–127 buckets until verified on hardware. If an option does not match the S-1 panel, adjust bucket mapping in `src/lib/parameters.ts` (`ccToOptionIndex` / `optionIndexToCc`).

Known parameters to spot-check first: CC12 (LFO waveform), CC14 (range), CC80 (poly), CC106 (LFO sync, firmware 1.02+).

### Limitations (by design)

- No SysEx — cannot dump or save full patches from the web app
- CC64 (damper) excluded from Send All
- Draw/chop step tables not shown (PRM-only data; future `.PRM` import)
- Safari / iOS unsupported (no Web MIDI)
