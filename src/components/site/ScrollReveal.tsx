"use client";

import { useEffect } from "react";

export default function ScrollReveal() {
  useEffect(() => {
    const shown = new WeakSet<Element>();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            shown.add(entry.target);
            entry.target.classList.add("show");
            entry.target.classList.remove("hide");
          } else if (shown.has(entry.target)) {
            entry.target.classList.add("hide");
            entry.target.classList.remove("show");
          }
          // first observation while not in view → leave as bare .reveal, no hide
        });
      },
      { threshold: 0.18, rootMargin: "0px 0px -8% 0px" }
    );

    const observe = (el: Element) => observer.observe(el);
    document.querySelectorAll(".reveal").forEach(observe);

    const mutation = new MutationObserver((records) => {
      for (const record of records) {
        record.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return;
          if (node.classList.contains("reveal")) observe(node);
          node.querySelectorAll(".reveal").forEach(observe);
        });
      }
    });

    mutation.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutation.disconnect();
    };
  }, []);

  return null;
}
