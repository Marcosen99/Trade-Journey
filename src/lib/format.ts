/** Prices span 8 orders of magnitude here, so precision has to scale. */
export function money(n: number, currency = "USD"): string {
  const abs = Math.abs(n);
  /* Crypto needs eight decimals at $0.00000351, but zero is also below
     the cent threshold and must not render as $0.00000000. */
  const digits = abs === 0 ? 2 : abs >= 1 ? 2 : abs >= 0.01 ? 4 : 8;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n);
}

export function num(n: number, digits = 2): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n);
}

export function pct(n: number): string {
  return `${n >= 0 ? "+" : ""}${num(n)}%`;
}

export function compact(n: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

export function clock(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
