import { adminContext } from "@/lib/admin/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET() {
  const ctx = await adminContext();
  if (!ctx.user) return NextResponse.json({ error: ctx.status === 401 ? "Unauthorized" : "Forbidden" }, { status: ctx.status });
  const admin = createAdminClient();
  const users: { id: string; email?: string; created_at: string; last_sign_in_at?: string }[] = [];
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return NextResponse.json({ error: "Could not list accounts" }, { status: 500 });
    users.push(...data.users.map(user => ({ id: user.id, email: user.email, created_at: user.created_at, last_sign_in_at: user.last_sign_in_at })));
    if (data.users.length < 1000) break;
  }
  const since = new Date(Date.now() - 2 * 60000).toISOString();
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString();
  const [{ data: profiles, error: profilesError }, { data: settings, error: settingsError }, { data: logs, error: logsError }, { count: activeSessions, error: presenceError }, { count: failedLogins, error: failedError }, { count: successfulLogins, error: successError }] = await Promise.all([
    ctx.supabase.from("profiles").select("id,full_name,role,is_active,created_at").order("created_at", { ascending: false }),
    ctx.supabase.from("system_settings").select("key,value,description,updated_at").in("key", ["registration_enabled", "maintenance_mode"]),
    ctx.supabase.from("audit_logs").select("id,actor_id,action,entity_type,entity_id,details,created_at").order("created_at", { ascending: false }).limit(100),
    ctx.supabase.from("session_presence").select("user_id", { count: "exact", head: true }).gte("last_seen", since),
    ctx.supabase.from("audit_logs").select("id", { count: "exact", head: true }).eq("action", "auth.login_failed").gte("created_at", monthAgo),
    ctx.supabase.from("audit_logs").select("id", { count: "exact", head: true }).eq("action", "auth.login_succeeded").gte("created_at", monthAgo),
  ]);
  if (profilesError || settingsError || logsError || presenceError || failedError || successError) return NextResponse.json({ error: "Could not load administration data" }, { status: 500 });
  const profileMap = new Map((profiles || []).map(profile => [profile.id, profile]));
  const attempts = (failedLogins || 0) + (successfulLogins || 0);
  return NextResponse.json({ users: users.map(user => ({ ...user, profile: profileMap.get(user.id) || null })), settings, logs, metrics: { accounts: users.length, activeAccounts: (profiles || []).filter(profile => profile.is_active).length, recentlyActiveUsers: activeSessions || 0, loginFailureRate: attempts ? Math.round((failedLogins || 0) / attempts * 100) : null, loginAttempts: attempts } });
}
