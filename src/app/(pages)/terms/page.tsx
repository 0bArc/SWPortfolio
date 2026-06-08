import { Suspense } from "react";
import type { Metadata } from "next";
import Navbar from "@/components/site/NavbarWrapper";
import Footer from "@/components/site/FooterWrapper";
import LegalDocument from "@/components/site/LegalDocument";
import { LegalPageFallback } from "@/components/site/LegalPageFallback";
import { getTerms } from "@/lib/legal-content";
import { CONTACT_EMAIL, SITE_OWNER } from "@/lib/env";

export const metadata: Metadata = {
  title: `Terms – ${process.env.NEXT_PUBLIC_SITE_OWNER ?? "Portfolio"}`,
};

async function TermsContent() {
  const doc = getTerms({
    owner: SITE_OWNER,
    domain: "kristiansen.icu",
    email: CONTACT_EMAIL || "contact@kristiansen.icu",
  });

  return (
    <LegalDocument
      doc={doc}
      crossLink={{ href: "/privacy", label: "Read the privacy policy" }}
    />
  );
}

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <Suspense fallback={<LegalPageFallback />}>
        <TermsContent />
      </Suspense>
      <Footer />
    </>
  );
}
