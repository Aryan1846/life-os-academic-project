import type { SupabaseClient } from "@supabase/supabase-js";
import type { DecisionInput } from "./schema";

const permissions = { goals: "share_goals", finance: "share_finance", health: "share_health", career: "share_career" } as const;
export type ContextArea = keyof typeof permissions;

export function permittedAreas(requested: ContextArea[], settings: Record<string, unknown>, consent: boolean): ContextArea[] {
  if (!consent) return [];
  return requested.filter(area => settings[permissions[area]] === true);
}

export async function collectPermittedContext(supabase: SupabaseClient, userId: string, input: DecisionInput): Promise<Record<string, unknown>> {
  if (!input.contextAreas.length) return {};
  if (!input.consentExternal) throw new Error("Personal context requires explicit consent");
  const { data: profile, error } = await supabase.from("profiles").select("privacy_settings").eq("id", userId).single();
  if (error || !profile) throw new Error("Could not verify privacy settings");
  const allowed = permittedAreas(input.contextAreas, profile.privacy_settings || {}, input.consentExternal);
  if (allowed.length !== input.contextAreas.length) throw new Error("A requested context area is disabled in privacy settings");
  const context: Record<string, unknown> = {};
  const since = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  for (const area of allowed) {
    if (area === "goals") {
      const { count, error: queryError } = await supabase.from("goals").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("status", "active");
      if (queryError) throw new Error("Could not load permitted goal context");
      context.goals = { activeCount: count || 0 };
    } else if (area === "finance") {
      let income = 0; let expenses = 0;
      for (let offset = 0; ; offset += 1000) {
        const { data, error: queryError } = await supabase.from("transactions").select("type,amount").eq("user_id", userId).gte("transaction_date", since).range(offset, offset + 999);
        if (queryError) throw new Error("Could not load permitted finance context");
        for (const row of data || []) { if (row.type === "income") income += Number(row.amount); else if (row.type === "expense") expenses += Number(row.amount); }
        if (!data || data.length < 1000) break;
      }
      context.finance = { period: "last 30 days", income, expenses };
    } else if (area === "health") {
      let activityMinutes = 0; let sleepTotal = 0; let sleepNights = 0;
      for (let offset = 0; ; offset += 1000) {
        const { data, error: queryError } = await supabase.from("health_activities").select("duration_minutes,sleep_hours").eq("user_id", userId).gte("activity_date", since).range(offset, offset + 999);
        if (queryError) throw new Error("Could not load permitted health context");
        for (const row of data || []) { activityMinutes += Number(row.duration_minutes || 0); if (row.sleep_hours != null) { sleepTotal += Number(row.sleep_hours); sleepNights++; } }
        if (!data || data.length < 1000) break;
      }
      context.health = { period: "last 30 days", activityMinutes, averageSleepHours: sleepNights ? sleepTotal / sleepNights : null };
    } else {
      const { count, error: queryError } = await supabase.from("career_items").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("status", "in_progress");
      if (queryError) throw new Error("Could not load permitted career context");
      context.career = { inProgressCount: count || 0 };
    }
  }
  return context;
}
