"use client";

import { useEffect, useRef } from "react";

function initCarousels(root: HTMLElement | null) {
  if (!root) return;

  root.querySelectorAll<HTMLElement>("[data-carousel]").forEach((carousel) => {
    if (carousel.dataset.ready) return;
    carousel.dataset.ready = "1";

    const track = carousel.querySelector<HTMLElement>(".blog-carousel-track");
    const slides = carousel.querySelectorAll(".blog-carousel-slide");
    const dots = carousel.querySelector<HTMLElement>(".blog-carousel-dots");
    const prev = carousel.querySelector<HTMLButtonElement>(".blog-carousel-prev");
    const next = carousel.querySelector<HTMLButtonElement>(".blog-carousel-next");
    if (!track || !dots || !prev || !next || slides.length === 0) return;

    let idx = 0;

    const go = (i: number) => {
      idx = Math.max(0, Math.min(slides.length - 1, i));
      track.style.transform = `translateX(-${idx * 100}%)`;
      dots.querySelectorAll(".blog-carousel-dot").forEach((d, j) => {
        d.classList.toggle("active", j === idx);
      });
    };

    slides.forEach((_, i) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = `blog-carousel-dot${i === 0 ? " active" : ""}`;
      dot.setAttribute("aria-label", `Slide ${i + 1}`);
      dot.addEventListener("click", () => go(i));
      dots.appendChild(dot);
    });

    prev.addEventListener("click", () => go(idx - 1));
    next.addEventListener("click", () => go(idx + 1));

    if (slides.length <= 1) {
      prev.hidden = true;
      next.hidden = true;
      dots.hidden = true;
    }
  });
}

interface Props {
  html: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function BlogProse({ html, className = "prose-blog", style }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initCarousels(ref.current);
  }, [html]);

  return (
    <div
      ref={ref}
      className={className}
      style={style}
      dangerouslySetInnerHTML={{
        __html: html || '<p style="color:#374151;font-size:13px;font-style:italic">Nothing to preview yet.</p>',
      }}
    />
  );
}
