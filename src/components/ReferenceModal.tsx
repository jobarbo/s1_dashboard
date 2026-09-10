import { useEffect, useId, useMemo, useRef, useState } from "react";
import { localizeReference } from "../lib/s1-reference-i18n";
import { type ReferenceItem, type ReferenceSection } from "../lib/s1-reference";
import { setChecklistFlag, CHECKLIST_STEPS } from "../lib/onboarding";
import { useI18n } from "../lib/use-i18n";
import { ChecklistPage } from "./ChecklistPage";

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
  const { t } = useI18n();
  if (!scope) return null;
  const label =
    scope === "pattern" ? t("scopePattern") : scope === "system" ? t("scopeSystem") : t("scopeAction");
  return <span className={`ref-scope ref-scope--${scope}`}>{label}</span>;
}

function ReferenceEntry({ item }: { item: ReferenceItem }) {
  const { t } = useI18n();
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
          <dt>{t("access")}</dt>
          <dd>{item.how}</dd>
        </div>
        {item.values ? (
          <div className="ref-dl-row">
            <dt>{t("values")}</dt>
            <dd>{item.values}</dd>
          </div>
        ) : null}
      </dl>

      {item.options && item.options.length > 0 ? (
        <table className="ref-options">
          <caption className="sr-only">{t("optionsFor", { name: item.name })}</caption>
          <thead>
            <tr>
              <th scope="col">{t("label")}</th>
              <th scope="col">{t("value")}</th>
              <th scope="col">{t("meaning")}</th>
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
  const { t } = useI18n();
  const items = section.items.filter((item) => itemMatches(item, query));
  if (items.length === 0) {
    return <p className="ref-empty">{t("noMatchesPage")}</p>;
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
  const { t, locale } = useI18n();
  const pages = useMemo(() => localizeReference(locale), [locale]);
  const titleId = useId();
  const descId = useId();
  const searchId = useId();
  const searchRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [activeSection, setActiveSection] = useState("getting-started");

  const normalizedQuery = query.trim().toLowerCase();

  const wikiSections = useMemo(
    () =>
      pages.map((section) => ({
        section,
        count: section.items.filter((item) => itemMatches(item, normalizedQuery)).length,
      })).filter((s) => s.count > 0),
    [normalizedQuery, pages],
  );

  const showGettingStarted =
    !normalizedQuery ||
    "getting started checklist premier patch".includes(normalizedQuery) ||
    t("checklistTitle").toLowerCase().includes(normalizedQuery);

  const tocEntries = useMemo(() => {
    const entries: Array<{ id: string; title: string; count: number }> = [];
    if (showGettingStarted) {
      entries.push({ id: "getting-started", title: t("checklistTitle"), count: CHECKLIST_STEPS.length });
    }
    for (const { section, count } of wikiSections) {
      entries.push({ id: section.id, title: section.title, count });
    }
    return entries;
  }, [showGettingStarted, wikiSections, t]);

  const activePage =
    wikiSections.find((s) => s.section.id === activeSection)?.section ?? null;

  useEffect(() => {
    if (!open) return;
    setChecklistFlag("referenceOpened");

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const timer = window.setTimeout(() => {
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
      window.clearTimeout(timer);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setActiveSection("getting-started");
    }
  }, [open]);

  useEffect(() => {
    if (!open || tocEntries.length === 0) return;
    if (!tocEntries.some((s) => s.id === activeSection)) {
      setActiveSection(tocEntries[0].id);
    }
  }, [open, tocEntries, activeSection]);

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
            <h2 id={titleId}>{t("refTitle")}</h2>
            <p id={descId}>{t("refSubtitle")}</p>
          </div>
          <button
            type="button"
            className="btn btn-ghost ref-modal-close"
            onClick={onClose}
            aria-label={t("closeReference")}
          >
            ✕
          </button>
        </header>

        <div className="ref-modal-toolbar">
          <label className="ref-search" htmlFor={searchId}>
            <span className="sr-only">{t("searchReference")}</span>
            <input
              ref={searchRef}
              id={searchId}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              autoComplete="off"
            />
          </label>
        </div>

        <div className="ref-modal-layout">
          <nav className="ref-toc" aria-label={t("pages")}>
            <p className="ref-toc-label">{t("pages")}</p>
            <ul>
              {tocEntries.map((entry) => (
                <li key={entry.id}>
                  <button
                    type="button"
                    className={activeSection === entry.id ? "is-active" : undefined}
                    aria-current={activeSection === entry.id ? "page" : undefined}
                    onClick={() => setActiveSection(entry.id)}
                  >
                    <span>{entry.title}</span>
                    <span className="ref-toc-count">{entry.count}</span>
                  </button>
                </li>
              ))}
            </ul>
            {tocEntries.length === 0 ? (
              <p className="ref-empty">{t("noMatchesQuery", { q: query.trim() })}</p>
            ) : null}
          </nav>

          <div className="ref-modal-body" ref={bodyRef}>
            {activeSection === "getting-started" && showGettingStarted ? (
              <ChecklistPage key="getting-started" />
            ) : activePage ? (
              <WikiPage key={activePage.id} section={activePage} query={normalizedQuery} />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
