import {
  ccToOptionIndex,
  formatParameterValue,
  getCcForToggle,
  isToggleOn,
  optionIndexToCc,
  paramDisplayMax,
} from "../lib/parameters";
import type { ParameterState } from "../lib/patch-store";
import { Knob } from "./Knob";

interface ParameterControlProps {
  state: ParameterState;
  disabled?: boolean;
  onChange: (id: string, value: number) => void;
}

export function ParameterControl({ state, disabled, onChange }: ParameterControlProps) {
  const { def, value, synced } = state;
  const display = formatParameterValue(def, value);

  if (def.type === "toggle") {
    const on = isToggleOn(value);
    return (
      <label className={`toggle ${synced ? "synced" : "unsynced"}`}>
        <span className="toggle-label">{def.name}</span>
        <span className="toggle-row">
          <input
            type="checkbox"
            checked={on}
            disabled={disabled}
            onChange={(e) => onChange(def.id, getCcForToggle(e.target.checked))}
          />
          <span className="toggle-value">{display}</span>
        </span>
      </label>
    );
  }

  if (def.type === "dropdown" && def.options) {
    const idx = ccToOptionIndex(value, def.options.length);
    return (
      <label className={`select-control ${synced ? "synced" : "unsynced"}`}>
        <span className="select-label">{def.name}</span>
        <select
          value={idx}
          disabled={disabled}
          onChange={(e) =>
            onChange(def.id, optionIndexToCc(Number(e.target.value), def.options!.length))
          }
        >
          {def.options.map((opt, i) => (
            <option key={opt} value={i}>
              {opt}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <Knob
      label={def.name}
      value={value}
      displayMax={paramDisplayMax(def)}
      displayValue={display}
      synced={synced}
      disabled={disabled}
      onChange={(v) => onChange(def.id, v)}
    />
  );
}

function isSetting(state: ParameterState): boolean {
  return state.def.type === "dropdown" || state.def.type === "toggle";
}

const GROUP_ORDER = [
  "Mix",
  "Tone",
  "Pitch / PWM",
  "Mod",
  "Draw / Chop",
  "Reverb",
  "Delay",
  "Chorus",
  "Chord",
];

function layoutParams(params: ParameterState[]) {
  const settings: ParameterState[] = [];
  const knobs: ParameterState[] = [];
  const grouped = new Map<string, ParameterState[]>();

  for (const p of params) {
    const g = p.def.group;
    if (g) {
      const list = grouped.get(g) ?? [];
      list.push(p);
      grouped.set(g, list);
    } else if (isSetting(p)) {
      settings.push(p);
    } else {
      knobs.push(p);
    }
  }

  const groupOrder = [...grouped.keys()].sort((a, b) => {
    const ia = GROUP_ORDER.indexOf(a);
    const ib = GROUP_ORDER.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

  return { settings, knobs, groupOrder, grouped };
}

function ParamCluster({
  label,
  items,
  disabled,
  onChange,
}: {
  label?: string;
  items: ParameterState[];
  disabled?: boolean;
  onChange: (id: string, value: number) => void;
}) {
  const settings = items.filter(isSetting);
  const knobs = items.filter((p) => !isSetting(p));
  if (items.length === 0) return null;

  return (
    <div className="param-group">
      {label ? <h3 className="param-group-label">{label}</h3> : null}
      {settings.length > 0 && (
        <div className="param-settings">
          {settings.map((state) => (
            <ParameterControl key={state.def.id} state={state} disabled={disabled} onChange={onChange} />
          ))}
        </div>
      )}
      {knobs.length > 0 && (
        <div className="param-knob-row">
          {knobs.map((state) => (
            <ParameterControl key={state.def.id} state={state} disabled={disabled} onChange={onChange} />
          ))}
        </div>
      )}
    </div>
  );
}

export function ParameterGrid({
  params,
  disabled,
  onChange,
}: {
  params: ParameterState[];
  disabled?: boolean;
  onChange: (id: string, value: number) => void;
}) {
  const { settings, knobs, groupOrder, grouped } = layoutParams(params);

  return (
    <div className="param-panel">
      <ParamCluster items={settings} disabled={disabled} onChange={onChange} />
      <ParamCluster items={knobs} disabled={disabled} onChange={onChange} />
      {groupOrder.map((name) => (
        <ParamCluster
          key={name}
          label={name}
          items={grouped.get(name) ?? []}
          disabled={disabled}
          onChange={onChange}
        />
      ))}
    </div>
  );
}
