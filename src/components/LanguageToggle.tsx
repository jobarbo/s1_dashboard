import { LOCALES } from "../lib/i18n";
import { useI18n } from "../lib/use-i18n";

export function LanguageToggle() {
  const { locale, setLocale, t } = useI18n();

  return (
    <div className="lang-toggle" role="group" aria-label={t("language")}>
      {LOCALES.map((code) => (
        <button
          key={code}
          type="button"
          className={locale === code ? "is-active" : undefined}
          aria-pressed={locale === code}
          onClick={() => setLocale(code)}
        >
          {code === "en" ? t("langEn") : t("langFr")}
        </button>
      ))}
    </div>
  );
}
