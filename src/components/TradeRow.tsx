"use client";

import { useTransition } from "react";
import { deleteTrade } from "@/app/trades/actions";
import { money, num } from "@/lib/format";

export type TradeRecord = {
  id: string;
  symbol: string;
  side: "long" | "short";
  asset_class: string;
  pnl: number;
  risk_amount: number | null;
  r_multiple: number | null;
  reason: string | null;
  closed_at: string;
  notes: string | null;
};

const REASON_STYLE: Record<string, string> = {
  target: "border-[#1F5A47] text-gain",
  stop: "border-[#5A2029] text-loss",
  manual: "border-line text-muted",
  expired: "border-line text-muted",
};

const REASON_LABEL: Record<string, string> = {
  target: "target",
  stop: "stop",
  manual: "manual",
  expired: "expired",
};

export function TradeRow({ trade }: { trade: TradeRecord }) {
  const [pending, start] = useTransition();
  const up = trade.pnl >= 0;

  return (
    <li
      className={`flex items-center gap-4 px-5 py-3 ${pending ? "opacity-40" : ""}`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{trade.symbol}</span>
          {trade.side === "short" ? (
            <span className="rounded border border-line px-1.5 py-px text-[10px] text-muted">
              short
            </span>
          ) : null}
          {trade.reason ? (
            <span
              className={`rounded border px-1.5 py-px text-[10px] ${
                REASON_STYLE[trade.reason] ?? "border-line text-muted"
              }`}
            >
              {REASON_LABEL[trade.reason] ?? trade.reason}
            </span>
          ) : null}
        </div>
        <div className="mt-0.5 truncate text-xs text-muted">
          {new Date(trade.closed_at).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
          })}
          {trade.notes ? ` · ${trade.notes}` : ""}
        </div>
      </div>

      <div className="shrink-0 text-right">
        <div className={`tabular text-sm ${up ? "text-gain" : "text-loss"}`}>
          {up ? "+" : "−"}
          {money(Math.abs(trade.pnl))}
        </div>
        <div className="tabular text-xs text-muted">
          {trade.r_multiple === null ? "no stop set" : `${num(trade.r_multiple)}R`}
        </div>
      </div>

      <button
        onClick={() => start(() => deleteTrade(trade.id))}
        disabled={pending}
        aria-label={`Delete the ${trade.symbol} trade`}
        className="shrink-0 rounded px-2 py-1 text-xs text-muted hover:bg-surface hover:text-loss"
      >
        Delete
      </button>
    </li>
  );
}
