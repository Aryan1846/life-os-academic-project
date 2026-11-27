import { createClient } from "@/lib/supabase/server";
import { decisionInputSchema, validateReady } from "@/lib/decision/schema";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await supabase.from("decisions").select("id,title,status,created_at,updated_at,last_error").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(100);
  if (error) return NextResponse.json({ error: "Could not load decisions" }, { status: 500 });
  return NextResponse.json({ decisions: data });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = decisionInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid decision input", details: parsed.error.flatten() }, { status: 400 });
  const { data, error } = await supabase.from("decisions").insert({ user_id: user.id, title: parsed.data.title, problem_description: parsed.data.problemDescription, input_snapshot: parsed.data, status: "draft" }).select("id,status").single();
  if (error) return NextResponse.json({ error: "Could not save decision; apply the Phase 5 migration" }, { status: 500 });
  if (data && !validateReady(parsed.data)) {
    const { error: transitionError } = await supabase.from("decisions").update({ status: "criteria_defined" }).eq("id", data.id).eq("user_id", user.id).eq("status", "draft");
    if (transitionError) return NextResponse.json({ error: "Draft saved, but criteria could not be prepared" }, { status: 500 });
    data.status = "criteria_defined";
  }
  return NextResponse.json({ decision: data }, { status: 201 });
}
