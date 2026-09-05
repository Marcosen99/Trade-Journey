"use client";

import { useEffect, useState } from "react";

const SECTIONS = [
  { id: "trades", label: "Trades" },
  { id: "equity", label: "Equity trend" },
  { id: "calendar", label: "Daily P&L" },
  { id: "symbols", label: "By symbol" },
];

export function SectionNav() {
  const [active, setActive] = useState("trades");

  useEffect(() => {
    const nodes = SECTIONS.map((s) => document.getElementById(s.id)).filter(
      (n): n is HTMLElement => n !== null
    );
    if (!nodes.length) return;

    /* The top band of the viewport decides which section is "current".
       Without the negative bottom margin, a tall section further down
       would win simply by being bigger. */
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-56px 0px -70% 0px" }
    );

    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, []);

  function jump(id: string) {
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <nav
      aria-label="Sections"
      className="sticky top-0 z-10 flex gap-1 overflow-x-auto border-b border-line bg-void px-5"
    >
      {SECTIONS.map((s) => {
        const on = active === s.id;
        return (
          <button
            key={s.id}
            onClick={() => jump(s.id)}
            aria-current={on ? "true" : undefined}
            className={`-mb-px shrink-0 border-b-2 px-3 py-3 text-sm transition-colors ${
              on
                ? "border-violet text-ink"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {s.label}
          </button>
        );
      })}
    </nav>
  );
}
