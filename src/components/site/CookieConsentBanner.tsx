"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/providers/I18nProvider";
import { useCookieConsent } from "@/providers/CookieConsentProvider";

export default function CookieConsentBanner() {
  const pathname = usePathname();
  const { t } = useI18n();
  const { ready, decided, saveConsent } = useCookieConsent();
  const [modifyOpen, setModifyOpen] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!ready || decided || pathname.startsWith("/admin")) return null;

  async function submit(action: "accept" | "deny" | "modify") {
    setSaving(true);
    try {
      if (action === "modify") {
        await saveConsent("modify", { analytics });
      } else {
        await saveConsent(action);
      }
      setModifyOpen(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-label={t("cookies.title")}
      className="fixed bottom-4 left-4 z-[60] w-[min(calc(100vw-2rem),22rem)] glass rounded-xl shadow-[0_12px_40px_rgba(0,0,0,0.55)] border border-white/[0.1] overflow-hidden"
    >
      <div className="p-4 space-y-4">
        <div>
          <p className="text-sm font-semibold text-white mb-1.5">{t("cookies.title")}</p>
          <p className="text-xs leading-relaxed text-gray-400">
            {t("cookies.body")}{" "}
            <Link href="/privacy" className="text-gray-200 underline underline-offset-2 hover:text-white">
              {t("cookies.learnMore")}
            </Link>
          </p>
        </div>

        {modifyOpen && (
          <div className="space-y-2.5 pt-1 border-t border-white/10">
            <label className="flex items-center justify-between gap-3 text-xs text-gray-300">
              <span>{t("cookies.catEssential")}</span>
              <span className="text-gray-500">{t("cookies.alwaysOn")}</span>
            </label>
            <label className="flex items-center justify-between gap-3 text-xs text-gray-300 cursor-pointer">
              <span>{t("cookies.catAnalytics")}</span>
              <input
                type="checkbox"
                checked={analytics}
                onChange={(e) => setAnalytics(e.target.checked)}
                className="accent-white"
              />
            </label>
            <button
              type="button"
              disabled={saving}
              onClick={() => submit("modify")}
              className="admin-btn admin-btn--primary admin-btn--sm w-full mt-1"
            >
              {t("cookies.saveChoices")}
            </button>
          </div>
        )}

        {!modifyOpen && (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => submit("accept")}
              className="admin-btn admin-btn--primary admin-btn--sm"
            >
              {t("cookies.accept")}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => submit("deny")}
              className="admin-btn admin-btn--outline admin-btn--sm"
            >
              {t("cookies.deny")}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => setModifyOpen(true)}
              className="admin-btn admin-btn--outline admin-btn--sm"
            >
              {t("cookies.modify")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
