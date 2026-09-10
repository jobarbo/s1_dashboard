export type Locale = "en" | "fr";

export const LOCALES: readonly Locale[] = ["en", "fr"];
export const LOCALE_STORAGE_KEY = "s1-locale";

const listeners = new Set<() => void>();
let locale: Locale = "en";
let initialized = false;

export function detectLocale(): Locale {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored === "en" || stored === "fr") return stored;
  } catch {
    /* ignore */
  }
  if (typeof navigator !== "undefined" && navigator.language.toLowerCase().startsWith("fr")) {
    return "fr";
  }
  return "en";
}

function applyHtmlLang(next: Locale) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = next;
}

export function initLocale(): Locale {
  if (!initialized) {
    locale = detectLocale();
    applyHtmlLang(locale);
    initialized = true;
  }
  return locale;
}

export function getLocale(): Locale {
  if (!initialized) return initLocale();
  return locale;
}

export function setLocale(next: Locale) {
  locale = next;
  initialized = true;
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, next);
  } catch {
    /* ignore */
  }
  applyHtmlLang(next);
  listeners.forEach((fn) => fn());
}

export function subscribeLocale(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    vars[key] == null ? `{${key}}` : String(vars[key]),
  );
}
