import { NextResponse } from "next/server";
import { coinMeta } from "@/lib/coinMeta";

/* ─── Search runs locally, not against the API ───────────────────────
   Hitting an upstream search endpoint per keystroke would burn the
   whole Twelve Data day allowance in a few minutes of typing. So the
   full instrument list is pulled once, kept in memory for a day, and
   filtered here. Typing then costs nothing at all. */

export type SymbolHit = {
  symbol: string;
  name: string;
  assetClass: "stock" | "etf" | "crypto";
  exchange?: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/* The US list runs to thousands of tickers, most of them illiquid
   shells. Restricting to the main venues keeps the results useful. */
const MAJOR_ONLY = new Set(["NASDAQ", "NYSE", "NYSE ARCA", "NYSE American", "AMEX", "BATS"]);

let index: { at: number; rows: SymbolHit[] } | null = null;

async function twelve(path: string): Promise<Record<string, unknown>[]> {
  const key = process.env.TWELVE_DATA_API_KEY;
  if (!key) return [];
  const res = await fetch(
    `https://api.twelvedata.com/${path}?country=United States&apikey=${key}`,
    { cache: "no-store" }
  );
  if (!res.ok) return [];
  const json = await res.json();
  return Array.isArray(json?.data) ? json.data : [];
}

async function equities(): Promise<SymbolHit[]> {
  const [stocks, etfs] = await Promise.all([twelve("stocks"), twelve("etf")]);

  const map = (rows: Record<string, unknown>[], assetClass: "stock" | "etf") =>
    rows.flatMap((r) => {
      const symbol = String(r.symbol ?? "");
      const name = String(r.name ?? "");
      const exchange = String(r.exchange ?? "");
      if (!symbol || !name || !MAJOR_ONLY.has(exchange)) return [];
      return [{ symbol, name, assetClass, exchange }];
    });

  return [...map(stocks, "stock"), ...map(etfs, "etf")];
}

async function crypto(): Promise<SymbolHit[]> {
  const map = await coinMeta();
  return [...map.values()].map((c) => ({
    symbol: c.symbol,
    name: c.name,
    assetClass: "crypto" as const,
  }));
}

async function build(): Promise<SymbolHit[]> {
  if (index && Date.now() - index.at < DAY_MS) return index.rows;

  const [eq, cx] = await Promise.all([
    equities().catch(() => []),
    crypto().catch(() => []),
  ]);

  const rows = [...cx, ...eq];

  /* Never replace a working index with an empty one — a single upstream
     hiccup should not leave the picker dead until tomorrow. */
  if (!rows.length && index) return index.rows;

  index = { at: Date.now(), rows };
  return rows;
}

/** Exact ticker first, then ticker prefix, then name. */
function rank(q: string, hit: SymbolHit): number {
  const sym = hit.symbol.toUpperCase();
  const name = hit.name.toUpperCase();
  if (sym === q) return 0;
  if (sym.startsWith(q)) return 1;
  if (name.startsWith(q)) return 2;
  if (name.includes(q)) return 3;
  if (sym.includes(q)) return 4;
  return -1;
}

export async function GET(request: Request) {
  const q = (new URL(request.url).searchParams.get("q") ?? "")
    .trim()
    .toUpperCase();

  if (q.length < 1) return NextResponse.json({ results: [] });

  try {
    const rows = await build();

    const results = rows
      .map((hit) => ({ hit, score: rank(q, hit) }))
      .filter((r) => r.score >= 0)
      .sort((a, b) => a.score - b.score)
      .slice(0, 10)
      .map((r) => r.hit);

    return NextResponse.json({ results, indexed: rows.length });
  } catch (err) {
    console.error("symbols route:", err);
    return NextResponse.json({ results: [], error: "Lookup unavailable" });
  }
}
