import { useEffect } from "react";
import { S1_REFERENCE } from "../lib/s1-reference";

interface ReferenceModalProps {
  open: boolean;
  onClose: () => void;
}

export function ReferenceModal({ open, onClose }: ReferenceModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="ref-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="ref-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ref-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="ref-modal-header">
          <div>
            <h2 id="ref-modal-title">S-1 reference</h2>
            <p>Menu / system options with no MIDI CC — set these on the hardware.</p>
          </div>
          <button type="button" className="btn btn-ghost ref-modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>

        <div className="ref-modal-body">
          {S1_REFERENCE.map((section) => (
            <section key={section.id} className="ref-section">
              <h3>{section.title}</h3>
              <p className="ref-blurb">{section.blurb}</p>
              <ul className="ref-list">
                {section.items.map((item) => (
                  <li key={item.name}>
                    <div className="ref-item-name">{item.name}</div>
                    <div className="ref-item-how">{item.how}</div>
                    <div className="ref-item-values">{item.values}</div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
