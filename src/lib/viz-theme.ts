/** Canvas stroke/fill colors for visualizers — tuned per theme for contrast. */

export interface VizAdsrColors {
  attack: string;
  decay: string;
  sustain: string;
  release: string;
}

export interface VizPalette {
  wave: string;
  waveSoft: string;
  grid: string;
  gridMid: string;
  glow: string;
  shadow: string;
  lfo: string;
  lfoDot: string;
  filter: string;
  filterFill: string;
  filterGlow: [string, string, string];
  filterEnv: string;
  filterEnvSoft: string;
  filterLfo: string;
  filterLfoLabel: string;
  envLabel: string;
  spectrum: [string, string, string];
  spectrumStroke: string;
  adsr: VizAdsrColors;
  ampTone: string;
  ampWave: string;
}

/**
 * Shared with s1-modular: dark-green LCD screen, phosphor-green primary trace,
 * orange accent and teal secondary accent.
 */
const LCD = "125, 255, 176";
const TE_BLUE = "62, 199, 194";
const TE_GREEN = LCD;
const TE_GRAY = "180, 186, 195";
const TE_ORANGE = "255, 106, 42";

const DARK: VizPalette = {
  wave: `rgba(${LCD}, 0.95)`,
  waveSoft: `rgba(${LCD}, 0.7)`,
  grid: `rgba(${LCD}, 0.07)`,
  gridMid: `rgba(${LCD}, 0.2)`,
  glow: `rgb(${LCD})`,
  shadow: `rgba(${LCD}, 0.3)`,
  lfo: `rgba(${TE_BLUE}, 1)`,
  lfoDot: `rgba(${TE_GRAY}, 1)`,
  filter: `rgba(${TE_ORANGE}, 1)`,
  filterFill: `rgba(${TE_ORANGE}, 0.14)`,
  filterGlow: [`rgba(${TE_ORANGE}, 0.4)`, `rgba(${TE_ORANGE}, 0.12)`, `rgba(${TE_ORANGE}, 0.02)`],
  filterEnv: `rgba(${TE_GRAY}, 0.5)`,
  filterEnvSoft: `rgba(${TE_GRAY}, 0.3)`,
  filterLfo: `rgba(${TE_BLUE}, 1)`,
  filterLfoLabel: `rgba(${TE_BLUE}, 0.9)`,
  envLabel: `rgba(${TE_GRAY}, 0.55)`,
  spectrum: [`rgba(${TE_GREEN}, 0.85)`, `rgba(${TE_GREEN}, 0.4)`, `rgba(${TE_GREEN}, 0.06)`],
  spectrumStroke: `rgba(${TE_GREEN}, 1)`,
  adsr: {
    attack: `rgb(${TE_BLUE})`,
    decay: `rgb(${TE_GREEN})`,
    sustain: `rgb(${TE_GRAY})`,
    release: `rgb(${TE_ORANGE})`,
  },
  ampTone: `rgb(${TE_GREEN})`,
  ampWave: `rgba(${LCD}, 0.95)`,
};

/** Plots stay as dark LCD "screens" on the light UI, so reuse the same palette. */
const LIGHT: VizPalette = DARK;

export function getVizPalette(): VizPalette {
  if (typeof document === "undefined") return DARK;
  return document.documentElement.dataset.theme === "light" ? LIGHT : DARK;
}

export function filterAdsrOverlay(palette: VizPalette = getVizPalette()) {
  return {
    attack: { color: palette.adsr.attack, dash: [5, 3] as number[] },
    decay: { color: palette.adsr.decay, dash: [3, 3] as number[] },
    sustain: { color: palette.adsr.sustain, dash: [7, 4] as number[] },
    release: { color: palette.adsr.release, dash: [2, 3] as number[] },
  } as const;
}
