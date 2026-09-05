"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(null);
    setNotice(null);

    if (!email.trim()) return setError("Enter your email address.");
    if (password.length < 8)
      return setError("Passwords need at least 8 characters.");

    setBusy(true);
    const supabase = createClient();

    const { error } =
      mode === "in"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    setBusy(false);

    if (error) return setError(error.message);

    if (mode === "up") {
      setNotice("Check your inbox to confirm the address, then sign in.");
      setMode("in");
      return;
    }

    router.push("/trades");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-sm px-5 py-16">
      <h1 className="text-xl font-semibold tracking-tight">
        {mode === "in" ? "Sign in" : "Create an account"}
      </h1>
      <p className="mt-1 text-sm text-muted">
        Your trade log is visible only to you.
      </p>

      <div className="mt-7 space-y-3">
        <label className="block">
          <span className="text-xs text-muted">Email</span>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError(null);
            }}
            className="mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-grape"
          />
        </label>

        <label className="block">
          <span className="text-xs text-muted">Password</span>
          <input
            type="password"
            autoComplete={mode === "in" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            className="mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-grape"
          />
        </label>
      </div>

      {error ? <p className="mt-3 text-sm text-loss">{error}</p> : null}
      {notice ? <p className="mt-3 text-sm text-gain">{notice}</p> : null}

      <button
        onClick={submit}
        disabled={busy}
        className="mt-5 w-full rounded-md bg-violet px-3 py-2.5 text-sm font-medium text-on-violet hover:bg-grape disabled:opacity-60"
      >
        {busy ? "Working…" : mode === "in" ? "Sign in" : "Create account"}
      </button>

      <button
        onClick={() => {
          setMode(mode === "in" ? "up" : "in");
          setError(null);
          setNotice(null);
        }}
        className="mt-4 w-full text-sm text-muted hover:text-ink"
      >
        {mode === "in"
          ? "No account yet? Create one"
          : "Already have an account? Sign in"}
      </button>
    </div>
  );
}
