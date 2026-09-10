import { useEffect, useState } from "react";
import { getLatchedTempoBpm, subscribeTempo } from "../lib/midi-clock";
import { useI18n } from "../lib/use-i18n";

export function TempoBadge() {
  const { t } = useI18n();
  const [bpm, setBpm] = useState<number | null>(() => getLatchedTempoBpm());

  useEffect(() => subscribeTempo(setBpm), []);

  const label = bpm == null ? "—" : bpm.toString();

  return (
    <span className={`badge tempo-badge${bpm == null ? "" : " badge-ok"}`}>
      {t("tempoBpm", { bpm: label })}
    </span>
  );
}
