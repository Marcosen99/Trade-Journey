"use client";

import { Delta } from "@/components/Delta";
import { Sparkline } from "@/components/Sparkline";
import { CoinMark } from "@/components/CoinMark";
import { useFeed } from "@/lib/useFeed";
import { money, compact } from "@/lib/format";
import type { CryptoPayload, Quote } from "@/lib/types";
import type { MacroPayload } from "@/app/api/markets/macro/route";

function Cell({ q }: { q: Quote }) {
  return (
    <div className="flex min-w-0 flex-1 items-center justify-between gap-4 border-line px-5 py-5 [&:not(:last-child)]:border-b sm:[&:not(:last-child)]:border-r sm:[&:not(:last-child)]:border-b-0">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {q.image ? <CoinMark symbol={q.symbol} image={q.image} size={18} /> : null}
          <span className="text-sm font-semibold tracking-tight">{q.symbol}</span>
          <span className="truncate text-xs text-muted">{q.name}</span>
        </div>
        <div className="tabular mt-1 text-2xl leading-none font-medium">
          {money(q.price)}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <Delta value={q.changePct} />
          {q.volume ? (
            <span className="tabular text-xs text-muted">
              vol {compact(q.volume)}
            </span>
          ) : null}
        </div>
      </div>
      {q.spark?.length ? (
        <Sparkline data={q.spark} positive={q.changePct >= 0} />
      ) : null}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="flex-1 border-line px-5 py-5 [&:not(:last-child)]:border-b sm:[&:not(:last-child)]:border-r sm:[&:not(:last-child)]:border-b-0">
      <div className="h-3 w-16 rounded bg-raised" />
      <div className="mt-3 h-6 w-28 rounded bg-raised" />
      <div className="mt-3 h-3 w-14 rounded bg-raised" />
    </div>
  );
}

export function Tape() {
  const crypto = useFeed<CryptoPayload>("/api/markets/crypto", 30_000);
  const macro = useFeed<MacroPayload>("/api/markets/macro", 300_000);

  const cells: Quote[] = [
    ...(crypto.data?.pinned ?? []),
    ...(macro.data?.items ?? []).filter((q) =>
      ["XAU/USD", "SPY"].includes(q.symbol)
    ),
  ];

  return (
    <section aria-label="Live market prices">
      <div className="flex flex-col border-b border-line sm:flex-row">
        {cells.length
          ? cells.map((q) => <Cell key={q.symbol} q={q} />)
          : [0, 1, 2, 3].map((i) => <Skeleton key={i} />)}
      </div>
      {crypto.error ? (
        <p className="border-b border-line px-5 py-2 text-xs text-loss">
          Live prices paused: {crypto.error}. Retrying every 30 seconds.
        </p>
      ) : null}
    </section>
  );
}
