import { PARAM_BY_ID } from "./parameters";

export const SNAPSHOT_VERSION = 1;
export const SNAPSHOTS_STORAGE_KEY = "s1-snapshots";

export interface Snapshot {
  id: string;
  version: typeof SNAPSHOT_VERSION;
  name: string;
  createdAt: string;
  channel?: number;
  values: Record<string, number>;
}

function uid(): string {
  return `snap_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function loadLibrary(): Snapshot[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(SNAPSHOTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Snapshot[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((s) => s && s.version === SNAPSHOT_VERSION && s.values);
  } catch {
    return [];
  }
}

function saveLibrary(list: Snapshot[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(SNAPSHOTS_STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* quota */
  }
}

export function listSnapshots(): Snapshot[] {
  return loadLibrary().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function createSnapshot(
  name: string,
  values: Record<string, number>,
  channel?: number,
): Snapshot {
  const snap: Snapshot = {
    id: uid(),
    version: SNAPSHOT_VERSION,
    name: name.trim() || "Untitled",
    createdAt: new Date().toISOString(),
    channel,
    values: sanitizeValues(values),
  };
  const list = loadLibrary();
  list.push(snap);
  saveLibrary(list);
  return snap;
}

export function renameSnapshot(id: string, name: string): Snapshot | null {
  const list = loadLibrary();
  const snap = list.find((s) => s.id === id);
  if (!snap) return null;
  snap.name = name.trim() || snap.name;
  saveLibrary(list);
  return snap;
}

export function deleteSnapshot(id: string): void {
  saveLibrary(loadLibrary().filter((s) => s.id !== id));
}

export function getSnapshot(id: string): Snapshot | null {
  return loadLibrary().find((s) => s.id === id) ?? null;
}

export function sanitizeValues(values: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [id, value] of Object.entries(values)) {
    if (!PARAM_BY_ID.has(id)) continue;
    const n = Math.max(0, Math.min(127, Math.round(Number(value))));
    if (Number.isFinite(n)) out[id] = n;
  }
  return out;
}

export function parseSnapshotJson(raw: string): Snapshot {
  const data = JSON.parse(raw) as Partial<Snapshot>;
  if (!data || typeof data !== "object") throw new Error("Invalid snapshot file");
  if (data.version !== SNAPSHOT_VERSION) throw new Error("Unsupported snapshot version");
  if (!data.values || typeof data.values !== "object") throw new Error("Snapshot missing values");
  return {
    id: typeof data.id === "string" ? data.id : uid(),
    version: SNAPSHOT_VERSION,
    name: typeof data.name === "string" ? data.name : "Imported",
    createdAt: typeof data.createdAt === "string" ? data.createdAt : new Date().toISOString(),
    channel: typeof data.channel === "number" ? data.channel : undefined,
    values: sanitizeValues(data.values as Record<string, number>),
  };
}

export function exportSnapshotToFile(snap: Snapshot): void {
  const blob = new Blob([JSON.stringify(snap, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const safe = snap.name.replace(/[^\w.-]+/g, "_").slice(0, 40) || "snapshot";
  a.href = url;
  a.download = `${safe}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importSnapshotFromFile(file: File): Promise<Snapshot> {
  const text = await file.text();
  const snap = parseSnapshotJson(text);
  const list = loadLibrary();
  const stored: Snapshot = { ...snap, id: uid(), createdAt: new Date().toISOString() };
  list.push(stored);
  saveLibrary(list);
  return stored;
}
