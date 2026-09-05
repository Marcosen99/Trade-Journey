import { NextResponse } from "next/server";
import type { Quote } from "@/lib/types";

/* Twelve Data's free plan allows 800 credits/day and one credit is
   charged per symbol, so five symbols on a 10-minute cache costs
   ~720/day. Shorten the cache and you will run out before evening. */
const REVALIDATE = 600;

const SYMBOLS = [
  { symbol: "SPY", name: "S&P 500" },
  { symbol: "QQQ", name: "Nasdaq 100" },
  { symbol: "DIA", name: "Dow Jones" },
  { symbol: "XAU/USD", name: "Gold" },
  /* Twelve Data's free plan does not carry XAG/USD spot. SLV is an ETF
     holding physical silver, so its percentage move tracks spot closely
     — but the price shown is the fund's, not dollars per ounce. */
  { symbol: "SLV", name: "Silver" },
];

type TwelveQuote = {
  close?: string;
  percent_change?: string;
  status?: string;
  message?: string;
  code?: number;
};

export type MacroPayload = {
  items: Quote[];
  /* Symbols the API declined, with whatever reason it gave. Silently
     dropping these makes a missing instrument look like it was never
     requested, which is a miserable thing to debug. */
  failed: { symbol: string; name: string; message: string }[];
  updatedAt: string;
  configured: boolean;
};

export async function GET() {
  const key = process.env.TWELVE_DATA_API_KEY;

  if (!key) {
    return NextResponse.json<MacroPayload>({
      items: [],
      failed: [],
      updatedAt: new Date().toISOString(),
      configured: false,
    });
  }

  try {
    const list = SYMBOLS.map((s) => s.symbol).join(",");
    const res = await fetch(
      `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(list)}&apikey=${key}`,
      { next: { revalidate: REVALIDATE } }
    );
    if (!res.ok) throw new Error(`Twelve Data responded ${res.status}`);

    const raw = await res.json();

    /* With one symbol the API returns the quote directly; with several
       it returns an object keyed by symbol. Handle both. */
    const pick = (symbol: string): TwelveQuote =>
      SYMBOLS.length === 1 ? raw : (raw?.[symbol] ?? {});

    const items: Quote[] = [];
    const failed: MacroPayload["failed"] = [];

    for (const { symbol, name } of SYMBOLS) {
      const q = pick(symbol);
      if (q?.close) {
        items.push({
          symbol,
          name,
          price: Number(q.close),
          changePct: Number(q.percent_change ?? 0),
        });
      } else {
        failed.push({
          symbol,
          name,
          message:
            q?.message ??
            raw?.message ??
            "No price returned. This symbol may not be on your plan.",
        });
      }
    }

    return NextResponse.json<MacroPayload>({
      items,
      failed,
      updatedAt: new Date().toISOString(),
      configured: true,
    });
  } catch (err) {
    console.error("macro route:", err);
    return NextResponse.json({ error: "Macro feed unavailable" }, { status: 502 });
  }
}
