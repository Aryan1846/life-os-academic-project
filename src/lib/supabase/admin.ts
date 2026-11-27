import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Supabase Admin Client (Service Role)
 *
 * PRIVACY & SECURITY POLICY (docs/SPEC.md - ADM-PRIV):
 * - Service role key MUST only be used server-side for administrative account lifecycle,
 *   system-level configuration, and security audit logging.
 * - MUST NOT be used to snoop or query private user records (goals, tasks, health, finance,
 *   relationships, decisions) without legitimate, explicit user authorization.
 * - Fails securely if credentials are not configured in production.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (process.env.NODE_ENV === "production") {
    if (!url || !serviceKey || url.includes("placeholder") || serviceKey.includes("placeholder")) {
      throw new Error(
        "FATAL: Missing or placeholder Supabase production configuration for admin service client."
      );
    }
  }

  return createClient(
    url || "https://placeholder.supabase.co",
    serviceKey || "placeholder-service-key",
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
