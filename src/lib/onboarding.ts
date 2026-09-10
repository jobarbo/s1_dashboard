export type ChecklistAutoKey =
  | "connected"
  | "sendAllSynced"
  | "cutoffMoved"
  | "testNote"
  | "referenceOpened"
  | "snapshotSaved";

export interface ChecklistStep {
  id: string;
  auto?: ChecklistAutoKey;
}

export const CHECKLIST_STEPS: ChecklistStep[] = [
  { id: "connect", auto: "connected" },
  { id: "sendAll", auto: "sendAllSynced" },
  { id: "cutoff", auto: "cutoffMoved" },
  { id: "testNote", auto: "testNote" },
  { id: "reference", auto: "referenceOpened" },
  { id: "snapshot", auto: "snapshotSaved" },
];

const PROGRESS_KEY = "s1-checklist";

export type ChecklistProgress = Record<string, boolean>;

export function loadChecklistProgress(): ChecklistProgress {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as ChecklistProgress;
  } catch {
    return {};
  }
}

export function saveChecklistProgress(progress: ChecklistProgress): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    /* ignore */
  }
}

export function markChecklistStep(id: string, done = true): ChecklistProgress {
  const progress = loadChecklistProgress();
  progress[id] = done;
  saveChecklistProgress(progress);
  return progress;
}

/** Fire-and-forget milestone flags used by auto-check. */
const FLAGS_KEY = "s1-checklist-flags";

export type ChecklistFlags = Partial<Record<ChecklistAutoKey, boolean>>;

export function loadChecklistFlags(): ChecklistFlags {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(FLAGS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as ChecklistFlags;
  } catch {
    return {};
  }
}

export function setChecklistFlag(flag: ChecklistAutoKey, value = true): void {
  const flags = loadChecklistFlags();
  flags[flag] = value;
  try {
    localStorage.setItem(FLAGS_KEY, JSON.stringify(flags));
  } catch {
    /* ignore */
  }
}

export function clearChecklistFlags(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(FLAGS_KEY);
  } catch {
    /* ignore */
  }
}
