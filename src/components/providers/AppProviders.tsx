"use client";

import { Suspense } from "react";
import { AccountSessionProvider, type SessionAccount } from "@/providers/AccountSessionProvider";
import { I18nProvider } from "@/providers/I18nProvider";
import CookieConsentBanner from "@/features/cookies/components/CookieConsentBanner";
import EmailVerificationBanner from "@/features/accounts/components/EmailVerificationBanner";
import NetworkSyncProvider from "@/components/providers/NetworkSyncProvider";
import BanGuard from "@/components/providers/BanGuard";

export default function AppProviders({
  children,
  initialAccount = null,
}: {
  children: React.ReactNode;
  initialAccount?: SessionAccount | null;
}) {
  return (
    <AccountSessionProvider initialAccount={initialAccount}>
      <NetworkSyncProvider>
      <Suspense fallback={null}>
      <BanGuard>
      <I18nProvider>
        <div className="fixed top-16 inset-x-0 z-40 px-4 pointer-events-none">
          <div className="max-w-3xl mx-auto pointer-events-auto">
            <EmailVerificationBanner />
          </div>
        </div>
        {children}
        <Suspense fallback={null}>
          <CookieConsentBanner />
        </Suspense>
      </I18nProvider>
      </BanGuard>
      </Suspense>
      </NetworkSyncProvider>
    </AccountSessionProvider>
  );
}
