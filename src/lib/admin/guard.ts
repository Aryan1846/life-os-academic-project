import "server-only";
import { createClient } from "@/lib/supabase/server";

export async function adminContext() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { status: 401 as const, supabase, user: null };
  const { data: profile } = await supabase.from("profiles").select("role,is_active").eq("id", user.id).single();
  if (profile?.role !== "admin" || !profile.is_active) return { status: 403 as const, supabase, user: null };
  return { status: 200 as const, supabase, user };
}
