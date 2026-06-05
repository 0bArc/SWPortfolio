"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { translations, get, type Lang } from "@/lib/i18n";

const STORAGE_KEY = "preferred-lang";

interface I18nCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (path: string) => string;
  ready: boolean;
}

const I18nContext = createContext<I18nCtx>({
  lang: "no",
  setLang: () => {},
  t: (p) => p,
  ready: false,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("no");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Lang | null;
    if (saved === "en" || saved === "no") {
      setLangState(saved);
      document.cookie = `lang=${saved}; path=/; max-age=31536000; SameSite=Lax`;
    }
    setReady(true);
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem(STORAGE_KEY, l);
    document.cookie = `lang=${l}; path=/; max-age=31536000; SameSite=Lax`;
  }, []);

  const t = useCallback(
    (path: string) => get(translations[lang], path),
    [lang]
  );

  return (
    <I18nContext.Provider value={{ lang, setLang, t, ready }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}

export function useLangSetup() {
  const [hasChosen, setHasChosen] = useState<boolean | null>(null);
  useEffect(() => {
    setHasChosen(!!localStorage.getItem(STORAGE_KEY));
  }, []);
  return hasChosen;
}
