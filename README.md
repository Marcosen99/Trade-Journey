# Ledger

Live crypto and equity markets, plus a private log of every trade you take —
win rate, realised P&L, and where the money actually goes.

Built with Next.js 16, React 19, TypeScript and Tailwind 4.

---

## Run it

```bash
npm install
cp .env.local.example .env.local   # optional, see below
npm run dev
```

Open http://localhost:3000

## Data sources

| Panel | Source | Key needed | Cost |
|---|---|---|---|
| BTC / ETH / SOL prices, sparklines, winners & losers | Binance public market-data mirror (`data-api.binance.vision`) | No | Free, no monthly cap |
| S&P 500, Nasdaq, Dow, gold, silver | Twelve Data `/quote` | Yes, free tier | Free — 800 credits/day, 8 req/min |
| Symbol search in the trade form | Twelve Data `/stocks` + `/etf`, CoinGecko markets | Partly | Free — fetched once a day, searched locally |

The crypto side works out of the box with zero configuration. For indices and
metals, get a free key at https://twelvedata.com/pricing and put it in
`.env.local`:

```
TWELVE_DATA_API_KEY=your_key_here
```

### Why the crypto route caches itself

Binance's full ticker response is about 2.5 MB and Next's data cache
rejects anything over 2 MB, so `next: { revalidate }` fails silently and
every request goes back out to the network. The route therefore asks for
`type=MINI` (which drops the fields it does not use, including
`priceChangePercent` — recomputed from the 24h open) and keeps its own
module-level memo with a 60-second TTL. If Binance returns an error and a
cached copy exists, the stale copy is served rather than blanking the board.

### Silver is an ETF, not spot

Twelve Data's free plan does not carry `XAG/USD`. `SLV` is a fund holding
physical silver, so its percentage move tracks spot closely — but the price
shown is the fund's own, around $60, not dollars per troy ounce. Keyless
spot feeds exist, but the ones that need no key return a price with no
24h change, which is the number the panel is actually read for.

The same applies to `SPY`, `QQQ` and `DIA`: percentages are right, levels
are the fund's.

### The calendar's right-hand space

Cells are capped in size, which on a wide monitor left a large empty
area. Rather than stretching the grid — which is what made the cells look
like playing cards in the first place — the space carries a week-total
column aligned to each row, and a summary of the visible month.

The month average is over days actually traded, not every day on the
grid: dividing by 30 when you traded on four of them describes nothing.

### Jump links, not tabs

Trades, equity trend, daily P&L and the per-symbol table are stacked in
that order and all visible by scrolling. The sticky bar at the top jumps
to a section rather than swapping one in — so the whole page is still
readable end to end, and nothing is hidden behind a click.

The current section is tracked with an IntersectionObserver whose root
margin restricts the decision to the top band of the viewport. Without
that, a tall section further down would claim to be current simply by
occupying more of the screen.

Calendar figures are rendered in light text on a tinted cell. Green text
on a green background is close to unreadable; the tint carries the sign
and the number only has to be legible.

### The equity curve uses a real time axis

Points are placed by date, not one per trading day. A three-week gap looks
like a three-week gap; spacing entries evenly would flatter a month you
barely traded.

The range buttons rebase the curve to zero at the start of the window, so
"90D" reads as what those ninety days did rather than where the account
happened to stand when they began. Peak and drawdown are then also
within-period figures.

There is no 24-hour option. `daily_pnl` stores one row per day, so a
single day is one point — a dot, not a trend. Seven days is the shortest
window that can draw a line. Per-trade timestamps would be needed for
anything finer.

Max drawdown is the largest peak-to-trough fall in account value. It is
often the more useful number: a curve ending at +$5,000 having been
$8,000 underwater on the way is a different account from one that climbed
steadily to the same place.

### Caching differs on Vercel

The module-level memos in `coinMeta.ts` and the crypto route live in one
server process. On Vercel there is no single process — every cold start
begins with an empty memo. So the CoinGecko fetch also uses Next's data
cache, which *is* shared across instances, because the keyless allowance
is per IP and that IP is shared with other deployments.

Binance's full ticker cannot go in the data cache at 2.5 MB, so it stays
a per-instance memo. Binance's limits are generous enough that this costs
nothing in practice.

### Logos come free with the symbol index

`src/lib/coinMeta.ts` holds one memo of the top 500 coins by market cap —
name and logo URL keyed by ticker — shared by the symbol picker and the
movers board. The whole app therefore costs two CoinGecko calls a day
rather than two per feature.

Binance only knows tickers, so the movers board gets its human-readable
names from the same map. Tickers outside the top 500 fall back to a
lettermark rather than a broken image.

### Why symbol search costs nothing

Querying an upstream search endpoint per keystroke would drain a day's
credits in minutes of typing. Instead `/api/symbols` pulls the full US
stock and ETF lists plus the top 500 coins by market cap once, holds them
in memory for 24 hours, and filters locally. Typing is then free no matter
how much of it you do.

Crypto tickers collide — several coins claim BTC or SOL — so the list is
ordered by market cap and the first coin with a given ticker wins. Results
are ranked exact ticker, then ticker prefix, then name. Picking a result
also sets the asset class, since the index already knows which is which.

If an upstream fetch fails, a previously built index is kept rather than
replaced with an empty one.

### Watch the Twelve Data budget

One credit is charged **per symbol**, not per request. Five symbols on the
10-minute cache in `src/app/api/markets/macro/route.ts` costs about 720
credits a day against an 800/day allowance. If you add symbols, raise
`REVALIDATE` to match — the arithmetic is `(86400 / REVALIDATE) × symbols`.

`SPY`, `QQQ` and `DIA` are ETFs that track the S&P 500, Nasdaq 100 and Dow.
They are used instead of the raw index symbols because index data is not
included on every free plan.

## Layout

```
src/
  app/
    page.tsx                    Markets dashboard
    trades/page.tsx             Trade log, behind sign-in
    api/markets/crypto/route.ts Binance → pinned coins + movers
    api/markets/macro/route.ts  Twelve Data → indices + metals
    globals.css                 Design tokens
    trades/actions.ts           Server actions: add, delete, sign out
    login/page.tsx              Email and password
  proxy.ts                      Refreshes the Supabase session
    api/symbols/route.ts        Cached instrument index, searched locally
  components/                   Rail, Tape, Movers, Macro, TradeForm, TradeRow,
                                SymbolPicker, SectionNav, Calendar,
                                SymbolBreakdown, EquityCurve, CoinMark
  lib/supabase/                 Browser and server clients
  lib/                          types, number formatting, polling hook
```

## Design tokens

Defined once in `src/app/globals.css` under `@theme`, then used as Tailwind
utilities (`bg-void`, `text-muted`, `border-line`).

| Token | Hex | Role |
|---|---|---|
| `void` | `#07060E` | Page background |
| `surface` | `#110D22` | Hover fills |
| `raised` | `#171338` | Active nav, skeletons |
| `line` | `#221D4A` | Every hairline |
| `violet` | `#6E5BF0` | Brand, links, primary button |
| `grape` | `#8B7BF5` | Hover state on violet |
| `on-violet` | `#F4F3FF` | Text sitting on a violet fill |
| `gain` | `#3ED9A4` | Positive change — only ever this |
| `loss` | `#FF5C77` | Negative change — only ever this |
| `ink` | `#E7E6F8` | Body text |
| `muted` | `#837DA6` | Secondary text |

Ultraviolet is dark enough that text on it uses `on-violet` rather than the
page colour. White on `#6E5BF0` measures 4.8:1, which clears AA for body
text — worth rechecking if you shift the hue.

Change the accent by editing `--color-violet` and `--color-grape`. Nothing
else needs touching.

## Setting up Supabase

1. Create a free project at supabase.com.
2. Open the SQL editor and run `docs/schema.sql` in full.
3. Then run `docs/migration-002-symbol-stats.sql` once. Migrations are
   separate files precisely so `schema.sql` is never re-run — doing that
   on a live database fails halfway through and leaves a mess.
4. Copy the project URL and publishable key from Settings → API into
   `.env.local`. The `sb_publishable_...` key replaces the old anon key
   and is safe in a browser; row-level security is what protects the data.

Until those two variables exist, `/trades` shows a setup notice and the
markets dashboard carries on working. Free Supabase projects pause after
7 days without a database request — you unpause them from the dashboard.

## What a trade record holds

You type in what a trade made or lost and, optionally, what one R was
worth. Everything else is derived.

That handles scaling out without knowing anything about it. Sell 40% at
1.5R, let the rest run to break even, and you enter `600` for P&L and
`1000` for risk. That is +0.6R and a win. A schema tracking individual
fills would spend a lot of machinery arriving at a number you already know.

What you give up: no entry or exit prices, so nothing cross-checks your
arithmetic, and open positions are not tracked — a row exists only once a
trade is done. Both are additive changes later; nothing needs migrating.

**Win rate is a definition, not a fact.** Trades inside ±0.05R count as
flat and leave the denominator rather than dragging it down. Counting
flats as wins, as losses, or not at all gives three different percentages
from identical trades, so the choice lives in the `trade_stats` view and
nowhere else.

`docs/schema.sql` and all three views were run against PostgreSQL 16 and
checked against six cases: a scale-out netting +0.6R, a clean stop-out, a
full-target win, a wide-stop small win, a dead-flat trade, and one logged
without any stop at all.

## Roadmap

- [x] **Step 1** — design system, live market tape, winners/losers, indices & metals
- [x] **Step 2** — Supabase auth, `trades` table with row-level security, entry form, metrics
- [x] **Step 2b** — searchable symbol picker
- [x] **Step 3** — daily P&L calendar, per-symbol breakdown, equity curve
- [ ] **Step 4** — editing a logged trade, deploy to Vercel
- [ ] **Step 4** — filters, editing, CSV import/export, deploy to Vercel
