import { adminContext } from "@/lib/admin/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { z } from "zod";

export async function PATCH(request: Request) {
  const ctx = await adminContext();
  if (!ctx.user) return NextResponse.json({ error: ctx.status === 401 ? "Unauthorized" : "Forbidden" }, { status: ctx.status });
  const parsed = z.object({ key: z.enum(["maintenance_mode", "registration_enabled"]), value: z.boolean() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid setting" }, { status: 400 });
  const { data, error } = await ctx.supabase.from("system_settings").update({ value: parsed.data.value, updated_at: new Date().toISOString() }).eq("key", parsed.data.key).select("key,value").maybeSingle();
  if (error || !data) return NextResponse.json({ error: "Could not update setting; apply the Phase 4 migration" }, { status: 500 });
  await createAdminClient().from("audit_logs").insert({ actor_id: ctx.user.id, action: "admin.setting_updated", entity_type: "system_setting", details: { key: parsed.data.key, value: parsed.data.value } });
  return NextResponse.json({ setting: data });
}
