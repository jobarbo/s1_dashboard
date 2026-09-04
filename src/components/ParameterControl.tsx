import {
  ccToOptionIndex,
  formatParameterValue,
  getCcForToggle,
  isToggleOn,
  optionIndexToCc,
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
        <input
          type="checkbox"
          checked={on}
          disabled={disabled}
          onChange={(e) => onChange(def.id, getCcForToggle(e.target.checked))}
        />
        <span className="toggle-label">{def.name}</span>
        <span className="toggle-value">{synced ? display : "?"}</span>
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
        <span className="select-value">{synced ? display : "?"}</span>
      </label>
    );
  }

  return (
    <Knob
      label={def.name}
      value={value}
      displayValue={display}
      synced={synced}
      disabled={disabled}
      onChange={(v) => onChange(def.id, v)}
    />
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
  return (
    <div className="param-grid">
      {params.map((state) => (
        <ParameterControl
          key={state.def.id}
          state={state}
          disabled={disabled}
          onChange={onChange}
        />
      ))}
    </div>
  );
}
