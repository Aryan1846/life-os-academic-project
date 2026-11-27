import { adminContext } from "@/lib/admin/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { z } from "zod";

type Context = { params: Promise<{ id: string }> };
async function targetFor(ctx: Context) { const { id } = await ctx.params; return z.string().uuid().safeParse(id).success ? id : null; }
export async function PATCH(request: Request, route: Context) {
  const ctx = await adminContext();
  if (!ctx.user) return NextResponse.json({ error: ctx.status === 401 ? "Unauthorized" : "Forbidden" }, { status: ctx.status });
  const id = await targetFor(route);
  const parsed = z.object({ is_active: z.boolean() }).safeParse(await request.json().catch(() => null));
  if (!id || !parsed.success) return NextResponse.json({ error: "Invalid account update" }, { status: 400 });
  if (id === ctx.user.id) return NextResponse.json({ error: "Cannot change your own administrator account" }, { status: 400 });
  const { data: existing } = await ctx.supabase.from("profiles").select("role").eq("id", id).maybeSingle();
  if (!existing || existing.role === "admin") return NextResponse.json({ error: "Only standard accounts can be changed" }, { status: 400 });
  const { data, error } = await ctx.supabase.from("profiles").update({ is_active: parsed.data.is_active }).eq("id", id).select("id,is_active").maybeSingle();
  if (error || !data) return NextResponse.json({ error: "Could not update account" }, { status: 500 });
  await createAdminClient().from("audit_logs").insert({ actor_id: ctx.user.id, action: parsed.data.is_active ? "admin.account_enabled" : "admin.account_disabled", entity_type: "user", entity_id: id });
  return NextResponse.json({ user: data });
}
export async function DELETE(request: Request, route: Context) {
  const ctx = await adminContext();
  if (!ctx.user) return NextResponse.json({ error: ctx.status === 401 ? "Unauthorized" : "Forbidden" }, { status: ctx.status });
  const id = await targetFor(route);
  const parsed = z.object({ confirmation: z.literal("DELETE") }).safeParse(await request.json().catch(() => null));
  if (!id || !parsed.success) return NextResponse.json({ error: "Type DELETE to confirm account removal" }, { status: 400 });
  if (id === ctx.user.id) return NextResponse.json({ error: "Cannot remove your own administrator account" }, { status: 400 });
  const { data: existing } = await ctx.supabase.from("profiles").select("role").eq("id", id).maybeSingle();
  if (!existing || existing.role === "admin") return NextResponse.json({ error: "Only standard accounts can be removed" }, { status: 400 });
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ error: "Could not remove account" }, { status: 500 });
  await admin.from("audit_logs").insert({ actor_id: ctx.user.id, action: "admin.account_deleted", entity_type: "user", entity_id: id });
  return NextResponse.json({ success: true });
}
