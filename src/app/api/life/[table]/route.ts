import { createClient } from "@/lib/supabase/server";
import { isPhase3Table, validatePhase3 } from "@/lib/phase3/config";
import { NextResponse } from "next/server";
import { syncBudgetAlerts } from "@/lib/phase3/budgets";

type Context = { params: Promise<{ table: string }> };

async function contextFor(ctx: Context) {
  const { table } = await ctx.params;
  if (!isPhase3Table(table)) return null;
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  return { table, supabase, user: error ? null : user };
}

export async function GET(_request: Request, ctx: Context) {
  const state = await contextFor(ctx);
  if (!state) return NextResponse.json({ error: "Unknown module" }, { status: 404 });
  if (!state.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await state.supabase.from(state.table).select("*").eq("user_id", state.user.id).order("created_at", { ascending: false }).limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data });
}

export async function POST(request: Request, ctx: Context) {
  const state = await contextFor(ctx);
  if (!state) return NextResponse.json({ error: "Unknown module" }, { status: 404 });
  if (!state.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = validatePhase3(state.table, await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error }, { status: 400 });
  if (state.table === "reminders" && parsed.data.entity_type && parsed.data.entity_id) {
    const linkedTable = { event: "events", task: "tasks", contact: "contacts" }[parsed.data.entity_type as "event" | "task" | "contact"];
    const { data } = await state.supabase.from(linkedTable).select("id").eq("id", parsed.data.entity_id).eq("user_id", state.user.id).maybeSingle();
    if (!data) return NextResponse.json({ error: "Linked item not found" }, { status: 400 });
  }
  const { data, error } = await state.supabase.from(state.table).insert({ ...parsed.data, user_id: state.user.id }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (state.table === "transactions" || state.table === "budgets") await syncBudgetAlerts(state.supabase, state.user.id);
  return NextResponse.json({ item: data }, { status: 201 });
}
