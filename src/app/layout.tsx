import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/providers/I18nProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_SITE_OWNER ?? "Portfolio",
  description: "Utvikler & Redaktør",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="no" className={`${inter.variable} antialiased`}>
      <body className="min-h-screen selection:bg-white selection:text-black">
          <I18nProvider>{children}</I18nProvider>
        </body>
    </html>
  );
}
