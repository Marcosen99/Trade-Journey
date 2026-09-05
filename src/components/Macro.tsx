"use client";

import { Delta } from "@/components/Delta";
import { useFeed } from "@/lib/useFeed";
import { num } from "@/lib/format";
import type { MacroPayload } from "@/app/api/markets/macro/route";

export function Macro() {
  const { data, loading } = useFeed<MacroPayload>("/api/markets/macro", 300_000);

  return (
    <section>
      <header className="flex items-baseline justify-between border-b border-line px-5 py-4">
        <h2 className="text-base font-semibold tracking-tight">
          Indices &amp; metals
        </h2>
        <span className="text-xs text-muted">Delayed</span>
      </header>

      {loading && !data ? (
        <p className="px-5 py-8 text-sm text-muted">Loading…</p>
      ) : data && !data.configured ? (
        <div className="px-5 py-8">
          <p className="text-sm text-muted">
            Add a free Twelve Data key to <code className="text-violet">.env.local</code>{" "}
            and indices, gold and silver appear here.
          </p>
          <a
            href="https://twelvedata.com/pricing"
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-block text-sm text-violet underline underline-offset-4"
          >
            Get a key
          </a>
        </div>
      ) : (
        <>
        <ul className="divide-y divide-line">
          {data?.items.map((q) => (
            <li
              key={q.symbol}
              className="flex items-center justify-between px-5 py-3.5"
            >
              <span className="min-w-0">
                <span className="block text-sm font-medium">{q.name}</span>
                <span className="tabular text-xs text-muted">{q.symbol}</span>
              </span>
              <span className="text-right">
                <span className="tabular block text-sm">{num(q.price)}</span>
                <Delta value={q.changePct} size="sm" />
              </span>
            </li>
          ))}
        </ul>
        {data?.failed.length ? (
          <div className="border-t border-line px-5 py-3">
            {data.failed.map((f) => (
              <p key={f.symbol} className="text-xs text-muted">
                {f.name} ({f.symbol}) — {f.message}
              </p>
            ))}
          </div>
        ) : null}
        </>
      )}
    </section>
  );
}
