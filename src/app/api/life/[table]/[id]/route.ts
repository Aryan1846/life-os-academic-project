import { createClient } from "@/lib/supabase/server";
import { isPhase3Table, validatePhase3 } from "@/lib/phase3/config";
import { NextResponse } from "next/server";
import { z } from "zod";
import { syncBudgetAlerts } from "@/lib/phase3/budgets";

type Context = { params: Promise<{ table: string; id: string }> };

async function contextFor(ctx: Context) {
  const { table, id } = await ctx.params;
  if (!isPhase3Table(table) || !z.string().uuid().safeParse(id).success) return null;
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  return { table, id, supabase, user: error ? null : user };
}

export async function PATCH(request: Request, ctx: Context) {
  const state = await contextFor(ctx);
  if (!state) return NextResponse.json({ error: "Unknown item" }, { status: 404 });
  if (!state.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = validatePhase3(state.table, await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error }, { status: 400 });
  if (state.table === "reminders" && parsed.data.entity_type && parsed.data.entity_id) {
    const linkedTable = { event: "events", task: "tasks", contact: "contacts" }[parsed.data.entity_type as "event" | "task" | "contact"];
    const { data } = await state.supabase.from(linkedTable).select("id").eq("id", parsed.data.entity_id).eq("user_id", state.user.id).maybeSingle();
    if (!data) return NextResponse.json({ error: "Linked item not found" }, { status: 400 });
  }
  const update = state.table === "reminders" ? { ...parsed.data, is_sent: false } : parsed.data;
  const { data, error } = await state.supabase.from(state.table).update(update).eq("id", state.id).eq("user_id", state.user.id).select().maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Item not found" }, { status: 404 });
  if (state.table === "transactions" || state.table === "budgets") await syncBudgetAlerts(state.supabase, state.user.id);
  return NextResponse.json({ item: data });
}

export async function DELETE(_request: Request, ctx: Context) {
  const state = await contextFor(ctx);
  if (!state) return NextResponse.json({ error: "Unknown item" }, { status: 404 });
  if (!state.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await state.supabase.from(state.table).delete().eq("id", state.id).eq("user_id", state.user.id).select("id").maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Item not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
