"use client";

import { useEffect, useState, useRef } from "react";

const BIN = ["0", "1"];
const glitch = (c: string) => (c === " " ? c : BIN[Math.floor(Math.random() * 2)]);

export default function AuthorBadge({ label = "Author" }: { label?: string }) {
  const [display, setDisplay] = useState(label);
  const loop = useRef<ReturnType<typeof setInterval> | null>(null);
  const wait = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tick = useRef(0);

  useEffect(() => {
    const FRAMES = 36;
    const MS = 90;

    const run = () => {
      tick.current = 0;
      loop.current = setInterval(() => {
        const p = ++tick.current / FRAMES;
        if (p < 0.45) {
          const intensity = (p / 0.45) * 0.35;
          setDisplay(label.split("").map((c) => (Math.random() < intensity ? glitch(c) : c)).join(""));
        } else if (p <= 1) {
          const resolve = (p - 0.45) / 0.55;
          setDisplay(label.split("").map((c) => (Math.random() < resolve ? c : Math.random() < 0.25 ? glitch(c) : c)).join(""));
        } else {
          setDisplay(label);
          clearInterval(loop.current!);
          wait.current = setTimeout(run, 9000);
        }
      }, MS);
    };

    wait.current = setTimeout(run, 2500);
    return () => {
      if (loop.current) clearInterval(loop.current);
      if (wait.current) clearTimeout(wait.current);
    };
  }, [label]);

  return (
    <span className="badge-hacker inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase tracking-wider select-none">
      {display}
    </span>
  );
}
