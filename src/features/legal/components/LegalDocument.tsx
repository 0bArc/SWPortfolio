import Link from "next/link";
import type { GlossaryEntry, LegalDoc } from "@/features/legal/services/content";
import { t } from "@/lib/i18n";

function GlossaryTable({ entries }: { entries: GlossaryEntry[] }) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold text-white tracking-tight">Key terms</h2>
      <p className="text-gray-400">Plain-English definitions for words used in this document.</p>
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full min-w-[32rem] text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.03]">
              <th scope="col" className="px-4 py-2.5 font-semibold text-white w-[11rem] sm:w-[13rem]">
                Term
              </th>
              <th scope="col" className="px-4 py-2.5 font-semibold text-white">
                Meaning
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, i) => (
              <tr key={`${entry.term}-${i}`} className="border-b border-white/5 last:border-0 align-top">
                <th scope="row" className="px-4 py-2.5 font-medium text-gray-200 whitespace-nowrap">
                  {entry.term}
                </th>
                <td className="px-4 py-2.5 text-gray-400">{entry.definition}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function LegalSection({ heading, paragraphs, list, listGroups, after }: LegalDoc["sections"][number]) {
  const id = heading.replace(/\s+/g, "-").toLowerCase();
  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold text-white tracking-tight">{heading}</h2>
      {paragraphs.map((p, i) => (
        <p key={`${id}-p-${i}`}>{p}</p>
      ))}
      {list && (
        <ul className="list-disc pl-5 space-y-1.5 text-gray-400">
          {list.map((item, i) => (
            <li key={`${id}-li-${i}`}>{item}</li>
          ))}
        </ul>
      )}
      {listGroups?.map((group, gi) => (
        <div key={`${id}-lg-${gi}`} className="space-y-2">
          {group.intro && <p>{group.intro}</p>}
          <ul className="list-disc pl-5 space-y-1.5 text-gray-400">
            {group.items.map((item, ii) => (
              <li key={`${id}-lg-${gi}-li-${ii}`}>{item}</li>
            ))}
          </ul>
        </div>
      ))}
      {after?.map((p, i) => (
        <p key={`${id}-after-${i}`}>{p}</p>
      ))}
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
        {doc.glossary && doc.glossary.length > 0 && <GlossaryTable entries={doc.glossary} />}
        {doc.sections.map((section, i) => (
          <LegalSection key={`${section.heading}-${i}`} {...section} />
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
