"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error: string | null; ok: boolean; savedAt: number };

const ASSET_CLASSES = ["crypto", "stock", "etf", "commodity", "forex"];
const REASONS = ["target", "stop", "manual", "expired"];

export async function addTrade(
  _prev: FormState,
  data: FormData
): Promise<FormState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session expired. Sign in again.", ok: false, savedAt: 0 };

  const symbol = String(data.get("symbol") ?? "").trim().toUpperCase();
  const assetClass = String(data.get("asset_class") ?? "");
  const side = String(data.get("side") ?? "long");
  const reason = String(data.get("reason") ?? "");
  const pnlRaw = String(data.get("pnl") ?? "").replace(",", ".").trim();
  const riskRaw = String(data.get("risk_amount") ?? "").replace(",", ".").trim();
  const closedAt = String(data.get("closed_at") ?? "");
  const notes = String(data.get("notes") ?? "").trim();

  if (!symbol) return { error: "Enter a symbol.", ok: false, savedAt: 0 };
  if (!ASSET_CLASSES.includes(assetClass))
    return { error: "Pick an asset class.", ok: false, savedAt: 0 };

  /* Zero is a valid P&L, so a plain falsy check would reject a
     break-even trade. Test for a parseable number instead. */
  const pnl = Number(pnlRaw);
  if (pnlRaw === "" || !Number.isFinite(pnl))
    return { error: "P&L has to be a number. Use a minus sign for a loss.", ok: false, savedAt: 0 };

  let risk: number | null = null;
  if (riskRaw !== "") {
    risk = Number(riskRaw);
    if (!Number.isFinite(risk) || risk <= 0)
      return { error: "Risk has to be a positive number, or left blank.", ok: false, savedAt: 0 };
  }

  const { error } = await supabase.from("trades").insert({
    user_id: user.id,
    symbol,
    asset_class: assetClass,
    side: side === "short" ? "short" : "long",
    pnl,
    risk_amount: risk,
    reason: REASONS.includes(reason) ? reason : null,
    closed_at: closedAt ? new Date(closedAt).toISOString() : new Date().toISOString(),
    notes: notes || null,
  });

  if (error) return { error: error.message, ok: false, savedAt: 0 };

  revalidatePath("/trades");
  return { error: null, ok: true, savedAt: Date.now() };
}

export async function deleteTrade(id: string) {
  const supabase = await createClient();
  /* No user check needed: row-level security refuses to delete a row
     this account does not own, whatever id is passed in. */
  await supabase.from("trades").delete().eq("id", id);
  revalidatePath("/trades");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
}
