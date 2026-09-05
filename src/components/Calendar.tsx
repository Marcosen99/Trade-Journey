"use client";

import { useMemo, useState } from "react";
import { money, compact } from "@/lib/format";

export type DayPnl = { day: string; net_pnl: number; trades: number };

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/* The server groups by Europe/Oslo and returns plain YYYY-MM-DD, so
   these are parsed as calendar dates. new Date(string) would read them
   as UTC midnight and shift trades onto the previous square. */
function parts(day: string) {
  const [y, m, d] = day.split("-").map(Number);
  return { y, m, d, key: `${y}-${String(m).padStart(2, "0")}` };
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "gain" | "loss";
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <span className="text-xs text-muted">{label}</span>
      <span
        className={`tabular text-sm ${
          tone === "gain" ? "text-gain" : tone === "loss" ? "text-loss" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}

export function Calendar({ days }: { days: DayPnl[] }) {
  const byMonth = useMemo(() => {
    const map = new Map<string, Map<number, DayPnl>>();
    for (const row of days) {
      const { key, d } = parts(row.day);
      if (!map.has(key)) map.set(key, new Map());
      map.get(key)!.set(d, row);
    }
    return map;
  }, [days]);

  const latest = days.length ? parts(days[0].day).key : monthKey(new Date());
  const [cursor, setCursor] = useState(latest);

  const [year, month] = cursor.split("-").map(Number);
  const rows = byMonth.get(cursor) ?? new Map<number, DayPnl>();

  const daysInMonth = new Date(year, month, 0).getDate();
  /* getDay() is Sunday-based; shift so Monday starts the week. */
  const lead = (new Date(year, month - 1, 1).getDay() + 6) % 7;

  const entries = [...rows.values()];
  const total = entries.reduce((sum, r) => sum + r.net_pnl, 0);
  const peak = Math.max(...entries.map((r) => Math.abs(r.net_pnl)), 1);

  /* Cells chunked into calendar weeks so each row can carry its own
     total in the column to the right. Deliberately not memoised: it is
     thirty iterations, and the React compiler optimises it better than
     a hand-written dependency array it cannot verify. */
  const cells: (number | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7) cells.push(null);
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const best = entries.reduce<DayPnl | null>(
    (b, r) => (!b || r.net_pnl > b.net_pnl ? r : b),
    null
  );
  const worst = entries.reduce<DayPnl | null>(
    (w, r) => (!w || r.net_pnl < w.net_pnl ? r : w),
    null
  );
  const green = entries.filter((r) => r.net_pnl > 0).length;
  const red = entries.filter((r) => r.net_pnl < 0).length;

  function shift(by: number) {
    setCursor(monthKey(new Date(year, month - 1 + by, 1)));
  }

  const label = new Date(year, month - 1, 1).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });

  return (
    <section id="calendar" className="scroll-mt-14 border-b border-line">
      <header className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => shift(-1)}
            aria-label="Previous month"
            className="rounded border border-line px-2 py-1 text-xs text-muted hover:border-grape hover:text-ink"
          >
            ‹
          </button>
          <h2 className="min-w-[9rem] text-base font-semibold tracking-tight">
            {label}
          </h2>
          <button
            onClick={() => shift(1)}
            aria-label="Next month"
            className="rounded border border-line px-2 py-1 text-xs text-muted hover:border-grape hover:text-ink"
          >
            ›
          </button>
        </div>
        <span
          className={`tabular text-sm ${
            total > 0 ? "text-gain" : total < 0 ? "text-loss" : "text-muted"
          }`}
        >
          {entries.length ? money(total) : "No trades"}
        </span>
      </header>

      <div className="flex flex-col gap-5 px-5 pb-5 lg:flex-row lg:gap-8">
        <div className="min-w-0 flex-1">
          <div className="grid grid-cols-[repeat(7,minmax(0,1fr))_4.5rem] gap-1">
            {WEEKDAYS.map((w) => (
              <div key={w} className="pb-1 text-center text-[10px] text-muted">
                {w}
              </div>
            ))}
            <div className="pb-1 text-right text-[10px] text-muted">Week</div>

            {weeks.map((week, wi) => {
              const weekTotal = week.reduce<number>(
                (sum, d) => sum + (d ? (rows.get(d)?.net_pnl ?? 0) : 0),
                0
              );
              const weekTrades = week.filter((d) => d && rows.get(d)).length;

              return (
                <div key={wi} className="contents">
                  {week.map((dayNum, di) => {
                    if (dayNum === null)
                      return <div key={`${wi}-${di}`} aria-hidden="true" />;

                    const row = rows.get(dayNum);
                    const up = (row?.net_pnl ?? 0) > 0;
                    /* Intensity is relative to the strongest day of the
                       month on screen, so a quiet month stays readable. */
                    const alpha = row
                      ? 0.18 + (Math.abs(row.net_pnl) / peak) * 0.42
                      : 0;

                    return (
                      <div
                        key={`${wi}-${di}`}
                        title={
                          row
                            ? `${dayNum}: ${money(row.net_pnl)} over ${row.trades} trade${row.trades === 1 ? "" : "s"}`
                            : undefined
                        }
                        className="flex min-h-14 flex-col rounded p-1.5"
                        style={{
                          background: row
                            ? `rgba(${up ? "62,217,164" : "255,92,119"},${alpha})`
                            : "var(--color-surface)",
                        }}
                      >
                        <span className="tabular text-[10px] leading-none text-muted">
                          {dayNum}
                        </span>
                        {row ? (
                          /* Light text, not green on green. The tint
                             carries the sign; the figure only has to
                             be readable. */
                          <span className="tabular flex flex-1 items-center justify-center text-[13px] font-medium text-ink">
                            {up ? "+" : "−"}
                            {compact(Math.abs(row.net_pnl))}
                          </span>
                        ) : null}
                      </div>
                    );
                  })}

                  <div className="flex min-h-14 flex-col justify-center rounded border border-line px-2 text-right">
                    {weekTrades ? (
                      <>
                        <span
                          className={`tabular text-[13px] font-medium ${
                            weekTotal >= 0 ? "text-gain" : "text-loss"
                          }`}
                        >
                          {weekTotal >= 0 ? "+" : "−"}
                          {compact(Math.abs(weekTotal))}
                        </span>
                        <span className="text-[10px] text-muted">
                          {weekTrades} day{weekTrades === 1 ? "" : "s"}
                        </span>
                      </>
                    ) : (
                      <span className="text-[10px] text-muted">—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <aside className="shrink-0 lg:w-64">
          <h3 className="pb-1 text-xs text-muted">This month</h3>
          <div className="divide-y divide-line border-t border-line">
            <Stat label="Days traded" value={String(entries.length)} />
            <Stat
              label="Green / red days"
              value={`${green} / ${red}`}
            />
            <Stat
              label="Best day"
              value={best ? money(best.net_pnl) : "—"}
              tone={best && best.net_pnl > 0 ? "gain" : undefined}
            />
            <Stat
              label="Worst day"
              value={worst ? money(worst.net_pnl) : "—"}
              tone={worst && worst.net_pnl < 0 ? "loss" : undefined}
            />
            <Stat
              label="Average day"
              value={entries.length ? money(total / entries.length) : "—"}
            />
          </div>
          <p className="pt-3 text-xs text-muted">
            Averaged over days you actually traded, not every day in the month.
          </p>
        </aside>
      </div>
    </section>
  );
}
