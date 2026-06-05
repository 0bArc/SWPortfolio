"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n, useLangSetup } from "@/providers/I18nProvider";
import { SUPPORTED_LANGS, translations, type Lang } from "@/lib/i18n";

const FADE_MS = 400;

export default function LoadingScreen() {
  const { t, setLang, lang } = useI18n();
  const hasChosen = useLangSetup();

  const [phase, setPhase] = useState<"init" | "setup" | "show" | "fade" | "done">("init");
  const [msgIdx, setMsgIdx] = useState(0);
  const [selected, setSelected] = useState<Lang>("no");

  useEffect(() => {
    if (hasChosen === null) return;
    if (sessionStorage.getItem("site-loaded")) {
      setPhase("done");
      return;
    }
    if (hasChosen === false) {
      setPhase("setup");
    } else {
      setPhase("show");
    }
  }, [hasChosen]);

  useEffect(() => {
    if (phase !== "show") return;
    const msgs = translations[lang].loading.messages;
    const msg = setInterval(() => setMsgIdx((i) => (i + 1) % msgs.length), 1800);
    const hide = setTimeout(() => {
      sessionStorage.setItem("site-loaded", "1");
      setPhase("fade");
      setTimeout(() => setPhase("done"), FADE_MS);
    }, 1200);
    return () => { clearInterval(msg); clearTimeout(hide); };
  }, [phase, lang]);

  const confirmLang = () => {
    setLang(selected);
    setPhase("show");
  };

  if (phase === "done") return null;

  const msgs = translations[lang].loading.messages;

  return (
    <div
      className="fixed inset-0 z-[200] bg-[#050505] flex items-center justify-center"
      style={
        phase === "fade"
          ? { opacity: 0, transition: `opacity ${FADE_MS}ms ease`, pointerEvents: "none" }
          : undefined
      }
    >
      {phase === "setup" ? (
        <div className="text-center w-full max-w-sm mx-auto px-6">
          <p className="text-2xl md:text-3xl font-bold tracking-wide text-white mb-2">
            {t("setup.heading")}
          </p>
          <p className="text-xs text-gray-500 mb-8 uppercase tracking-widest">
            {t("setup.sub")}
          </p>
          <div className="flex flex-col gap-3 mb-8">
            {SUPPORTED_LANGS.map((l) => (
              <button
                key={l.code}
                onClick={() => setSelected(l.code)}
                className={`flex items-center gap-3 px-5 py-3 rounded-xl border transition-all text-sm font-semibold ${
                  selected === l.code
                    ? "border-white bg-white/10 text-white"
                    : "border-white/10 text-gray-400 hover:border-white/30 hover:text-white"
                }`}
              >
                <span className="text-xl">{l.flag}</span>
                {l.label}
              </button>
            ))}
          </div>
          <button
            onClick={confirmLang}
            className="w-full bg-white text-black py-2.5 rounded-xl text-sm font-bold hover:bg-gray-200 transition-colors"
          >
            {selected === "en" ? "Continue" : "Fortsett"}
          </button>
        </div>
      ) : (
        <div className="text-center w-full max-w-2xl mx-auto px-6">
          <p className="text-3xl md:text-5xl font-bold tracking-wide text-white flex items-center justify-center gap-1">
            <span>Laster</span>
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
      )}
    </div>
  );
}
