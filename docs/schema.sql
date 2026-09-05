-- Step 2 schema. Paste into the Supabase SQL editor.
--
-- ─── Deliberately simple ────────────────────────────────────────────
-- You type in what a trade made or lost, and optionally what you had
-- at risk. Everything else is derived from those two numbers.
--
-- This handles scaling out without knowing anything about it. Sell 40%
-- at 1.5R, let the rest run to break even, and you enter pnl = 600
-- with risk_amount = 1000. That is +0.6R and a win. A schema that
-- tracked individual fills would spend a lot of machinery arriving at
-- the same figure you already know.
--
-- The trade-off: no entry or exit prices means no average-price
-- checking, and open positions are not tracked — a row exists only
-- once a trade is done. Both are additive changes later; nothing here
-- needs migrating to add them.

create type trade_side  as enum ('long', 'short');
create type asset_class as enum ('crypto', 'stock', 'etf', 'commodity', 'forex');
create type exit_reason as enum ('target', 'stop', 'manual', 'expired');

create table public.trades (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,

  symbol      text not null check (length(trim(symbol)) between 1 and 20),
  asset_class asset_class not null,
  side        trade_side  not null default 'long',
  currency    text not null default 'USD',

  -- Net of fees, as it landed in your account. Negative for a loss.
  pnl         numeric(20, 4) not null,

  -- What 1R was worth: the money you stood to lose if your stop had
  -- been hit, sized at entry. Optional — leave it null and the trade
  -- still counts toward win rate and P&L, just not toward average R.
  risk_amount numeric(20, 4) check (risk_amount > 0),

  reason      exit_reason,
  closed_at   timestamptz not null default now(),
  notes       text,
  created_at  timestamptz not null default now()
);

create index trades_user_closed_idx on public.trades (user_id, closed_at desc);

-- ─── Derived numbers ────────────────────────────────────────────────
-- Nothing below is stored, so correcting a P&L corrects every metric
-- that depends on it.

create view public.trades_with_r as
select
  t.*,
  case when t.risk_amount is null then null
       else round(t.pnl / t.risk_amount, 3)
  end as r_multiple
from public.trades t;

-- Win rate is a definition, not a fact. Anything inside ±0.05R (or
-- ±0.5% of risk when no risk was recorded) counts as flat and leaves
-- the denominator rather than dragging it down. Counting flats as
-- wins, as losses, or not at all gives three different percentages
-- from identical trades, so the choice lives here and nowhere else.
create view public.trade_stats as
with scored as (
  select
    user_id,
    pnl,
    r_multiple,
    case
      when r_multiple is not null and abs(r_multiple) < 0.05 then 'flat'
      when r_multiple is null and pnl = 0 then 'flat'
      when pnl > 0 then 'win'
      when pnl < 0 then 'loss'
      else 'flat'
    end as outcome
  from public.trades_with_r
)
select
  user_id,
  count(*)                                 as trades,
  count(*) filter (where outcome = 'win')  as wins,
  count(*) filter (where outcome = 'loss') as losses,
  count(*) filter (where outcome = 'flat') as flats,
  round(100.0 * count(*) filter (where outcome = 'win')
        / nullif(count(*) filter (where outcome in ('win','loss')), 0), 1)
                                           as win_rate_pct,
  sum(pnl)                                 as net_pnl,
  -- Gross winnings over gross losses. Above 1.0 means the approach
  -- makes money even when most individual trades do not.
  round(sum(pnl) filter (where pnl > 0)
        / nullif(abs(sum(pnl) filter (where pnl < 0)), 0), 2)
                                           as profit_factor,
  round(avg(r_multiple), 2)                as avg_r
from scored
group by user_id;

-- Feeds the calendar heatmap. Grouped in local time, not UTC, so a
-- trade closed at 00:30 on Tuesday does not land on Monday's square.
create view public.daily_pnl as
select
  user_id,
  (closed_at at time zone 'Europe/Oslo')::date as day,
  sum(pnl)                                     as net_pnl,
  count(*)                                     as trades
from public.trades
group by user_id, day;

-- ─── Row-level security ─────────────────────────────────────────────
-- A row is only ever readable or writable by the account that wrote it.
alter table public.trades enable row level security;

create policy "own rows: read"   on public.trades for select using (auth.uid() = user_id);
create policy "own rows: insert" on public.trades for insert with check (auth.uid() = user_id);
create policy "own rows: update" on public.trades for update using (auth.uid() = user_id);
create policy "own rows: delete" on public.trades for delete using (auth.uid() = user_id);
