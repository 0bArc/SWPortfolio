import { Suspense } from "react";
import type { Metadata } from "next";
import Navbar from "@/components/layout/NavbarWrapper";
import Footer from "@/components/layout/FooterWrapper";
import LegalDocument from "@/features/legal/components/LegalDocument";
import { LegalPageFallback } from "@/features/legal/components/LegalPageFallback";
import { getPrivacy } from "@/features/legal/services/content";
import { CONTACT_EMAIL, SITE_OWNER } from "@/lib/env";

export const metadata: Metadata = {
  title: `Privacy – ${process.env.NEXT_PUBLIC_SITE_OWNER ?? "Portfolio"}`,
};

async function PrivacyContent() {
  const doc = getPrivacy({
    owner: SITE_OWNER,
    domain: "kristiansen.icu",
    email: CONTACT_EMAIL || "contact@kristiansen.icu",
  });

  return (
    <LegalDocument
      doc={doc}
      crossLink={{ href: "/terms", label: "Read the terms of service" }}
    />
  );
}

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <Suspense fallback={<LegalPageFallback />}>
        <PrivacyContent />
      </Suspense>
      <Footer />
    </>
  );
}
