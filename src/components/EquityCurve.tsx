"use client";

import { useRef, useState } from "react";
import { money } from "@/lib/format";
import type { DayPnl } from "@/components/Calendar";

const W = 800;
const H = 220;
const PAD = { top: 16, right: 12, bottom: 16, left: 12 };

/* No 24-hour option: daily_pnl stores one row per day, so a single day
   is one point — a dot, not a trend. Seven days is the shortest window
   that can actually draw a line. */
const RANGES = [
  { id: "7", label: "7D", days: 7 },
  { id: "30", label: "30D", days: 30 },
  { id: "90", label: "90D", days: 90 },
  { id: "365", label: "1Y", days: 365 },
  { id: "all", label: "All", days: Infinity },
] as const;

type Point = {
  x: number;
  y: number;
  day: string;
  total: number;
  dayPnl: number;
  trades: number;
};

/* Dates are plotted on a real time axis rather than one point per
   trading day. A three-week gap should look like a three-week gap. */
function dayMs(day: string) {
  const [y, m, d] = day.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function EquityCurve({ days }: { days: DayPnl[] }) {
  const svg = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<Point | null>(null);
  const [range, setRange] = useState<string>("all");

  /* Pinned at mount rather than read during render: Date.now() in a
     render body makes the component impure, and the window should not
     quietly slide forward every time React re-renders. */
  const [mountedAt] = useState(() => Date.now());

  const period = RANGES.find((r) => r.id === range) ?? RANGES[4];

  const cutoff =
    period.days === Infinity
      ? -Infinity
      : mountedAt - period.days * 86_400_000;

  const sorted = [...days]
    .sort((a, b) => dayMs(a.day) - dayMs(b.day))
    .filter((d) => dayMs(d.day) >= cutoff);

  const selector = (
    <div className="flex gap-1" role="group" aria-label="Time range">
      {RANGES.map((r) => (
        <button
          key={r.id}
          onClick={() => {
            setRange(r.id);
            setHover(null);
          }}
          aria-pressed={range === r.id}
          className={`rounded px-2 py-1 text-xs transition-colors ${
            range === r.id
              ? "bg-raised text-ink"
              : "text-muted hover:text-ink"
          }`}
        >
          {r.label}
        </button>
      ))}
    </div>
  );

  if (!sorted.length) {
    return (
      <section id="equity" className="scroll-mt-14 border-b border-line">
        <header className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <h2 className="text-base font-semibold tracking-tight">Equity trend</h2>
          {selector}
        </header>
        <p className="px-5 pb-6 text-sm text-muted">
          Nothing closed in the last {period.days} days.
        </p>
      </section>
    );
  }

  /* Cumulative restarts at zero at the start of the window, so "90D"
     reads as what those ninety days did rather than where the account
     happened to stand when they began. */
  const series: Omit<Point, "x" | "y">[] = [
    { day: sorted[0].day, total: 0, dayPnl: 0, trades: 0 },
  ];
  let running = 0;
  for (const d of sorted) {
    running += d.net_pnl;
    series.push({
      day: d.day,
      total: running,
      dayPnl: d.net_pnl,
      trades: d.trades,
    });
  }

  const t0 = dayMs(series[0].day);
  const span = dayMs(series[series.length - 1].day) - t0 || 1;

  const values = series.map((s) => s.total);
  const lo = Math.min(...values, 0);
  const hi = Math.max(...values, 0);
  const spread = hi - lo || 1;

  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const toY = (v: number) => PAD.top + innerH - ((v - lo) / spread) * innerH;

  const points: Point[] = series.map((s) => ({
    ...s,
    /* A single trading day has no span to spread across, so it sits in
       the middle rather than collapsing onto the left edge. */
    x:
      span === 1
        ? PAD.left + innerW / 2
        : PAD.left + ((dayMs(s.day) - t0) / span) * innerW,
    y: toY(s.total),
  }));

  let high = 0;
  let drawdown = 0;
  for (const v of values) {
    high = Math.max(high, v);
    drawdown = Math.max(drawdown, high - v);
  }

  const total = values[values.length - 1];
  const up = total >= 0;
  const stroke = up ? "var(--color-gain)" : "var(--color-loss)";
  const zeroY = toY(0);

  const path = points.map((p, i) => `${i ? "L" : "M"}${p.x} ${p.y}`).join(" ");
  const area =
    `M${points[0].x} ${zeroY} ` +
    points.map((p) => `L${p.x} ${p.y}`).join(" ") +
    ` L${points[points.length - 1].x} ${zeroY} Z`;

  function track(e: React.MouseEvent<SVGSVGElement>) {
    const box = svg.current?.getBoundingClientRect();
    if (!box) return;
    const x = ((e.clientX - box.left) / box.width) * W;
    let best = points[0];
    for (const p of points) {
      if (Math.abs(p.x - x) < Math.abs(best.x - x)) best = p;
    }
    setHover(best);
  }

  const shown = hover ?? points[points.length - 1];

  return (
    <section id="equity" className="scroll-mt-14 border-b border-line">
      <header className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div className="flex items-center gap-4">
          <h2 className="text-base font-semibold tracking-tight">Equity trend</h2>
          {selector}
        </div>
        <div className="flex items-baseline gap-5 text-xs text-muted">
          <span>
            Change{" "}
            <span className={`tabular ${up ? "text-gain" : "text-loss"}`}>
              {money(total)}
            </span>
          </span>
          <span>
            Peak <span className="tabular text-ink">{money(hi)}</span>
          </span>
          <span>
            Max drawdown{" "}
            <span className="tabular text-loss">−{money(drawdown)}</span>
          </span>
        </div>
      </header>

      <div className="px-5 pb-2">
        <svg
          ref={svg}
          viewBox={`0 0 ${W} ${H}`}
          /* Stretched to fill rather than scaled: with h-auto the chart
             grew past 450px on a wide monitor. vector-effect keeps the
             stroke an even width despite the distortion. */
          preserveAspectRatio="none"
          className="h-[220px] w-full"
          onMouseMove={track}
          onMouseLeave={() => setHover(null)}
          role="img"
          aria-label={`Profit and loss over the selected period, ending at ${money(total)}, with a maximum drawdown of ${money(drawdown)}.`}
        >
          <defs>
            <linearGradient id="equity-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity="0.22" />
              <stop offset="100%" stopColor={stroke} stopOpacity="0" />
            </linearGradient>
          </defs>

          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={zeroY}
            y2={zeroY}
            stroke="var(--color-line)"
            strokeDasharray="3 4"
            vectorEffect="non-scaling-stroke"
          />

          <path d={area} fill="url(#equity-fill)" />
          <path
            d={path}
            fill="none"
            stroke={stroke}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />

          {hover ? (
            <>
              <line
                x1={hover.x}
                x2={hover.x}
                y1={PAD.top}
                y2={H - PAD.bottom}
                stroke="var(--color-grape)"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
              <circle cx={hover.x} cy={hover.y} r="4" fill={stroke} />
            </>
          ) : null}
        </svg>
      </div>

      <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 px-5 pb-4 text-xs text-muted">
        <span className="tabular">
          {new Date(shown.day).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </span>
        <span>
          Cumulative{" "}
          <span
            className={`tabular ${shown.total >= 0 ? "text-gain" : "text-loss"}`}
          >
            {money(shown.total)}
          </span>
        </span>
        {shown.trades ? (
          <span>
            That day{" "}
            <span
              className={`tabular ${shown.dayPnl >= 0 ? "text-gain" : "text-loss"}`}
            >
              {money(shown.dayPnl)}
            </span>{" "}
            over {shown.trades} trade{shown.trades === 1 ? "" : "s"}
          </span>
        ) : (
          <span>Start of period, counted from zero</span>
        )}
      </div>
    </section>
  );
}
