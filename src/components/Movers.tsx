"use client";

import { Delta } from "@/components/Delta";
import { CoinMark } from "@/components/CoinMark";
import { useFeed } from "@/lib/useFeed";
import { money, clock } from "@/lib/format";
import type { CryptoPayload, Quote } from "@/lib/types";

/* The bar length encodes how big the move is relative to the biggest
   move on the board — it is data, not decoration. */
function Row({ q, peak }: { q: Quote; peak: number }) {
  const width = Math.max(4, (Math.abs(q.changePct) / peak) * 100);
  const up = q.changePct >= 0;

  return (
    <li className="relative flex items-center justify-between gap-3 px-5 py-2.5">
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 -z-10"
        style={{
          width: `${width}%`,
          background: `linear-gradient(90deg, ${
            up ? "rgba(62,217,164,.14)" : "rgba(255,92,119,.14)"
          }, transparent)`,
        }}
      />
      <span className="flex min-w-0 items-center gap-2.5">
        <CoinMark symbol={q.symbol} image={q.image} />
        <span className="text-sm font-medium">{q.symbol}</span>
        <span className="hidden truncate text-xs text-muted sm:inline">
          {q.name === q.symbol ? "" : q.name}
        </span>
      </span>
      <span className="flex shrink-0 items-baseline gap-3">
        <span className="tabular text-xs text-muted">{money(q.price)}</span>
        <span className="w-[72px] text-right">
          <Delta value={q.changePct} size="sm" />
        </span>
      </span>
    </li>
  );
}

function Board({
  title,
  rows,
  empty,
}: {
  title: string;
  rows: Quote[];
  empty: string;
}) {
  const peak = Math.max(...rows.map((r) => Math.abs(r.changePct)), 1);
  return (
    <div>
      <h3 className="px-5 pt-4 pb-2 text-xs text-muted">{title}</h3>
      {rows.length ? (
        <ul className="isolate">
          {rows.map((q) => (
            <Row key={q.symbol} q={q} peak={peak} />
          ))}
        </ul>
      ) : (
        <p className="px-5 pb-2 text-sm text-muted">{empty}</p>
      )}
    </div>
  );
}

export function Movers() {
  const { data, loading } = useFeed<CryptoPayload>("/api/markets/crypto", 30_000);

  return (
    <section className="border-line md:border-r">
      <header className="flex items-baseline justify-between border-b border-line px-5 py-4">
        <h2 className="text-base font-semibold tracking-tight">Biggest movers</h2>
        <span className="tabular text-xs text-muted">
          {data ? `24h · ${clock(data.updatedAt)}` : "24h"}
        </span>
      </header>

      {loading && !data ? (
        <p className="px-5 py-8 text-sm text-muted">Loading the board…</p>
      ) : data ? (
        <div className="divide-y divide-line pb-3">
          <Board
            title="Winners"
            rows={data.gainers}
            empty="Nothing up more than 1% today."
          />
          <Board
            title="Losers"
            rows={data.losers}
            empty="Nothing down more than 1% today."
          />
        </div>
      ) : (
        <p className="px-5 py-8 text-sm text-loss">
          The movers board needs the market feed. Check your connection and it
          will fill in on the next refresh.
        </p>
      )}
    </section>
  );
}
