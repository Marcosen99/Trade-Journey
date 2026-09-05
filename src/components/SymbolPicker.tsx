"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { SymbolHit } from "@/app/api/symbols/route";

const field =
  "mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-grape";

export function SymbolPicker({
  onPick,
}: {
  onPick: (assetClass: SymbolHit["assetClass"]) => void;
}) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SymbolHit[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const listId = useId();

  /* Debounced so a fast typist fires one request, not eight. The
     lookup is local to the server anyway, but there is no reason to
     make a round trip per character. */
  useEffect(() => {
    const q = query.trim();
    if (!q) return;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/symbols?q=${encodeURIComponent(q)}`);
        const json = await res.json();
        setHits(json.results ?? []);
        setActive(0);
      } catch {
        setHits([]);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function away(e: MouseEvent) {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, []);

  function choose(hit: SymbolHit) {
    setQuery(hit.symbol);
    onPick(hit.assetClass);
    setOpen(false);
  }

  function keys(e: React.KeyboardEvent) {
    if (!open || !visible.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % visible.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i - 1 + visible.length) % visible.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(visible[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  /* Derived rather than stored: an empty box has no results by
     definition, so there is nothing to synchronise in an effect. */
  const visible = query.trim() ? hits : [];

  return (
    <div ref={box} className="relative">
      <label className="block">
        <span className="text-xs text-muted">Symbol</span>
        <input
          name="symbol"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={keys}
          placeholder="Tesla, TSLA, BTC…"
          autoComplete="off"
          role="combobox"
          aria-expanded={open && visible.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          className={field}
        />
      </label>

      {open && visible.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-md border border-line bg-raised py-1 shadow-lg"
        >
          {visible.map((hit, i) => (
            <li key={`${hit.assetClass}-${hit.symbol}`}>
              <button
                type="button"
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(hit)}
                className={`flex w-full items-baseline gap-2 px-3 py-2 text-left ${
                  i === active ? "bg-surface" : ""
                }`}
              >
                <span className="shrink-0 text-sm font-medium">{hit.symbol}</span>
                <span className="min-w-0 flex-1 truncate text-xs text-muted">
                  {hit.name}
                </span>
                <span className="shrink-0 text-[10px] text-muted">
                  {hit.exchange ?? "crypto"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
