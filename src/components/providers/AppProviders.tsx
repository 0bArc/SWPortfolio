"use client";

import { Suspense } from "react";
import { AccountSessionProvider, type SessionAccount } from "@/providers/AccountSessionProvider";
import { I18nProvider } from "@/providers/I18nProvider";
import CookieConsentBanner from "@/components/site/cookies/CookieConsentBanner";

export default function AppProviders({
  children,
  initialAccount = null,
}: {
  children: React.ReactNode;
  initialAccount?: SessionAccount | null;
}) {
  return (
    <AccountSessionProvider initialAccount={initialAccount}>
      <I18nProvider>
        {children}
        <Suspense fallback={null}>
          <CookieConsentBanner />
        </Suspense>
      </I18nProvider>
    </AccountSessionProvider>
  );
}
