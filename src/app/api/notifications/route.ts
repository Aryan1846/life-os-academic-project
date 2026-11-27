import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { deliverCalendarAndTaskNotices } from "@/lib/notifications/due";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await supabase.from("session_presence").upsert({ user_id: user.id, last_seen: new Date().toISOString() }, { onConflict: "user_id" });
  const { error: deliveryError } = await supabase.rpc("deliver_due_reminders");
  if (deliveryError) return NextResponse.json({ error: deliveryError.message }, { status: 500 });
  try { await deliverCalendarAndTaskNotices(supabase, user.id); }
  catch { return NextResponse.json({ error: "Could not deliver upcoming notifications" }, { status: 500 }); }
  const params = new URL(request.url).searchParams;
  const offset = z.coerce.number().int().min(0).max(10000).safeParse(params.get("offset") || 0);
  const limit = z.coerce.number().int().min(1).max(100).safeParse(params.get("limit") || 20);
  if (!offset.success || !limit.success) return NextResponse.json({ error: "Invalid pagination" }, { status: 400 });
  const [{ data, count, error }, { count: unread, error: countError }] = await Promise.all([
    supabase.from("notifications").select("id,type,title,message,is_read,entity_type,entity_id,created_at", { count: "exact" }).eq("user_id", user.id).order("created_at", { ascending: false }).range(offset.data, offset.data + limit.data - 1),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("is_read", false),
  ]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (countError) return NextResponse.json({ error: countError.message }, { status: 500 });
  return NextResponse.json({ notifications: data, total: count || 0, unread: unread || 0 });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = z.object({ id: z.string().uuid(), is_read: z.boolean() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid notification" }, { status: 400 });
  const { error } = await supabase.from("notifications").update({ is_read: parsed.data.is_read }).eq("id", parsed.data.id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { error } = await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
