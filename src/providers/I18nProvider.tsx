"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import { translations, get } from "@/lib/i18n";

interface I18nCtx {
  t: (path: string) => string;
}

const I18nContext = createContext<I18nCtx>({
  t: (p) => get(translations, p),
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const tr = useCallback((path: string) => get(translations, path), []);

  const value = useMemo(() => ({ t: tr }), [tr]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
