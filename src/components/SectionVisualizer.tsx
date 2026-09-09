import { ccToOptionIndex, type S1Section } from "../lib/parameters";
import {
  AdsrVisualizer,
  FilterVisualizer,
  LfoVisualizer,
  OscVisualizer,
} from "./visualizers/Visualizers";
import type { UsbAudioAnalysers } from "../lib/usb-audio";

interface SectionVisualizerProps {
  section: S1Section;
  getVal: (id: string, fallback?: number) => number;
  audioAnalysers: UsbAudioAnalysers | null;
  audioActive: boolean;
}

export function SectionVisualizer({
  section,
  getVal,
  audioAnalysers,
  audioActive,
}: SectionVisualizerProps) {
  switch (section) {
    case "lfo":
      return (
        <div className="section-viz-stack">
          <LfoVisualizer
            compact
            rateCc={getVal("lfo-rate")}
            waveformCc={getVal("lfo-waveform")}
            syncOn={ccToOptionIndex(getVal("lfo-sync"), 2) === 1}
          />
        </div>
      );
    case "oscillator":
      return (
        <div className="section-viz-stack">
          <OscVisualizer
            compact
            square={getVal("square-level")}
            saw={getVal("saw-level")}
            sub={getVal("sub-level")}
            noise={getVal("noise-level")}
            pulseWidth={getVal("square-pw")}
            drawMode={ccToOptionIndex(getVal("draw-sw"), 3)}
            subOct={ccToOptionIndex(getVal("sub-oct"), 3)}
          />
        </div>
      );
    case "filter":
      return (
        <div className="section-viz-stack">
          <FilterVisualizer
            compact
            cutoff={getVal("filter-cutoff")}
            resonance={getVal("filter-reso")}
            envAmount={getVal("filter-env")}
            envSustain={getVal("env-sustain")}
            analyser={audioAnalysers?.spectrum ?? null}
            audioActive={audioActive}
          />
        </div>
      );
    case "envelope":
      return (
        <div className="section-viz-stack">
          <AdsrVisualizer
            compact
            attack={getVal("env-attack")}
            decay={getVal("env-decay")}
            sustain={getVal("env-sustain")}
            release={getVal("env-release")}
          />
        </div>
      );
    default:
      return null;
  }
}
