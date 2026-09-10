/** S-1 hardware reference — MENU (Shift+pad 15), effect menus, and MIDI limits. */

export interface ReferenceOption {
  /** 7-seg string as Roland encodes it (N≈M, ľ≈W). */
  label: string;
  /** Full name from the owner’s manual. */
  value: string;
  meaning: string;
}

export interface ReferenceItem {
  id: string;
  /** Short display name shown on the unit / in this wiki. */
  name: string;
  /** Display code as printed on the S-1 (e.g. Cho, P.SCL). */
  code?: string;
  /** How to open / edit on the hardware. */
  how: string;
  /** Simple range when there are no discrete options. */
  values?: string;
  /** Discrete sub-options (value → meaning). */
  options?: ReferenceOption[];
  /** Extra tip from the manual. */
  note?: string;
  /** MIDI CC when available in this editor. */
  midi?: string;
  /** Pattern settings (*1) vs system-wide. */
  scope?: "pattern" | "system" | "action";
}

export interface ReferenceSection {
  id: string;
  title: string;
  blurb: string;
  items: ReferenceItem[];
}

const MENU_HOW = "SHIFT + pad 15 (MENU) → select → pad 2 (ENTER)";

export const S1_REFERENCE: ReferenceSection[] = [
  {
    id: "menu",
    title: "MENU (Shift + pad 15)",
    blurb:
      "Hold SHIFT and press pad 15. Turn TEMPO/VALUE to pick an item, then ENTER (pad 2). EXIT is pad 1. (*1) = saved with the current pattern.",
    items: [
      {
        id: "vol",
        name: "Volume",
        code: "vOL",
        how: MENU_HOW,
        values: "0–127",
        note: "Pattern volume (*1).",
        scope: "pattern",
      },
      {
        id: "mod-d",
        name: "LFO Modulation Depth",
        code: "Nod.d",
        how: MENU_HOW,
        values: "0–255",
        note: "Depth of vibrato/growl on OSC or FILTER when modulation (D-Motion / MIDI mod) is used (*1).",
        scope: "pattern",
      },
      {
        id: "bnd-o",
        name: "Oscillator Bend Sens",
        code: "bnd.o",
        how: MENU_HOW,
        values: "0–240",
        note: "Pitch bend / D-Motion range for OSC. 120 ≈ ±1 oct, 240 ≈ ±2 oct (*1). Also CC 18 in this editor.",
        midi: "CC 18",
        scope: "pattern",
      },
      {
        id: "bnd-f",
        name: "Filter Bend Sens",
        code: "bnd.F",
        how: MENU_HOW,
        values: "0–255",
        note: "Pitch bend / D-Motion range for filter cutoff (*1). Also CC 27 in this editor.",
        midi: "CC 27",
        scope: "pattern",
      },
      {
        id: "ns-md",
        name: "Noise Mode",
        code: "nS.Nd",
        how: MENU_HOW,
        options: [
          { label: "Pink", value: "Pink", meaning: "Pink noise" },
          { label: "ľhit", value: "White", meaning: "White noise" },
        ],
        note: "Also CC 78 in this editor (*1).",
        midi: "CC 78",
        scope: "pattern",
      },
      {
        id: "rs-md",
        name: "Riser Mode",
        code: "rS.Nd",
        how: MENU_HOW,
        options: [
          {
            label: "OFF",
            value: "Off",
            meaning: "NOISE knob = noise level only. Any other mode uses the knob for riser/downer.",
          },
          {
            label: "SynC",
            value: "Sync",
            meaning: "Intermittent riser on the upbeat of quarter notes, locked to tempo.",
          },
          {
            label: "qUiv",
            value: "Quiv",
            meaning: "Intervals between riser hits get faster as you turn NOISE clockwise.",
          },
          {
            label: "qvPn",
            value: "QvPan",
            meaning: "Riser pans L→R faster as you turn NOISE clockwise.",
          },
        ],
        note:
          "Min (r.0) / max (d.0) mute the riser. Midpoint (r.100) is the climax. Hold SHIFT while turning NOISE to move the knob without sounding. SHIFT+pad1+pad2 also cycles modes (*1).",
        scope: "pattern",
      },
      {
        id: "rs-rs",
        name: "Riser Resonance",
        code: "rS.rS",
        how: MENU_HOW,
        values: "0–100",
        note: "Shrillness of the riser (*1).",
        scope: "pattern",
      },
      {
        id: "rs-sh",
        name: "Riser Shape",
        code: "rS.Sh",
        how: MENU_HOW,
        values: "0–100",
        note: "Envelope shape: 0 = sawtooth, 100 = square.",
        scope: "pattern",
      },
      {
        id: "rs-lv",
        name: "Riser Level",
        code: "rS.Lv",
        how: MENU_HOW,
        values: "0–100",
        note: "Riser volume (*1).",
        scope: "pattern",
      },
      {
        id: "lfo-n",
        name: "LFO Mode",
        code: "LFO.N",
        how: MENU_HOW,
        options: [
          { label: "norN", value: "Normal", meaning: "Normal speed range" },
          { label: "FASt", value: "Fast", meaning: "Fast mode" },
        ],
        note: "Disabled when LFO Sync is On. Also CC 79 (*1).",
        midi: "CC 79",
        scope: "pattern",
      },
      {
        id: "lfo-s",
        name: "LFO Sync",
        code: "LFO.S",
        how: MENU_HOW,
        options: [
          { label: "OFF", value: "Off", meaning: "Free-running RATE (Hz-style)" },
          { label: "On", value: "On", meaning: "RATE = note length vs tempo; LFO Mode ignored" },
        ],
        note: "Also CC 106 (firmware 1.02+) (*1).",
        midi: "CC 106",
        scope: "pattern",
      },
      {
        id: "lfo-k",
        name: "LFO Key Trigger",
        code: "LFO.K",
        how: MENU_HOW,
        options: [
          { label: "OFF", value: "Off", meaning: "LFO phase continues freely" },
          { label: "On", value: "On", meaning: "LFO resets on note-on" },
        ],
        note: "Also CC 105 (*1).",
        midi: "CC 105",
        scope: "pattern",
      },
      {
        id: "cho",
        name: "Chorus",
        code: "Cho",
        how: MENU_HOW,
        options: [
          { label: "OFF", value: "Off", meaning: "Chorus off" },
          { label: "1", value: "1", meaning: "Standard chorus" },
          { label: "2", value: "2", meaning: "Faster modulation" },
          { label: "3", value: "3", meaning: "Quick modulation (rotary-like, fast)" },
          { label: "4", value: "4", meaning: "More relaxed modulation" },
        ],
        note: "Also CC 93 in this editor (*1).",
        midi: "CC 93",
        scope: "pattern",
      },
      {
        id: "tran",
        name: "Transpose",
        code: "trAn",
        how: MENU_HOW,
        values: "−60 … +60",
        note: "Transposes the tone engine (*1). Also CC 77.",
        midi: "CC 77",
        scope: "pattern",
      },
      {
        id: "p-scl",
        name: "Pattern Scale",
        code: "P.SCL",
        how: MENU_HOW,
        options: [
          { label: "1_8", value: "1/8", meaning: "Eighth note per step" },
          { label: "1_16", value: "1/16", meaning: "Sixteenth note per step" },
          { label: "1_32", value: "1/32", meaning: "Thirty-second note per step" },
          { label: "8t", value: "8t", meaning: "Eighth-note triplet" },
          { label: "16t", value: "16t", meaning: "Sixteenth-note triplet" },
          { label: "32t", value: "32t", meaning: "Thirty-second-note triplet" },
        ],
        note: "Also: hold PATTERN and turn TEMPO/VALUE (*1).",
        scope: "pattern",
      },
      {
        id: "n-prb",
        name: "Master Probability",
        code: "N.Prb",
        how: MENU_HOW,
        values: "−100 … +100 (steps of 10)",
        note: "Offsets each step’s play probability. Also: hold STEP + TEMPO/VALUE.",
        scope: "system",
      },
      {
        id: "n-pri",
        name: "Note Priority",
        code: "n.Pri",
        how: MENU_HOW,
        options: [
          { label: "LASt", value: "Last", meaning: "Last note priority (when Nono / Uni / Chd + LFO/GAtE trigger)" },
          { label: "Loľ", value: "Low", meaning: "Lowest note priority" },
        ],
        scope: "system",
      },
      {
        id: "gl-dr",
        name: "Global Delay/Reverb SW",
        code: "GL.d.r",
        how: MENU_HOW,
        options: [
          {
            label: "OFF",
            value: "Off",
            meaning: "Delay/reverb follow each pattern (may mute when changing patterns).",
          },
          {
            label: "On",
            value: "On",
            meaning: "System delay/reverb; tails carry across pattern changes.",
          },
        ],
        scope: "system",
      },
      {
        id: "d-l-md",
        name: "Delay Level Mode",
        code: "d.L.Nd",
        how: MENU_HOW,
        options: [
          { label: "PrE", value: "Pre", meaning: "DELAY knob = input level; fade-out when turned down" },
          { label: "PoSt", value: "Post", meaning: "DELAY knob = output level; instant mute when turned down" },
        ],
        scope: "system",
      },
      {
        id: "s-clk",
        name: "Sync Clock",
        code: "S.cLk",
        how: MENU_HOW,
        values: "1, 2, 3, 4, 6, 8, 12, 24",
        note: "Sync clocks per beat (SYNC jack / clock division).",
        scope: "system",
      },
      {
        id: "ch",
        name: "MIDI Channel",
        code: "CH",
        how: MENU_HOW,
        values: "1–16",
        note: "Transmit / receive channel for notes & CCs.",
        scope: "system",
      },
      {
        id: "sync",
        name: "MIDI Clock Sync",
        code: "SYnC",
        how: MENU_HOW,
        options: [
          { label: "AUtO", value: "Auto", meaning: "Accept incoming clocks" },
          { label: "Int", value: "Int", meaning: "Internal clock only" },
          { label: "NiDi", value: "MIDI", meaning: "MIDI IN clock only" },
          { label: "USb", value: "USB", meaning: "USB MIDI clock only" },
        ],
        note: "If something is plugged into SYNC IN, the unit always follows that jack.",
        scope: "system",
      },
      {
        id: "thru",
        name: "MIDI Thru",
        code: "thru",
        how: MENU_HOW,
        options: [
          { label: "OFF", value: "Off", meaning: "Do not forward MIDI IN → MIDI OUT" },
          { label: "On", value: "On", meaning: "Forward MIDI IN → MIDI OUT" },
        ],
        scope: "system",
      },
      {
        id: "tx-pc",
        name: "Tx Program Change",
        code: "txPc",
        how: MENU_HOW,
        options: [
          { label: "OFF", value: "Off", meaning: "Do not send PC on pattern change" },
          { label: "On", value: "On", meaning: "Send PC when the pattern changes" },
        ],
        scope: "system",
      },
      {
        id: "rx-pc",
        name: "Rx Program Change",
        code: "rxPc",
        how: MENU_HOW,
        options: [
          { label: "OFF", value: "Off", meaning: "Ignore incoming PC" },
          { label: "On", value: "On", meaning: "Change pattern when PC is received" },
        ],
        scope: "system",
      },
      {
        id: "pc-ch",
        name: "Program Change Channel",
        code: "Pc.Ch",
        how: MENU_HOW,
        values: "1–16",
        note: "MIDI channel used for pattern program changes.",
        scope: "system",
      },
      {
        id: "velo",
        name: "Key Velocity",
        code: "vELo",
        how: MENU_HOW,
        values: "1–127",
        note: "Fixed velocity for the keyboard pads.",
        scope: "system",
      },
      {
        id: "tune",
        name: "Tune",
        code: "tUnE",
        how: MENU_HOW,
        values: "433.0–448.0 Hz",
        note: "Master tuning. Default 440.0 Hz.",
        scope: "system",
      },
      {
        id: "usb-d",
        name: "USB Direct Out",
        code: "USb.d",
        how: MENU_HOW,
        values: "OFF, 1–127",
        note: "OFF = follow VOLUME knob. 1–127 = fixed USB output level.",
        scope: "system",
      },
      {
        id: "a-lnk",
        name: "AIRA Link",
        code: "A.LnK",
        how: MENU_HOW,
        options: [
          { label: "OFF", value: "Off", meaning: "Normal USB (default)" },
          { label: "On", value: "On", meaning: "For AIRA LINK hosts (e.g. MX-1). Power-cycle after change." },
        ],
        note: "Non–USB HOST 3 MX-1 ports may force battery-only mode.",
        scope: "system",
      },
      {
        id: "cnt-i",
        name: "Count In",
        code: "Cnt.I",
        how: MENU_HOW,
        values: "OFF, 2–4",
        note: "Count-in length in beats before recording.",
        scope: "system",
      },
      {
        id: "mtro",
        name: "Metronome",
        code: "Ntro",
        how: MENU_HOW,
        options: [
          { label: "OFF", value: "Off", meaning: "Always off" },
          { label: "rEC", value: "Rec", meaning: "On while recording only" },
          { label: "rC.PL", value: "Rec & Play", meaning: "On while recording and playback" },
        ],
        scope: "system",
      },
      {
        id: "mtr-l",
        name: "Metronome Level",
        code: "Ntr.L",
        how: MENU_HOW,
        values: "0–100",
        scope: "system",
      },
      {
        id: "d-lat",
        name: "D-Motion Latch",
        code: "d.Lat",
        how: MENU_HOW,
        options: [
          { label: "OFF", value: "Off", meaning: "Momentary — active while held (default)" },
          { label: "On", value: "On", meaning: "Toggle on each press" },
        ],
        scope: "system",
      },
      {
        id: "copy",
        name: "Pattern Copy",
        code: "COPy",
        how: MENU_HOW,
        values: "Pick destination pattern → ENTER",
        note: "EXIT cancels. Copies the current pattern to another slot.",
        scope: "action",
      },
      {
        id: "init",
        name: "Pattern Initialize",
        code: "init",
        how: MENU_HOW,
        values: "ENTER to confirm",
        note: "Clears performance data and tones of the current pattern (until power-off / rewrite).",
        scope: "action",
      },
      {
        id: "rlod",
        name: "Reload All",
        code: "rLod",
        how: MENU_HOW,
        values: "ENTER to confirm",
        note: "Restore selected pattern to last saved state (sound + sequence).",
        scope: "action",
      },
      {
        id: "rl-sd",
        name: "Reload Sound",
        code: "rL.Sd",
        how: MENU_HOW,
        values: "ENTER to confirm",
        note: "Restore tone only. Shortcut: SHIFT + pad 1 + POLY.",
        scope: "action",
      },
      {
        id: "rl-sq",
        name: "Reload Sequence",
        code: "rL.Sq",
        how: MENU_HOW,
        values: "ENTER to confirm",
        note: "Restore performance / sequencer data only.",
        scope: "action",
      },
    ],
  },
  {
    id: "reverb",
    title: "Reverb menu (Shift + pad 14)",
    blurb: "Deep reverb parameters. Only Time (CC 89) and Level (CC 91) are reachable over MIDI.",
    items: [
      {
        id: "rev-type",
        name: "Type",
        code: "tyPE",
        how: "SHIFT + pad 14 (REVERB menu)",
        options: [
          { label: "ANb", value: "Ambience", meaning: "Ambience — distant / off-mic space" },
          { label: "RooN", value: "Room", meaning: "Room — small room" },
          { label: "hAL1", value: "Hall 1", meaning: "Hall 1 — clear, spacious hall" },
          { label: "hAL2", value: "Hall 2", meaning: "Hall 2 — milder hall" },
          { label: "PLAt", value: "Plate", meaning: "Plate reverb" },
          { label: "SPrn", value: "Spring", meaning: "Guitar-amp spring" },
          { label: "Nod", value: "Modulate", meaning: "Hall with a wavering effect" },
        ],
      },
      {
        id: "rev-time",
        name: "Time",
        code: "tiNE",
        how: "SHIFT + REVERB knob",
        values: "0–255",
        midi: "CC 89",
      },
      {
        id: "rev-level",
        name: "Level",
        code: "LEv",
        how: "REVERB knob",
        values: "0–255",
        midi: "CC 91",
      },
      {
        id: "rev-pd",
        name: "Pre Delay",
        code: "Pr.dL",
        how: "REVERB menu",
        values: "0–100 ms",
      },
      {
        id: "rev-lo",
        name: "Low Cut",
        code: "Lo.Ct",
        how: "REVERB menu",
        values: "FLAt, 20 Hz … 800 Hz",
      },
      {
        id: "rev-hi",
        name: "High Cut",
        code: "Hi.Ct",
        how: "REVERB menu",
        values: "630 Hz … 12.5 kHz, FLAt",
      },
      {
        id: "rev-dens",
        name: "Density",
        code: "dEnS",
        how: "REVERB menu",
        values: "0–10",
      },
    ],
  },
  {
    id: "delay",
    title: "Delay menu (Shift + pad 13)",
    blurb: "Deep delay parameters. Only Time (CC 90) and Level (CC 92) are MIDI CCs.",
    items: [
      {
        id: "dly-sync",
        name: "Sync",
        code: "d.Syn",
        how: "DELAY menu",
        options: [
          { label: "OFF", value: "Off", meaning: "Time in milliseconds" },
          { label: "On", value: "On", meaning: "Time as note lengths vs tempo" },
        ],
      },
      {
        id: "dly-time",
        name: "Time",
        code: "tiNE",
        how: "SHIFT + DELAY knob",
        values: "1–740 ms (Sync Off) · note lengths (Sync On)",
        midi: "CC 90",
      },
      {
        id: "dly-level",
        name: "Level",
        code: "LEv",
        how: "DELAY knob",
        values: "0–255",
        midi: "CC 92",
      },
      {
        id: "dly-fb",
        name: "Feedback",
        code: "Fdbk",
        how: "DELAY menu",
        values: "0–255",
      },
      {
        id: "dly-lo",
        name: "Low Cut",
        code: "Lo.Ct",
        how: "DELAY menu",
        values: "FLAt, 20 Hz … 800 Hz",
      },
      {
        id: "dly-hi",
        name: "High Cut",
        code: "Hi.Ct",
        how: "DELAY menu",
        values: "630 Hz … 12.5 kHz, FLAt",
      },
    ],
  },
  {
    id: "lfo-sync",
    title: "LFO Sync note lengths",
    blurb: "When LFO Sync is On, RATE picks a note length against tempo (not free Hz).",
    items: [
      {
        id: "lfo-rate-table",
        name: "RATE table",
        how: "LFO Sync On · RATE knob",
        values:
          "8_1 · 6_1 · 8_1t · 4_1 · 3_1 · 4_1t · 2_1 · 1d · 2_1t · 1_1 · 2d · 1t · 1_2 · 4d · 2t · 1_4 · 8d · 4t · 1_8 · 16d · 8t · 1_16 · 32d · 16t · 1_32 · 64d · 32t · 1_64 · 128d · 64t · 128",
        note: "If RATE drifts after changes, stop then start the sequencer again.",
      },
    ],
  },
  {
    id: "limits",
    title: "What MIDI cannot do",
    blurb: "This editor is CC-only. The S-1 has no SysEx parameter dump.",
    items: [
      {
        id: "sysex",
        name: "SysEx",
        how: "MIDI chart",
        values: "Not supported for parameter edit",
      },
      {
        id: "prm",
        name: "PRM / pattern data",
        how: "Hardware Write (SHIFT + pad 16)",
        values: "Sequencer, Draw/Chop tables, deep menus — save on the S-1",
      },
      {
        id: "mod-cutoff",
        name: "Live modulated cutoff",
        how: "Internal DSP",
        values: "LFO/ENV-modulated filter is not streamed — visualizers estimate from CCs + USB audio",
      },
    ],
  },
];
