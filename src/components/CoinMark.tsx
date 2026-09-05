import Image from "next/image";

/* Not every Binance ticker exists in CoinGecko's top 500, so a missing
   logo has to look deliberate rather than broken. */
export function CoinMark({
  symbol,
  image,
  size = 20,
}: {
  symbol: string;
  image?: string;
  size?: number;
}) {
  if (!image) {
    return (
      <span
        aria-hidden="true"
        className="flex shrink-0 items-center justify-center rounded-full bg-raised text-[10px] text-muted"
        style={{ width: size, height: size }}
      >
        {symbol.slice(0, 1)}
      </span>
    );
  }

  return (
    <Image
      src={image}
      alt=""
      width={size}
      height={size}
      unoptimized
      className="shrink-0 rounded-full"
    />
  );
}
