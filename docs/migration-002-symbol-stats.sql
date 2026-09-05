-- Migration 002 — per-symbol breakdown.
--
-- Run this ONCE, after docs/schema.sql. Do not re-run schema.sql.
--
-- Win and loss were classified inside trade_stats. Adding a second
-- view that groups by symbol would mean writing that rule twice, and
-- two copies of a definition drift. So the outcome moves down into
-- trades_with_r, and both stats views read it from there.

-- Appending a column to an existing view is allowed; the dependent
-- view is rebuilt below.
create or replace view public.trades_with_r as
select
  t.*,
  case when t.risk_amount is null then null
       else round(t.pnl / t.risk_amount, 3)
  end as r_multiple,
  -- Anything inside ±0.05R is flat: neither a win nor a loss, and
  -- excluded from the denominator rather than dragging it down.
  case
    when t.risk_amount is not null
         and abs(t.pnl / t.risk_amount) < 0.05          then 'flat'
    when t.risk_amount is null and t.pnl = 0            then 'flat'
    when t.pnl > 0                                      then 'win'
    when t.pnl < 0                                      then 'loss'
    else 'flat'
  end as outcome
from public.trades t;

drop view if exists public.trade_stats;

create view public.trade_stats as
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
  round(sum(pnl) filter (where pnl > 0)
        / nullif(abs(sum(pnl) filter (where pnl < 0)), 0), 2)
                                           as profit_factor,
  round(avg(r_multiple), 2)                as avg_r
from public.trades_with_r
group by user_id;

-- The same numbers, cut by instrument. Five Tesla trades show as their
-- own row with their own win rate, while the totals at the top of the
-- page stay unchanged.
create view public.symbol_stats as
select
  user_id,
  symbol,
  asset_class,
  count(*)                                 as trades,
  count(*) filter (where outcome = 'win')  as wins,
  count(*) filter (where outcome = 'loss') as losses,
  count(*) filter (where outcome = 'flat') as flats,
  round(100.0 * count(*) filter (where outcome = 'win')
        / nullif(count(*) filter (where outcome in ('win','loss')), 0), 1)
                                           as win_rate_pct,
  sum(pnl)                                 as net_pnl,
  round(avg(r_multiple), 2)                as avg_r,
  max(closed_at)                           as last_traded_at
from public.trades_with_r
group by user_id, symbol, asset_class;
