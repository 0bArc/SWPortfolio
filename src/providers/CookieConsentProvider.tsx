"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { COOKIE_PREF_DEFAULTS, type CookiePreferences } from "@/database/schema";
import {
  consentDecidedNow,
  isConsentExpired,
} from "@/database/utils/consent-retention";

const STORAGE_KEY = "cookie-consent";

export type ConsentCtx = {
  ready: boolean;
  prefs: CookiePreferences;
  decided: boolean;
  saveConsent: (action: "accept" | "deny" | "modify", patch?: Partial<CookiePreferences>) => Promise<void>;
};

const ConsentContext = createContext<ConsentCtx>({
  ready: false,
  prefs: { ...COOKIE_PREF_DEFAULTS },
  decided: false,
  saveConsent: async () => {},
});

function readLocal(): CookiePreferences | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CookiePreferences;
    if (!parsed?.decided) return null;
    if (isConsentExpired(parsed)) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeLocal(prefs: CookiePreferences) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Storage blocked — server cookie remains source of truth
  }
}

export function CookieConsentProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [prefs, setPrefs] = useState<CookiePreferences>({ ...COOKIE_PREF_DEFAULTS });
  useEffect(() => {
    const local = readLocal();
    if (local) {
      setPrefs(local);
      setReady(true);
      return;
    }

    fetch("/api/cookies", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((data: { cookies?: CookiePreferences | null; decided?: boolean }) => {
        if (data.decided && data.cookies && !isConsentExpired(data.cookies)) {
          setPrefs(data.cookies);
          writeLocal(data.cookies);
        }
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const saveConsent = useCallback(
    async (action: "accept" | "deny" | "modify", patch?: Partial<CookiePreferences>) => {
      const fallback = prefsFromActionLocal(action, patch);
      setPrefs(fallback);
      writeLocal(fallback);

      try {
        const res = await fetch("/api/cookies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ action, ...patch }),
        });
        const data = (await res.json()) as { cookies?: CookiePreferences; decided?: boolean };
        if (res.ok && data.cookies?.decided) {
          setPrefs(data.cookies);
          writeLocal(data.cookies);
        }
      } catch {
        // Optimistic local save already applied
      }
    },
    []
  );

  const value = useMemo(
    () => ({
      ready,
      prefs,
      decided: !!prefs.decided,
      saveConsent,
    }),
    [ready, prefs, saveConsent]
  );

  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>;
}

function prefsFromActionLocal(
  action: "accept" | "deny" | "modify",
  patch?: Partial<CookiePreferences>
): CookiePreferences {
  const now = consentDecidedNow();
  if (action === "accept") {
    return { essential: true, analytics: true, decided: true, decidedAt: now };
  }
  if (action === "deny") {
    return { essential: true, analytics: false, decided: true, decidedAt: now };
  }
  return {
    essential: true,
    analytics: patch?.analytics ?? false,
    decided: true,
    decidedAt: now,
    ...patch,
  };
}

export function useCookieConsent() {
  return useContext(ConsentContext);
}
