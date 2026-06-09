import type { Metadata } from "next";
import { Suspense } from "react";
import { Inter } from "next/font/google";
import "./globals.css";
import { CookieConsentProvider } from "@/providers/CookieConsentProvider";
import AppProviders from "@/components/providers/AppProviders";
import AccountSessionLoader from "@/components/providers/AccountSessionLoader";
import Banner from "@/components/layout/Banner";
import { SiteLinks } from "@/features/home/site-links";
import type { CSSProperties } from "react";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_SITE_OWNER ?? "Portfolio",
  description: "Developer & Editor",
};

const BANNER_H = "0px"; // banner is fixed-bottom, no layout offset needed

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const showBanner =
    !!process.env.NEXT_PUBLIC_BANNER &&
    process.env.NEXT_PUBLIC_DEV_MODE !== "true";

  return (
    <html
      lang="en"
      className={`${inter.variable} antialiased`}
      style={showBanner ? ({ "--banner-h": BANNER_H } as CSSProperties) : undefined}
      suppressHydrationWarning
    >
      <body className="min-h-screen selection:bg-white selection:text-black" suppressHydrationWarning>
        {showBanner && <Banner message={process.env.NEXT_PUBLIC_BANNER!} height={BANNER_H} />}
        <SiteLinks />
        <CookieConsentProvider>
          <Suspense fallback={<AppProviders>{children}</AppProviders>}>
            <AccountSessionLoader>{children}</AccountSessionLoader>
          </Suspense>
        </CookieConsentProvider>
      </body>
    </html>
  );
}
