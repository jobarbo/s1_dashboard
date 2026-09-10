import { useEffect, useState } from "react";
import { applyTheme, getPreferredTheme, setTheme, type ThemeMode } from "../lib/theme";
import { useI18n } from "../lib/use-i18n";

export function ThemeToggle() {
  const { t } = useI18n();
  const [theme, setThemeState] = useState<ThemeMode>("dark");

  useEffect(() => {
    const initial = getPreferredTheme();
    applyTheme(initial);
    setThemeState(initial);
  }, []);

  const next = theme === "dark" ? "light" : "dark";
  const label = next === "light" ? t("themeToLight") : t("themeToDark");

  return (
    <button
      type="button"
      className="btn btn-ghost btn-icon"
      title={label}
      aria-label={label}
      aria-pressed={theme === "light"}
      onClick={() => {
        setTheme(next);
        setThemeState(next);
      }}
    >
      {theme === "dark" ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.75" />
          <path
            d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M21 14.5A8.5 8.5 0 1 1 9.5 3 7 7 0 0 0 21 14.5z"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}
