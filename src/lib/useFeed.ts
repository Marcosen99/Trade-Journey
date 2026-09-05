"use client";

import { useCallback, useEffect, useState } from "react";

type Feed<T> = {
  data: T | null;
  error: string | null;
  loading: boolean;
  updatedAt: Date | null;
};

/** Polls a JSON endpoint and keeps the last good payload on screen
    when a refresh fails, so a blip never blanks the dashboard. */
export function useFeed<T>(url: string, intervalMs: number): Feed<T> {
  const [state, setState] = useState<Feed<T>>({
    data: null,
    error: null,
    loading: true,
    updatedAt: null,
  });

  const load = useCallback(async () => {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data = (await res.json()) as T;
      setState({ data, error: null, loading: false, updatedAt: new Date() });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "Unknown error",
      }));
    }
  }, [url]);

  useEffect(() => {
    load();
    const id = setInterval(load, intervalMs);
    return () => clearInterval(id);
  }, [load, intervalMs]);

  return state;
}
