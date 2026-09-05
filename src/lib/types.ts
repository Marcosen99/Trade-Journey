export type Quote = {
  symbol: string;      // "BTC", "SPY", "XAU/USD"
  name: string;        // "Bitcoin"
  price: number;
  changePct: number;   // 24h % change
  volume?: number;     // 24h quote volume, USD
  spark?: number[];    // recent closes, oldest → newest
  image?: string;      // logo URL, crypto only
};

export type CryptoPayload = {
  pinned: Quote[];
  gainers: Quote[];
  losers: Quote[];
  updatedAt: string;
};
