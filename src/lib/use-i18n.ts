import { useEffect, useState } from "react";
import { getLocale, initLocale, setLocale, subscribeLocale, type Locale } from "./i18n";
import { t, type MessageKey } from "./messages";

export function useI18n() {
  const [, tick] = useState(0);

  useEffect(() => {
    initLocale();
    tick((n) => n + 1);
    return subscribeLocale(() => tick((n) => n + 1));
  }, []);

  return {
    locale: getLocale(),
    setLocale,
    t: (key: MessageKey, vars?: Record<string, string | number>) => t(key, vars),
  } as const;
}

export type { Locale, MessageKey };
