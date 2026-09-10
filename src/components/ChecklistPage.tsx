import { useEffect, useState } from "react";
import {
  CHECKLIST_STEPS,
  clearChecklistFlags,
  loadChecklistFlags,
  loadChecklistProgress,
  markChecklistStep,
  saveChecklistProgress,
  type ChecklistProgress,
} from "../lib/onboarding";
import { useI18n } from "../lib/use-i18n";
import type { MessageKey } from "../lib/messages";

const STEP_TITLE: Record<string, MessageKey> = {
  connect: "checkConnect",
  sendAll: "checkSendAll",
  cutoff: "checkCutoff",
  testNote: "checkTestNote",
  reference: "checkReference",
  snapshot: "checkSnapshot",
};

const STEP_HINT: Record<string, MessageKey> = {
  connect: "checkConnectHint",
  sendAll: "checkSendAllHint",
  cutoff: "checkCutoffHint",
  testNote: "checkTestNoteHint",
  reference: "checkReferenceHint",
  snapshot: "checkSnapshotHint",
};

function computeAutoProgress(manual: ChecklistProgress): ChecklistProgress {
  const flags = loadChecklistFlags();
  const next = { ...manual };
  for (const step of CHECKLIST_STEPS) {
    if (!step.auto) continue;
    if (flags[step.auto]) next[step.id] = true;
  }
  return next;
}

export function ChecklistPage() {
  const { t } = useI18n();
  const [progress, setProgress] = useState<ChecklistProgress>(() =>
    computeAutoProgress(loadChecklistProgress()),
  );

  useEffect(() => {
    const sync = () => setProgress(computeAutoProgress(loadChecklistProgress()));
    sync();
    const id = window.setInterval(sync, 800);
    return () => window.clearInterval(id);
  }, []);

  const toggle = (id: string) => {
    const done = !progress[id];
    const next = markChecklistStep(id, done);
    setProgress(computeAutoProgress(next));
  };

  const doneCount = CHECKLIST_STEPS.filter((s) => progress[s.id]).length;

  return (
    <section className="ref-wiki-section checklist-page" aria-labelledby="ref-h-getting-started">
      <h3 id="ref-h-getting-started">{t("checklistTitle")}</h3>
      <p className="ref-blurb">{t("checklistBlurb", { done: doneCount, total: CHECKLIST_STEPS.length })}</p>
      <ul className="checklist">
        {CHECKLIST_STEPS.map((step) => (
          <li key={step.id}>
            <label className="checklist-item">
              <input
                type="checkbox"
                checked={!!progress[step.id]}
                onChange={() => toggle(step.id)}
              />
              <span>
                <strong>{t(STEP_TITLE[step.id])}</strong>
                <span className="checklist-hint">{t(STEP_HINT[step.id])}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="btn btn-ghost"
        onClick={() => {
          clearChecklistFlags();
          saveChecklistProgress({});
          setProgress({});
        }}
      >
        {t("checklistReset")}
      </button>
    </section>
  );
}
