"use client";

import { money, num } from "@/lib/format";

export type SymbolStat = {
  symbol: string;
  asset_class: string;
  trades: number;
  wins: number;
  losses: number;
  flats: number;
  win_rate_pct: number | null;
  net_pnl: number;
  avg_r: number | null;
};

export function SymbolBreakdown({ rows }: { rows: SymbolStat[] }) {
  if (!rows.length) return null;

  return (
    <section id="symbols" className="scroll-mt-14 border-b border-line">
      <header className="flex items-baseline justify-between px-5 py-4">
        <h2 className="text-base font-semibold tracking-tight">By symbol</h2>
        <span className="text-xs text-muted">Sorted by net P&amp;L</span>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-y border-line text-xs text-muted">
              <th className="px-5 py-2 text-left font-normal">Symbol</th>
              <th className="px-3 py-2 text-right font-normal">Trades</th>
              <th className="px-3 py-2 text-right font-normal">W / L</th>
              <th className="px-3 py-2 text-right font-normal">Win rate</th>
              <th className="px-3 py-2 text-right font-normal">Avg R</th>
              <th className="px-5 py-2 text-right font-normal">Net P&amp;L</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.symbol}>
                <td className="px-5 py-2.5">
                  <span className="font-medium">{r.symbol}</span>
                  <span className="ml-2 text-xs text-muted">
                    {r.asset_class}
                  </span>
                </td>
                <td className="tabular px-3 py-2.5 text-right text-muted">
                  {r.trades}
                </td>
                <td className="tabular px-3 py-2.5 text-right">
                  <span className="text-gain">{r.wins}</span>
                  <span className="text-muted"> / </span>
                  <span className="text-loss">{r.losses}</span>
                  {r.flats ? (
                    <span className="text-muted"> / {r.flats}</span>
                  ) : null}
                </td>
                <td className="tabular px-3 py-2.5 text-right">
                  {r.win_rate_pct === null ? "—" : `${num(r.win_rate_pct, 1)}%`}
                </td>
                <td className="tabular px-3 py-2.5 text-right text-muted">
                  {r.avg_r === null ? "—" : `${num(r.avg_r)}R`}
                </td>
                <td
                  className={`tabular px-5 py-2.5 text-right ${
                    r.net_pnl >= 0 ? "text-gain" : "text-loss"
                  }`}
                >
                  {r.net_pnl >= 0 ? "+" : "−"}
                  {money(Math.abs(r.net_pnl))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="px-5 pt-1 pb-4 text-xs text-muted">
        The W / L column shows wins, losses and — where there are any — flat
        trades, which sit outside the win rate rather than counting against it.
      </p>
    </section>
  );
}
