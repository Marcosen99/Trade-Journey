"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Markets" },
  { href: "/trades", label: "Trade log" },
];

export function Rail() {
  const path = usePathname();

  return (
    <nav
      className="flex shrink-0 items-center gap-1 border-b border-line px-4 md:h-dvh md:w-52 md:flex-col md:items-stretch md:gap-0 md:border-r md:border-b-0 md:px-0 md:py-5"
      aria-label="Main"
    >
      <Link
        href="/"
        className="flex items-center gap-2 py-4 md:px-5 md:pb-8"
      >
        <span
          className="block h-5 w-5 rounded-sm bg-violet"
          style={{ clipPath: "polygon(0 100%, 40% 35%, 68% 62%, 100% 0, 100% 100%)" }}
        />
        <span className="text-[15px] font-semibold tracking-tight">Ledger</span>
      </Link>

      <div className="flex gap-1 md:flex-col md:gap-0.5 md:px-3">
        {NAV.map(({ href, label }) => {
          const active = path === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`rounded-md px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-raised text-ink"
                  : "text-muted hover:bg-surface hover:text-ink"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>

      <div className="ml-auto md:mt-auto md:ml-0 md:px-5">
        <Link
          href="/login"
          className="inline-block rounded-md bg-violet px-3 py-2 text-sm font-medium text-on-violet hover:bg-grape md:w-full md:text-center"
        >
          Sign in
        </Link>
      </div>
    </nav>
  );
}
