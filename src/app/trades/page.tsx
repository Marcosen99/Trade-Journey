import Link from "next/link";
import { createClient, isConfigured } from "@/lib/supabase/server";
import { TradeForm } from "@/components/TradeForm";
import { TradeRow, type TradeRecord } from "@/components/TradeRow";
import { SectionNav } from "@/components/SectionNav";
import { Calendar, type DayPnl } from "@/components/Calendar";
import { EquityCurve } from "@/components/EquityCurve";
import { SymbolBreakdown, type SymbolStat } from "@/components/SymbolBreakdown";
import { signOut } from "./actions";
import { money, num } from "@/lib/format";

/* This page reads a session cookie, so it must never be prerendered.
   Without this it builds as static whenever Supabase env vars are
   absent at build time, and then serves that stale page forever. */
export const dynamic = "force-dynamic";

type Stats = {
  trades: number;
  wins: number;
  losses: number;
  flats: number;
  win_rate_pct: number | null;
  net_pnl: number | null;
  profit_factor: number | null;
  avg_r: number | null;
};

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <header className="border-b border-line px-5 py-6">
        <h1 className="text-xl font-semibold tracking-tight">Trade log</h1>
        <p className="mt-1 text-sm text-muted">
          Your entries stay private to your account.
        </p>
      </header>
      {children}
    </div>
  );
}

export default async function TradesPage() {
  if (!isConfigured()) {
    return (
      <Shell>
        <div className="mx-auto max-w-md px-5 py-16 text-center">
          <h2 className="text-lg font-semibold tracking-tight">
            Connect a Supabase project
          </h2>
          <p className="mt-2 text-sm text-muted">
            Run <code className="text-violet">docs/schema.sql</code> in the SQL
            editor, then put the project URL and anon key in{" "}
            <code className="text-violet">.env.local</code>.
          </p>
        </div>
      </Shell>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <Shell>
        <div className="mx-auto max-w-md px-5 py-16 text-center">
          <h2 className="text-lg font-semibold tracking-tight">
            Sign in to start logging
          </h2>
          <p className="mt-2 text-sm text-muted">
            Win rate, profit factor and average R are computed from your own
            entries.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-block rounded-md bg-violet px-4 py-2 text-sm font-medium text-on-violet hover:bg-grape"
          >
            Sign in
          </Link>
        </div>
      </Shell>
    );
  }

  const [{ data: stats }, { data: trades }, { data: daily }, { data: bySymbol }] =
    await Promise.all([
      supabase.from("trade_stats").select("*").maybeSingle(),
      supabase
        .from("trades_with_r")
        .select("*")
        .order("closed_at", { ascending: false })
        .limit(50),
      supabase
        .from("daily_pnl")
        .select("*")
        .order("day", { ascending: false }),
      supabase
        .from("symbol_stats")
        .select("*")
        .order("net_pnl", { ascending: false }),
    ]);

  const s = stats as Stats | null;
  const rows = (trades ?? []) as TradeRecord[];
  const days = (daily ?? []) as DayPnl[];
  const symbols = (bySymbol ?? []) as SymbolStat[];

  const metrics = [
    {
      label: "Net P&L",
      value: s?.net_pnl != null ? money(s.net_pnl) : "—",
      tone: s?.net_pnl != null ? (s.net_pnl >= 0 ? "gain" : "loss") : null,
    },
    {
      label: "Win rate",
      value: s?.win_rate_pct != null ? `${num(s.win_rate_pct, 1)}%` : "—",
      tone: null,
    },
    {
      label: "Profit factor",
      value: s?.profit_factor != null ? num(s.profit_factor) : "—",
      tone: null,
    },
    {
      label: "Average R",
      value: s?.avg_r != null ? `${num(s.avg_r)}R` : "—",
      tone: null,
    },
  ];

  return (
    <div>
      <header className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line px-5 py-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Trade log</h1>
          <p className="mt-1 text-sm text-muted">{user.email}</p>
        </div>
        <form action={signOut}>
          <button className="rounded-md border border-line px-3 py-1.5 text-sm text-muted hover:border-grape hover:text-ink">
            Sign out
          </button>
        </form>
      </header>

      <div className="grid border-b border-line sm:grid-cols-4">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="border-line px-5 py-5 [&:not(:last-child)]:border-b sm:[&:not(:last-child)]:border-r sm:[&:not(:last-child)]:border-b-0"
          >
            <div className="text-xs text-muted">{m.label}</div>
            <div
              className={`tabular mt-1.5 text-2xl leading-none ${
                m.tone === "gain"
                  ? "text-gain"
                  : m.tone === "loss"
                    ? "text-loss"
                    : ""
              }`}
            >
              {m.value}
            </div>
          </div>
        ))}
      </div>

      {s && s.flats > 0 ? (
        <p className="border-b border-line px-5 py-2 text-xs text-muted">
          {s.wins} won, {s.losses} lost, {s.flats} flat. Flat trades are left
          out of the win rate rather than counted against it.
        </p>
      ) : null}

      <div className="border-b border-line">
        <TradeForm />
      </div>

      {rows.length ? (
        <>
          <SectionNav />
          <section id="trades" className="scroll-mt-14 border-b border-line">
            <h2 className="px-5 py-4 text-base font-semibold tracking-tight">
              Recent trades
            </h2>
            <ul className="divide-y divide-line border-t border-line">
              {rows.map((t) => (
                <TradeRow key={t.id} trade={t} />
              ))}
            </ul>
          </section>
          {days.length ? <EquityCurve days={days} /> : null}
          {days.length ? <Calendar days={days} /> : null}
          <SymbolBreakdown rows={symbols} />
        </>
      ) : (
        <p className="px-5 py-10 text-sm text-muted">
          Nothing logged yet. Add your last trade above and the numbers fill in.
        </p>
      )}
    </div>
  );
}
