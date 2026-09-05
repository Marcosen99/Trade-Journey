import { pct } from "@/lib/format";

/** One place decides what green and red mean, so they never drift. */
export function Delta({
  value,
  size = "base",
}: {
  value: number;
  size?: "sm" | "base" | "lg";
}) {
  const up = value >= 0;
  const scale =
    size === "lg" ? "text-base" : size === "sm" ? "text-xs" : "text-sm";
  return (
    <span
      className={`tabular ${scale} ${up ? "text-gain" : "text-loss"}`}
      aria-label={`${up ? "up" : "down"} ${Math.abs(value).toFixed(2)} percent`}
    >
      {pct(value)}
    </span>
  );
}
