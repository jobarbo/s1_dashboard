import { useEffect, useId, useMemo, useRef, useState } from "react";
import { S1_REFERENCE, type ReferenceItem, type ReferenceSection } from "../lib/s1-reference";

interface ReferenceModalProps {
  open: boolean;
  onClose: () => void;
}

function itemMatches(item: ReferenceItem, q: string): boolean {
  if (!q) return true;
  const hay = [
    item.name,
    item.code,
    item.how,
    item.values,
    item.note,
    item.midi,
    item.scope,
    ...(item.options?.flatMap((o) => [o.label, o.value, o.meaning]) ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}

function ScopeBadge({ scope }: { scope?: ReferenceItem["scope"] }) {
  if (!scope) return null;
  const label = scope === "pattern" ? "Pattern" : scope === "system" ? "System" : "Action";
  return <span className={`ref-scope ref-scope--${scope}`}>{label}</span>;
}

function ReferenceEntry({ item }: { item: ReferenceItem }) {
  return (
    <article className="ref-entry">
      <header className="ref-entry-head">
        <h4 className="ref-entry-title">
          {item.code ? (
            <>
              <code className="ref-code">{item.code}</code>
              <span className="ref-entry-name">{item.name}</span>
            </>
          ) : (
            <span className="ref-entry-name">{item.name}</span>
          )}
        </h4>
        <div className="ref-entry-meta">
          <ScopeBadge scope={item.scope} />
          {item.midi ? <span className="ref-midi">{item.midi}</span> : null}
        </div>
      </header>

      <dl className="ref-dl">
        <div className="ref-dl-row">
          <dt>Access</dt>
          <dd>{item.how}</dd>
        </div>
        {item.values ? (
          <div className="ref-dl-row">
            <dt>Values</dt>
            <dd>{item.values}</dd>
          </div>
        ) : null}
      </dl>

      {item.options && item.options.length > 0 ? (
        <table className="ref-options">
          <caption className="sr-only">Options for {item.name}</caption>
          <thead>
            <tr>
              <th scope="col">Label</th>
              <th scope="col">Value</th>
              <th scope="col">Meaning</th>
            </tr>
          </thead>
          <tbody>
            {item.options.map((opt) => (
              <tr key={opt.label}>
                <th scope="row">
                  <code>{opt.label}</code>
                </th>
                <td className="ref-options-value">{opt.value}</td>
                <td>{opt.meaning}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      {item.note ? <p className="ref-note">{item.note}</p> : null}
    </article>
  );
}

function WikiPage({ section, query }: { section: ReferenceSection; query: string }) {
  const items = section.items.filter((item) => itemMatches(item, query));
  if (items.length === 0) {
    return <p className="ref-empty">No matches on this page.</p>;
  }

  return (
    <section className="ref-wiki-section" aria-labelledby={`ref-h-${section.id}`}>
      <h3 id={`ref-h-${section.id}`}>{section.title}</h3>
      <p className="ref-blurb">{section.blurb}</p>
      <div className="ref-entries">
        {items.map((item) => (
          <ReferenceEntry key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}

export function ReferenceModal({ open, onClose }: ReferenceModalProps) {
  const titleId = useId();
  const descId = useId();
  const searchId = useId();
  const searchRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [activeSection, setActiveSection] = useState(S1_REFERENCE[0]?.id ?? "menu");

  const normalizedQuery = query.trim().toLowerCase();

  const visibleSections = useMemo(
    () =>
      S1_REFERENCE.map((section) => ({
        section,
        count: section.items.filter((item) => itemMatches(item, normalizedQuery)).length,
      })).filter((s) => s.count > 0),
    [normalizedQuery],
  );

  const activePage =
    visibleSections.find((s) => s.section.id === activeSection)?.section ??
    visibleSections[0]?.section ??
    null;

  useEffect(() => {
    if (!open) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const t = window.setTimeout(() => {
      searchRef.current?.focus({ preventScroll: true });
    }, 0);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setActiveSection(S1_REFERENCE[0]?.id ?? "menu");
    }
  }, [open]);

  useEffect(() => {
    if (!open || visibleSections.length === 0) return;
    if (!visibleSections.some((s) => s.section.id === activeSection)) {
      setActiveSection(visibleSections[0].section.id);
    }
  }, [open, visibleSections, activeSection]);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  }, [activeSection, normalizedQuery]);

  if (!open) return null;

  return (
    <div className="ref-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="ref-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="ref-modal-header">
          <div>
            <h2 id={titleId}>S-1 reference</h2>
            <p id={descId}>
              Hardware menu wiki — MENU (SHIFT + pad 15), effect menus, and MIDI limits.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-ghost ref-modal-close"
            onClick={onClose}
            aria-label="Close reference"
          >
            ✕
          </button>
        </header>

        <div className="ref-modal-toolbar">
          <label className="ref-search" htmlFor={searchId}>
            <span className="sr-only">Search reference</span>
            <input
              ref={searchRef}
              id={searchId}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search menu codes, values…"
              autoComplete="off"
            />
          </label>
        </div>

        <div className="ref-modal-layout">
          <nav className="ref-toc" aria-label="Reference pages">
            <p className="ref-toc-label">Pages</p>
            <ul>
              {visibleSections.map(({ section, count }) => (
                <li key={section.id}>
                  <button
                    type="button"
                    className={activeSection === section.id ? "is-active" : undefined}
                    aria-current={activeSection === section.id ? "page" : undefined}
                    onClick={() => setActiveSection(section.id)}
                  >
                    <span>{section.title}</span>
                    <span className="ref-toc-count">{count}</span>
                  </button>
                </li>
              ))}
            </ul>
            {visibleSections.length === 0 ? (
              <p className="ref-empty">No matches for “{query.trim()}”.</p>
            ) : null}
          </nav>

          <div className="ref-modal-body" ref={bodyRef}>
            {activePage ? (
              <WikiPage key={activePage.id} section={activePage} query={normalizedQuery} />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
