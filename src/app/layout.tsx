import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/providers/I18nProvider";
import Banner from "@/components/site/Banner";
import { SiteLinks } from "@/components/site-links";
import type { CSSProperties } from "react";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_SITE_OWNER ?? "Portfolio",
  description: "Utvikler & Redaktør",
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
      lang="no"
      className={`${inter.variable} antialiased`}
      style={showBanner ? ({ "--banner-h": BANNER_H } as CSSProperties) : undefined}
    >
      <body className="min-h-screen selection:bg-white selection:text-black">
        {showBanner && <Banner message={process.env.NEXT_PUBLIC_BANNER!} height={BANNER_H} />}
        <SiteLinks />
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
