import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const store = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (list) => {
          /* Server Components cannot set cookies. The middleware
             refreshes the session instead, so swallowing this is safe. */
          try {
            list.forEach(({ name, value, options }) =>
              store.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );
}

/** True when Supabase has not been configured yet. */
export function isConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
