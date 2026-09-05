import { NextResponse } from "next/server";
import type { CryptoPayload, Quote } from "@/lib/types";
import { coinMeta } from "@/lib/coinMeta";

/* Binance's public market-data mirror: no API key, no monthly quota,
   and one request returns every pair — which is what makes the
   winners/losers board possible on a free plan. */
const BINANCE = "https://data-api.binance.vision/api/v3";

const PINNED = [
  { pair: "BTCUSDT", symbol: "BTC", name: "Bitcoin" },
  { pair: "ETHUSDT", symbol: "ETH", name: "Ethereum" },
  { pair: "SOLUSDT", symbol: "SOL", name: "Solana" },
];

/** Leveraged and wrapped tokens dominate any naive % ranking. */
const JUNK = /(UP|DOWN|BULL|BEAR)USDT$/;

/* Stablecoins are liquid enough to clear any volume filter, so without
   this the losers board fills up with things sitting at −0.04%. */
const PEGGED = new Set([
  "USDC", "FDUSD", "TUSD", "BUSD", "DAI", "USDP", "USDD", "PYUSD",
  "RLUSD", "USD1", "USDE", "SUSDE", "EURI", "AEUR", "XUSD", "EUR",
  "GBP", "AUD", "TRY", "BRL", "JPY", "ARS", "ZAR", "MXN", "PLN",
  "RON", "CZK", "COP", "UAH", "NGN", "IDRT", "VAI", "USTC",
]);

const MIN_VOLUME = 15_000_000;

/* A "biggest mover" that moved 0.04% is not a mover. Requiring a real
   move also catches pegged assets that are not on the list above. */
const MIN_MOVE_PCT = 1;

const CACHE_MS = 60_000;

/* The full ticker response is ~2.5 MB, and Next's data cache refuses
   anything over 2 MB — so `next: { revalidate }` silently fails and
   every request goes back out to Binance. type=MINI trims the payload
   to the fields used here, and this module-level memo does the caching
   that Next declined to do. */
type Mini = {
  symbol: string;
  openPrice: string;
  lastPrice: string;
  quoteVolume: string;
};

let memo: { at: number; data: Mini[] } | null = null;

async function tickers(): Promise<Mini[]> {
  if (memo && Date.now() - memo.at < CACHE_MS) return memo.data;

  const res = await fetch(`${BINANCE}/ticker/24hr?type=MINI`, {
    cache: "no-store",
  });
  if (!res.ok) {
    if (memo) return memo.data; // serve stale rather than blank the board
    throw new Error(`Binance responded ${res.status}`);
  }

  const data: Mini[] = await res.json();
  memo = { at: Date.now(), data };
  return data;
}

/** MINI omits priceChangePercent, so derive it from the 24h open. */
function changePct(t: Mini): number {
  const open = Number(t.openPrice);
  if (!open) return 0;
  return ((Number(t.lastPrice) - open) / open) * 100;
}

async function sparkline(pair: string): Promise<number[]> {
  const res = await fetch(
    `${BINANCE}/klines?symbol=${pair}&interval=1h&limit=72`,
    { next: { revalidate: 300 } }
  );
  if (!res.ok) return [];
  const rows: string[][] = await res.json();
  return rows.map((r) => Number(r[4]));
}

export async function GET() {
  try {
    const [all, meta] = await Promise.all([tickers(), coinMeta()]);
    const byPair = new Map(all.map((t) => [t.symbol, t]));

    const pinned: Quote[] = await Promise.all(
      PINNED.map(async ({ pair, symbol, name }) => {
        const t = byPair.get(pair);
        return {
          symbol,
          name,
          price: Number(t?.lastPrice ?? 0),
          changePct: t ? changePct(t) : 0,
          volume: Number(t?.quoteVolume ?? 0),
          image: meta.get(symbol)?.image,
          spark: await sparkline(pair),
        };
      })
    );

    const liquid: Quote[] = all
      .filter((t) => t.symbol.endsWith("USDT") && !JUNK.test(t.symbol))
      .map((t) => {
        const symbol = t.symbol.replace(/USDT$/, "");
        const info = meta.get(symbol);
        return {
          symbol,
          /* Binance only knows tickers. CoinGecko supplies the name a
             human would recognise, when it has one. */
          name: info?.name ?? symbol,
          price: Number(t.lastPrice),
          changePct: changePct(t),
          volume: Number(t.quoteVolume),
          image: info?.image,
        };
      })
      .filter(
        (q) =>
          !PEGGED.has(q.symbol) &&
          (q.volume ?? 0) > MIN_VOLUME &&
          Math.abs(q.changePct) >= MIN_MOVE_PCT
      )
      .sort((a, b) => b.changePct - a.changePct);

    /* Take from each end. On a day when everything is green the losers
       list is legitimately short — better than padding it with noise. */
    const gainers = liquid.filter((q) => q.changePct > 0).slice(0, 6);
    const losers = liquid
      .filter((q) => q.changePct < 0)
      .slice(-6)
      .reverse();

    const payload: CryptoPayload = {
      pinned,
      gainers,
      losers,
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json(payload, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("crypto route:", err);
    return NextResponse.json(
      { error: "Market feed unavailable" },
      { status: 502 }
    );
  }
}
