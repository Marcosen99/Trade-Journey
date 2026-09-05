"use client";

import { useActionState, useState } from "react";
import { addTrade, type FormState } from "@/app/trades/actions";
import { SymbolPicker } from "@/components/SymbolPicker";

const initial: FormState = { error: null, ok: false, savedAt: 0 };

const field =
  "mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-grape";

/* Every input lives in here, so remounting this one component clears
   the whole form — including the picker's internal query. Cheaper and
   less fragile than resetting each field from an effect. */
function Fields() {
  const [assetClass, setAssetClass] = useState("stock");

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {/* Choosing a symbol also sets the asset class, since the index
          already knows TSLA is a stock and BTC is not. */}
      <SymbolPicker onPick={setAssetClass} />

      <label className="block">
        <span className="text-xs text-muted">Asset</span>
        <select
          name="asset_class"
          value={assetClass}
          onChange={(e) => setAssetClass(e.target.value)}
          className={field}
        >
          <option value="stock">Stock</option>
          <option value="etf">ETF</option>
          <option value="crypto">Crypto</option>
          <option value="commodity">Commodity</option>
          <option value="forex">Forex</option>
        </select>
      </label>

      <label className="block">
        <span className="text-xs text-muted">Direction</span>
        <select name="side" defaultValue="long" className={field}>
          <option value="long">Long</option>
          <option value="short">Short</option>
        </select>
      </label>

      <label className="block">
        <span className="text-xs text-muted">Closed</span>
        <input type="date" name="closed_at" className={field} />
      </label>

      <label className="block">
        <span className="text-xs text-muted">P&amp;L, net of fees</span>
        <input
          name="pnl"
          inputMode="decimal"
          placeholder="600  ·  −250 for a loss"
          className={`${field} tabular`}
        />
      </label>

      <label className="block">
        <span className="text-xs text-muted">Risk taken (1R)</span>
        <input
          name="risk_amount"
          inputMode="decimal"
          placeholder="1000"
          className={`${field} tabular`}
        />
      </label>

      <label className="block">
        <span className="text-xs text-muted">How it ended</span>
        <select name="reason" defaultValue="manual" className={field}>
          <option value="target">Target hit</option>
          <option value="stop">Stopped out</option>
          <option value="manual">Closed by hand</option>
          <option value="expired">Expired</option>
        </select>
      </label>

      <label className="block">
        <span className="text-xs text-muted">Note</span>
        <input name="notes" placeholder="Optional" className={field} />
      </label>
    </div>
  );
}

export function TradeForm() {
  const [state, action, pending] = useActionState(addTrade, initial);

  return (
    <form action={action} className="px-5 py-5">
      <Fields key={state.savedAt} />

      <p className="mt-3 text-xs text-muted">
        Risk is what one R was worth — the money you stood to lose if your stop
        had been hit. Leave it blank and the trade still counts toward win rate
        and P&amp;L, just not toward average R.
      </p>

      {state.error ? (
        <p className="mt-3 text-sm text-loss">{state.error}</p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-4 rounded-md bg-violet px-4 py-2 text-sm font-medium text-on-violet hover:bg-grape disabled:opacity-60"
      >
        {pending ? "Saving…" : "Log trade"}
      </button>
    </form>
  );
}
