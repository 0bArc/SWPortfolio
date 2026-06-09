"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/providers/I18nProvider";
import { translations } from "@/lib/i18n";

const FADE_MS = 400;

type Phase = "pending" | "show" | "fade" | "done";

export default function LoadingScreen() {
  const { t } = useI18n();
  const [phase, setPhase] = useState<Phase>("pending");
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    if (sessionStorage.getItem("site-loaded")) {
      setPhase("done");
      return;
    }
    setPhase("show");
  }, []);

  useEffect(() => {
    if (phase !== "show") return;
    const msgs = translations.loading.messages;
    const msg = setInterval(() => setMsgIdx((i) => (i + 1) % msgs.length), 1800);
    const hide = setTimeout(() => {
      sessionStorage.setItem("site-loaded", "1");
      setPhase("fade");
      setTimeout(() => setPhase("done"), FADE_MS);
    }, 1200);
    return () => {
      clearInterval(msg);
      clearTimeout(hide);
    };
  }, [phase]);

  if (phase === "pending" || phase === "done") return null;

  const msgs = translations.loading.messages;

  return (
    <div
      className="fixed inset-0 z-[200] bg-[#050505] flex items-center justify-center"
      style={
        phase === "fade"
          ? { opacity: 0, transition: `opacity ${FADE_MS}ms ease`, pointerEvents: "none" }
          : undefined
      }
    >
      <div className="text-center w-full max-w-2xl mx-auto px-6">
        <p className="text-3xl md:text-5xl font-bold tracking-wide text-white flex items-center justify-center gap-1">
          <span>Loading</span>
          <span className="inline-flex items-center gap-1">
            <span className="loading-dot">.</span>
            <span className="loading-dot">.</span>
            <span className="loading-dot">.</span>
          </span>
        </p>
        <p
          className="text-sm text-gray-400 mt-5 uppercase tracking-[0.22em]"
          key={msgIdx}
          style={{ animation: "subtitlePulse 1.6s ease-in-out infinite" }}
        >
          {msgs[msgIdx % msgs.length]}
        </p>
        <div className="mt-10 flex items-center justify-center gap-2">
          <div className="h-px w-12 bg-white/10" />
          <p className="text-xs text-gray-600">{t("loading.tagline")}</p>
          <div className="h-px w-12 bg-white/10" />
        </div>
        <Link
          href="https://stratware.win/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-2 text-sm text-gray-500 hover:text-white transition-colors"
        >
          stratware.win
        </Link>
      </div>
    </div>
  );
}
