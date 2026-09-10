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

const DARK: VizPalette = {
  wave: "rgba(230, 245, 240, 0.92)",
  waveSoft: "rgba(230, 245, 240, 0.92)",
  grid: "rgba(94, 207, 184, 0.12)",
  gridMid: "rgba(94, 207, 184, 0.28)",
  glow: "rgb(110, 230, 200)",
  shadow: "rgba(94, 207, 184, 0.55)",
  lfo: "rgba(120, 210, 190, 0.95)",
  lfoDot: "rgba(160, 255, 220, 0.95)",
  filter: "rgba(255, 190, 120, 0.95)",
  filterFill: "rgba(255, 190, 120, 0.14)",
  filterGlow: ["rgba(255, 140, 90, 0.45)", "rgba(255, 170, 110, 0.16)", "rgba(255, 190, 120, 0.02)"],
  filterEnv: "rgba(255, 252, 235, 0.42)",
  filterEnvSoft: "rgba(255, 230, 190, 0.32)",
  filterLfo: "rgba(186, 140, 255, 0.92)",
  filterLfoLabel: "rgba(186, 140, 255, 0.8)",
  envLabel: "rgba(255, 252, 235, 0.45)",
  spectrum: ["rgba(110, 230, 200, 0.85)", "rgba(94, 207, 184, 0.55)", "rgba(94, 207, 184, 0.12)"],
  spectrumStroke: "rgba(140, 255, 220, 0.95)",
  adsr: {
    attack: "rgb(110, 190, 255)",
    decay: "rgb(186, 140, 255)",
    sustain: "rgb(255, 214, 90)",
    release: "rgb(255, 120, 165)",
  },
  ampTone: "rgb(140, 255, 220)",
  ampWave: "rgba(230, 245, 240, 0.92)",
};

/** Dark inset panels + punchier strokes so plots stay readable on a light UI. */
const LIGHT: VizPalette = {
  wave: "rgba(255, 255, 255, 0.95)",
  waveSoft: "rgba(210, 255, 240, 0.95)",
  grid: "rgba(80, 220, 190, 0.22)",
  gridMid: "rgba(90, 235, 200, 0.45)",
  glow: "rgb(70, 240, 200)",
  shadow: "rgba(40, 200, 170, 0.65)",
  lfo: "rgba(90, 235, 205, 0.98)",
  lfoDot: "rgba(180, 255, 230, 1)",
  filter: "rgba(255, 170, 70, 1)",
  filterFill: "rgba(255, 160, 60, 0.22)",
  filterGlow: ["rgba(255, 120, 40, 0.55)", "rgba(255, 150, 70, 0.22)", "rgba(255, 180, 90, 0.04)"],
  filterEnv: "rgba(255, 255, 245, 0.55)",
  filterEnvSoft: "rgba(255, 220, 160, 0.4)",
  filterLfo: "rgba(200, 150, 255, 0.98)",
  filterLfoLabel: "rgba(210, 170, 255, 0.9)",
  envLabel: "rgba(255, 255, 245, 0.55)",
  spectrum: ["rgba(80, 235, 200, 0.9)", "rgba(60, 200, 170, 0.6)", "rgba(50, 180, 150, 0.16)"],
  spectrumStroke: "rgba(120, 255, 220, 1)",
  adsr: {
    attack: "rgb(90, 180, 255)",
    decay: "rgb(190, 130, 255)",
    sustain: "rgb(255, 200, 50)",
    release: "rgb(255, 100, 150)",
  },
  ampTone: "rgb(90, 245, 210)",
  ampWave: "rgba(240, 255, 250, 0.95)",
};

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
