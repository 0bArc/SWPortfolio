import Link from "next/link";
import type { LegalDoc } from "@/lib/legal-content";
import { t } from "@/lib/i18n";

function LegalSection({ heading, paragraphs, list }: LegalDoc["sections"][number]) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold text-white tracking-tight">{heading}</h2>
      {paragraphs.map((p) => (
        <p key={p.slice(0, 48)}>{p}</p>
      ))}
      {list && (
        <ul className="list-disc pl-5 space-y-1.5 text-gray-400">
          {list.map((item) => (
            <li key={item.slice(0, 48)}>{item}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function LegalDocument({
  doc,
  crossLink,
}: {
  doc: LegalDoc;
  crossLink?: { href: string; label: string };
}) {
  return (
    <main className="max-w-4xl mx-auto px-6 pt-24 pb-12">
      <h1 className="text-4xl font-bold tracking-tight mb-2">{doc.title}</h1>
      <p className="text-xs text-gray-500 mb-6">
        {t("legal.updated")} {doc.updated}
      </p>
      <div className="glass p-6 md:p-8 rounded-2xl text-sm leading-relaxed text-gray-300 space-y-8">
        {doc.intro && <p className="text-gray-200">{doc.intro}</p>}
        {doc.sections.map((section) => (
          <LegalSection key={section.heading} {...section} />
        ))}
        {crossLink && (
          <p className="pt-2 border-t border-white/10 text-gray-400">
            <Link href={crossLink.href} className="text-gray-200 hover:text-white transition-colors underline underline-offset-2">
              {crossLink.label}
            </Link>
          </p>
        )}
      </div>
    </main>
  );
}
