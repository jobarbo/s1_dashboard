/** S-1 menu / system options that have no MIDI CC — reference only. */

export interface ReferenceItem {
  name: string;
  how: string;
  values: string;
}

export interface ReferenceSection {
  id: string;
  title: string;
  blurb: string;
  items: ReferenceItem[];
}

export const S1_REFERENCE: ReferenceSection[] = [
  {
    id: "reverb",
    title: "Reverb (Shift + pad 14)",
    blurb: "Only Time & Level are MIDI CCs (89 / 91). Everything else is menu-only.",
    items: [
      {
        name: "Type",
        how: "REVERB menu → tyPE",
        values: "Ambience, Room, Hall1, Hall2, Plate, Spring, Modulate",
      },
      {
        name: "Time",
        how: "SHIFT + REVERB knob · CC 89",
        values: "0–255",
      },
      {
        name: "Level",
        how: "REVERB knob · CC 91",
        values: "0–255",
      },
      {
        name: "Pre Delay",
        how: "REVERB menu → Pr.dL",
        values: "0–100 ms",
      },
      {
        name: "Low Cut",
        how: "REVERB menu → Lo.Ct",
        values: "Flat, 20…800 Hz",
      },
      {
        name: "High Cut",
        how: "REVERB menu → Hi.Ct",
        values: "630 Hz … 12.5k, Flat",
      },
      {
        name: "Density",
        how: "REVERB menu → dEnS",
        values: "0–10",
      },
    ],
  },
  {
    id: "delay",
    title: "Delay (Shift + pad 13)",
    blurb: "Only Time & Level are MIDI CCs (90 / 92). Sync, Feedback and EQ are menu-only.",
    items: [
      {
        name: "Sync",
        how: "DELAY menu → d.Syn",
        values: "Off, On (tempo note lengths when On)",
      },
      {
        name: "Time",
        how: "SHIFT + DELAY knob · CC 90",
        values: "1–740 ms (Sync Off) · note lengths (Sync On)",
      },
      {
        name: "Level",
        how: "DELAY knob · CC 92",
        values: "0–255",
      },
      {
        name: "Feedback",
        how: "DELAY menu → Fdbk",
        values: "0–255",
      },
      {
        name: "Low Cut",
        how: "DELAY menu → Lo.Ct",
        values: "Flat, 20…800 Hz",
      },
      {
        name: "High Cut",
        how: "DELAY menu → Hi.Ct",
        values: "630 Hz … 12.5k, Flat",
      },
    ],
  },
  {
    id: "lfo-sync",
    title: "LFO Sync note lengths",
    blurb: "When LFO Sync is On, RATE selects a note length vs tempo (not free Hz).",
    items: [
      {
        name: "RATE table",
        how: "LFO Sync On · RATE knob",
        values:
          "8_1, 6_1, 8_1t, 4_1, 3_1, 4_1t, 2_1, 1d, 2_1t, 1_1, 2d, 1t, 1_2, 4d, 2t, 1_4, 8d, 4t, 1_8, 16d, 8t, 1_16, 32d, 16t, 1_32, 64d, 32t, 1_64, 128d, 64t, 128",
      },
      {
        name: "Tip",
        how: "Manual",
        values: "If RATE changes drift out of time, stop then start the sequencer again.",
      },
    ],
  },
  {
    id: "chorus",
    title: "Chorus",
    blurb: "Chorus type is MIDI CC 93.",
    items: [
      {
        name: "Type",
        how: "MENU → Cho · CC 93",
        values: "Off, 1, 2, 3, 4",
      },
    ],
  },
  {
    id: "limits",
    title: "What MIDI cannot do",
    blurb: "The S-1 has no SysEx parameter dump. This editor is CC-only.",
    items: [
      {
        name: "SysEx",
        how: "MIDI chart",
        values: "Not supported for parameter edit",
      },
      {
        name: "PRM / pattern data",
        how: "Hardware Write",
        values: "Sequencer, Draw/Chop tables, deep menus — save on the S-1",
      },
      {
        name: "Live modulated cutoff",
        how: "Internal DSP",
        values: "LFO/ENV-modulated filter is not streamed — visualizers estimate from CCs + USB audio",
      },
    ],
  },
];
