"use client";

import { useI18n } from "@/providers/I18nProvider";

export default function AboutMe() {
  const { t } = useI18n();
  return (
    <section id="om-meg" className="mb-20 reveal reveal-delay-1">
      <div className="flex items-center gap-4 mb-6">
        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500">{t("about.heading")}</h2>
        <div className="h-px flex-1 bg-white/5" />
      </div>
      <div className="glass p-6 rounded-2xl space-y-4 text-sm leading-relaxed text-gray-300">
        <p>{t("about.p1")}</p>
        <p>{t("about.p2")}</p>
        <p>{t("about.p3")}</p>
        <p>{t("about.p4")}</p>
      </div>
    </section>
  );
}
