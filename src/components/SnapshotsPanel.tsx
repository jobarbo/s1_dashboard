import { useRef, useState } from "react";
import {
  createSnapshot,
  deleteSnapshot,
  exportSnapshotToFile,
  getSnapshot,
  importSnapshotFromFile,
  listSnapshots,
  renameSnapshot,
  type Snapshot,
} from "../lib/snapshots";
import { setChecklistFlag } from "../lib/onboarding";
import type { PatchStore } from "../lib/patch-store";
import { useI18n } from "../lib/use-i18n";

interface SnapshotsPanelProps {
  store: PatchStore;
  open: boolean;
  onClose: () => void;
}

export function SnapshotsPanel({ store, open, onClose }: SnapshotsPanelProps) {
  const { t } = useI18n();
  const [items, setItems] = useState<Snapshot[]>(() => listSnapshots());
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const refresh = () => setItems(listSnapshots());

  const handleSave = () => {
    setError(null);
    createSnapshot(name || t("snapshotUntitled"), store.getValuesRecord(), store.getChannel());
    setName("");
    refresh();
    setChecklistFlag("snapshotSaved");
  };

  const handleLoad = async (id: string) => {
    setError(null);
    const snap = getSnapshot(id);
    if (!snap) return;
    setBusy(true);
    try {
      await store.loadSnapshotValues(snap.values);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("snapshotLoadFailed"));
    } finally {
      setBusy(false);
    }
  };

  const handleRename = (id: string) => {
    const snap = getSnapshot(id);
    if (!snap) return;
    const next = window.prompt(t("snapshotRenamePrompt"), snap.name);
    if (next == null) return;
    renameSnapshot(id, next);
    refresh();
  };

  const handleDelete = (id: string) => {
    if (!window.confirm(t("snapshotDeleteConfirm"))) return;
    deleteSnapshot(id);
    refresh();
  };

  const handleExport = (id: string) => {
    const snap = getSnapshot(id);
    if (snap) exportSnapshotToFile(snap);
  };

  const handleImport = async (file: File | null) => {
    if (!file) return;
    setError(null);
    try {
      await importSnapshotFromFile(file);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("snapshotImportFailed"));
    }
  };

  return (
    <div className="snapshots-backdrop" role="presentation" onClick={onClose}>
      <div
        className="snapshots-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="snapshots-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="snapshots-header">
          <h2 id="snapshots-title">{t("snapshotsTitle")}</h2>
          <button type="button" className="btn btn-ghost btn-icon" onClick={onClose} aria-label={t("close")}>
            ✕
          </button>
        </header>

        <div className="snapshots-body">
          <div className="snapshots-save-row">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("snapshotNamePlaceholder")}
              aria-label={t("snapshotNamePlaceholder")}
            />
            <button type="button" className="btn btn-primary" onClick={handleSave} disabled={busy}>
              {t("snapshotSave")}
            </button>
            <button type="button" className="btn" onClick={() => fileRef.current?.click()} disabled={busy}>
              {t("snapshotImport")}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={(e) => {
                void handleImport(e.target.files?.[0] ?? null);
                e.target.value = "";
              }}
            />
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          {items.length === 0 ? (
            <p className="snapshots-empty">{t("snapshotEmpty")}</p>
          ) : (
            <ul className="snapshots-list">
              {items.map((snap) => (
                <li key={snap.id}>
                  <div className="snapshots-item-meta">
                    <strong>{snap.name}</strong>
                    <span>{new Date(snap.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="snapshots-item-actions">
                    <button type="button" className="btn" disabled={busy} onClick={() => void handleLoad(snap.id)}>
                      {t("snapshotLoad")}
                    </button>
                    <button type="button" className="btn btn-ghost" onClick={() => handleExport(snap.id)}>
                      {t("snapshotExport")}
                    </button>
                    <button type="button" className="btn btn-ghost" onClick={() => handleRename(snap.id)}>
                      {t("snapshotRename")}
                    </button>
                    <button type="button" className="btn btn-ghost" onClick={() => handleDelete(snap.id)}>
                      {t("snapshotDelete")}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
