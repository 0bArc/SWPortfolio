"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { TagStyleConfig } from "@/lib/tags/types";

const BIN = ["0", "1"];
const glitch = (c: string) => (c === " " || c === "#" ? c : BIN[Math.floor(Math.random() * 2)]);

interface Props {
  tag: string;
  config: TagStyleConfig;
  href?: string;
}

function buildBgKeyframes(id: string, config: TagStyleConfig): string {
  const frames = config.keyframes
    .map(
      (k) =>
        `${k.at}% { background-position: ${k.bgX}% ${k.bgY}%; box-shadow: 0 0 ${6 + k.glow * 18}px ${config.glowColor}88, inset 0 0 ${k.glow * 8}px ${config.glowColor}33; }`
    )
    .join(" ");
  return `@keyframes ${id}-bg { ${frames} }`;
}

function buildTextKeyframes(id: string, effect: TagStyleConfig["textEffect"]): string | null {
  if (effect === "flicker") {
    return `@keyframes ${id}-text { 0%, 100% { opacity: 1; } 45% { opacity: 0.55; } 50% { opacity: 1; } 52% { opacity: 0.4; } }`;
  }
  if (effect === "pulse") {
    return `@keyframes ${id}-text { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.85; transform: scale(1.04); } }`;
  }
  return null;
}

export default function StyledTagBadge({ tag, config, href }: Props) {
  const label = `#${tag.toUpperCase()}`;
  const animId = `tag-${tag.replace(/[^a-z0-9]/gi, "")}`;
  const [display, setDisplay] = useState(label);
  const loop = useRef<ReturnType<typeof setInterval> | null>(null);
  const wait = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tick = useRef(0);

  const keyframeCss = useMemo(() => {
    const bg = buildBgKeyframes(animId, config);
    const text = buildTextKeyframes(animId, config.textEffect);
    return text ? `${bg} ${text}` : bg;
  }, [animId, config]);

  useEffect(() => {
    if (config.textEffect !== "cryptic") {
      setDisplay(label);
      return;
    }

    const FRAMES = 32;
    const MS = 85;

    const run = () => {
      tick.current = 0;
      loop.current = setInterval(() => {
        const p = ++tick.current / FRAMES;
        if (p < 0.4) {
          const intensity = (p / 0.4) * 0.4;
          setDisplay(label.split("").map((c) => (Math.random() < intensity ? glitch(c) : c)).join(""));
        } else if (p <= 1) {
          const resolve = (p - 0.4) / 0.6;
          setDisplay(
            label.split("").map((c) => (Math.random() < resolve ? c : Math.random() < 0.3 ? glitch(c) : c)).join("")
          );
        } else {
          setDisplay(label);
          clearInterval(loop.current!);
          wait.current = setTimeout(run, 6000 + Math.random() * 4000);
        }
      }, MS);
    };

    wait.current = setTimeout(run, 1500);
    return () => {
      if (loop.current) clearInterval(loop.current);
      if (wait.current) clearTimeout(wait.current);
    };
  }, [label, config.textEffect]);

  const cls =
    "inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider font-mono select-none transition-transform hover:scale-[1.03]";

  const textAnim =
    config.textEffect === "flicker" || config.textEffect === "pulse"
      ? `${animId}-text ${config.duration * 0.8}s ${config.easing} infinite`
      : undefined;

  const style = {
    color: config.textColor,
    backgroundImage: `linear-gradient(${config.angle}deg, ${config.gradientFrom}, ${config.gradientTo})`,
    backgroundSize: `${config.bgSize}% ${config.bgSize}%`,
    backgroundRepeat: "no-repeat",
    animation: `${animId}-bg ${config.duration}s ${config.easing} infinite`,
    textShadow: `0 0 8px ${config.glowColor}66`,
  } as const;

  const inner = (
    <>
      <style>{keyframeCss}</style>
      <span className={cls} style={style}>
        <span style={textAnim ? { animation: textAnim, display: "inline-block" } : undefined}>
          {config.textEffect === "cryptic" ? display : label}
        </span>
      </span>
    </>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex">
        {inner}
      </Link>
    );
  }
  return inner;
}
