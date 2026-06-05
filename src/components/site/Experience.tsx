"use client";

import { Info, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useI18n } from "@/providers/I18nProvider";
import { FEATURED_WORK } from "@/lib/env";
import type { OGData } from "@/lib/og";

const skills = ["C++", "Security", "Writing"];

function featuredLabel(og?: OGData | null): string {
  if (og?.title) return og.title;
  if (!FEATURED_WORK) return "Featured Work";
  try {
    const host = new URL(FEATURED_WORK).hostname.replace(/^www\./, "");
    const name = host.split(".")[0];
    return name.charAt(0).toUpperCase() + name.slice(1);
  } catch {
    return "Featured Work";
  }
}

export default function Experience({ og }: { og?: OGData | null }) {
  const [open, setOpen] = useState(false);
  const { t } = useI18n();
  const title = featuredLabel(og);

  return (
    <section id="arbeid" className="mb-20 reveal reveal-delay-1">
      <div className="flex items-center gap-4 mb-8">
        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500">{t("experience.heading")}</h2>
        <div className="h-px flex-1 bg-white/5" />
      </div>

      <div className="cursor-pointer" onClick={() => setOpen(true)}>
        <div className="glass p-6 rounded-2xl card-hover relative group">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-xl font-bold text-white">{title}</h3>
              <p className="text-sm text-blue-400">{t("experience.role")}</p>
            </div>
            <Info className="w-4 h-4 text-gray-600 group-hover:text-white transition-colors" />
          </div>
          <p className="text-gray-400 text-sm leading-relaxed mb-6">{t("experience.summary")}</p>
          <div className="flex gap-2">
            {skills.map((s) => (
              <Badge
                key={s}
                variant="outline"
                className="text-[10px] bg-white/5 border-white/10 uppercase font-bold text-gray-400"
              >
                {s}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="glass max-w-lg border-white/10 bg-[#050505] text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">{title}</DialogTitle>
          </DialogHeader>

          {og && (
            <div className="glass rounded-xl overflow-hidden mb-4 border border-white/5">
              {og.image && (
                <div className="relative w-full h-36">
                  <Image src={og.image} alt={og.title} fill className="object-cover" unoptimized />
                </div>
              )}
              <div className="p-4">
                {og.description && (
                  <p className="text-gray-400 text-xs leading-relaxed mb-2">{og.description}</p>
                )}
                <p className="text-gray-600 text-[10px] uppercase tracking-wider">{og.domain}</p>
              </div>
            </div>
          )}

          <p className="text-gray-400 text-sm mb-6 leading-relaxed">{t("experience.dialogBody")}</p>

          {FEATURED_WORK && (
            <Link
              href={FEATURED_WORK}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-white text-black py-2.5 rounded-lg text-sm font-bold hover:bg-gray-200 transition-colors"
            >
              {t("experience.visit")} <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
