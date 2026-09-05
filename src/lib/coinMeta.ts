/* Shared coin metadata: proper names and logo URLs, keyed by ticker.
   Both the symbol picker and the movers board read from this one memo,
   so the whole app costs two CoinGecko calls a day rather than two per
   feature. */

export type CoinMeta = { symbol: string; name: string; image: string };

const DAY_MS = 24 * 60 * 60 * 1000;
const PAGES = [1, 2]; // top 500 by market cap

let memo: { at: number; map: Map<string, CoinMeta> } | null = null;

export async function coinMeta(): Promise<Map<string, CoinMeta>> {
  if (memo && Date.now() - memo.at < DAY_MS) return memo.map;

  const map = new Map<string, CoinMeta>();

  try {
    for (const page of PAGES) {
      /* Next's data cache is shared across serverless instances, while
         the memo below is not. On a single machine the memo is enough;
         on Vercel every cold start would otherwise hit CoinGecko again
         and the keyless allowance is per IP, shared with every other
         deployment on that egress address. This page is well under the
         2 MB the data cache accepts, so it can live there. */
      const res = await fetch(
        `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=${page}`,
        { next: { revalidate: 86_400 } }
      );
      if (!res.ok) break;

      const list: { symbol?: string; name?: string; image?: string }[] =
        await res.json();

      for (const c of list) {
        const symbol = String(c.symbol ?? "").toUpperCase();
        /* Tickers collide — several coins claim BTC or SOL. The list
           arrives ordered by market cap, so the first one to claim a
           ticker is the one anybody actually means. */
        if (!symbol || map.has(symbol)) continue;
        map.set(symbol, {
          symbol,
          name: String(c.name ?? symbol),
          image: String(c.image ?? ""),
        });
      }
    }
  } catch {
    /* fall through to the staleness check below */
  }

  /* Never replace a working map with an empty one over one bad night. */
  if (!map.size && memo) return memo.map;

  memo = { at: Date.now(), map };
  return map;
}
