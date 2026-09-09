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
  noteOnGeneration?: number;
}

export function SectionVisualizer({
  section,
  getVal,
  audioAnalysers,
  audioActive,
  noteOnGeneration = 0,
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
            fastMode={ccToOptionIndex(getVal("lfo-mode"), 2) === 1}
            keyTrigger={ccToOptionIndex(getVal("lfo-key-trigger"), 2) === 1}
            noteOnGeneration={noteOnGeneration}
            analyser={audioAnalysers?.spectrum ?? null}
            waveAnalyser={audioAnalysers?.waveform ?? null}
            audioActive={audioActive}
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
            envAttack={getVal("env-attack")}
            envDecay={getVal("env-decay")}
            envSustain={getVal("env-sustain")}
            envRelease={getVal("env-release")}
            lfoAmount={getVal("filter-lfo")}
            lfoRateCc={getVal("lfo-rate")}
            lfoWaveformCc={getVal("lfo-waveform")}
            lfoSyncOn={ccToOptionIndex(getVal("lfo-sync"), 2) === 1}
            lfoFastMode={ccToOptionIndex(getVal("lfo-mode"), 2) === 1}
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
            analyser={audioAnalysers?.waveform ?? null}
            audioActive={audioActive}
          />
        </div>
      );
    default:
      return null;
  }
}
