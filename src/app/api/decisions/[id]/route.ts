import { createClient } from "@/lib/supabase/server";
import { decisionInputSchema, validateReady } from "@/lib/decision/schema";
import { collectPermittedContext } from "@/lib/decision/context";
import { NextResponse } from "next/server";
import { z } from "zod";

type Route = { params: Promise<{ id: string }> };
const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("save"), input: decisionInputSchema }),
  z.object({ action: z.literal("prepare") }),
  z.object({ action: z.literal("revise") }),
  z.object({ action: z.literal("close"), finalChoice: z.string().uuid(), outcomeNotes: z.string().max(3000).default("") }),
]);

export async function GET(_request: Request, route: Route) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await route.params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  const { data: decision, error } = await supabase.from("decisions").select("id,title,problem_description,status,input_snapshot,context_snapshot,final_choice,outcome_notes,last_error,evaluation_started_at,created_at,updated_at").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (error) return NextResponse.json({ error: "Could not load decision" }, { status: 500 });
  if (!decision) return NextResponse.json({ error: "Decision not found" }, { status: 404 });
  const { data: evaluations, error: evaluationError } = await supabase.from("decision_evaluations").select("id,version,ai_provider,ai_model,deterministic_scores,ranking,ai_reasoning,pros_cons,trade_off_analysis,analysis,sensitivity,excluded,penalties,normalized_weights,input_snapshot,context_snapshot,final_choice,outcome_notes,evaluated_at").eq("decision_id", id).order("version", { ascending: false });
  if (evaluationError) return NextResponse.json({ error: "Could not load decision history" }, { status: 500 });
  return NextResponse.json({ decision, evaluations });
}

export async function PATCH(request: Request, route: Route) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await route.params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid decision action", details: parsed.error.flatten() }, { status: 400 });
  const { data: decision } = await supabase.from("decisions").select("status,input_snapshot").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (!decision) return NextResponse.json({ error: "Decision not found" }, { status: 404 });
  const action = parsed.data;
  let updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (action.action === "save") {
    if (!["draft", "criteria_defined"].includes(decision.status)) return NextResponse.json({ error: "Revise the decision before editing" }, { status: 409 });
    updates = { ...updates, title: action.input.title, problem_description: action.input.problemDescription, input_snapshot: action.input, status: validateReady(action.input) ? "draft" : "criteria_defined", context_snapshot: null, last_error: null };
  } else if (action.action === "prepare") {
    if (decision.status !== "criteria_defined") return NextResponse.json({ error: "Save complete criteria first" }, { status: 409 });
    const input = decisionInputSchema.safeParse(decision.input_snapshot);
    if (!input.success || validateReady(input.data)) return NextResponse.json({ error: "Decision inputs are incomplete" }, { status: 400 });
    let context: Record<string, unknown>;
    try { context = await collectPermittedContext(supabase, user.id, input.data); }
    catch (cause) { return NextResponse.json({ error: cause instanceof Error ? cause.message : "Context unavailable" }, { status: 403 }); }
    updates = { ...updates, status: "context_attached", context_snapshot: context, last_error: null };
  } else if (action.action === "revise") {
    if (!["criteria_defined", "context_attached", "evaluated", "closed"].includes(decision.status)) return NextResponse.json({ error: "Decision cannot be revised now" }, { status: 409 });
    updates = { ...updates, status: "draft", context_snapshot: null, final_choice: null, outcome_notes: null, last_error: null };
  } else {
    if (decision.status !== "evaluated") return NextResponse.json({ error: "Evaluate before closing" }, { status: 409 });
    const input = decisionInputSchema.safeParse(decision.input_snapshot);
    if (!input.success || !input.data.alternatives.some(item => item.id === action.finalChoice)) return NextResponse.json({ error: "Choose one of your alternatives" }, { status: 400 });
    const { data: latest, error: latestError } = await supabase.from("decision_evaluations").select("id").eq("decision_id", id).order("version", { ascending: false }).limit(1).maybeSingle();
    if (latestError || !latest) return NextResponse.json({ error: "Could not locate evaluation history" }, { status: 500 });
    const { error: historyError } = await supabase.from("decision_evaluations").update({ final_choice: action.finalChoice, outcome_notes: action.outcomeNotes }).eq("id", latest.id).eq("decision_id", id);
    if (historyError) return NextResponse.json({ error: "Could not record final choice" }, { status: 500 });
    updates = { ...updates, status: "closed", final_choice: action.finalChoice, outcome_notes: action.outcomeNotes };
  }
  const { data, error } = await supabase.from("decisions").update(updates).eq("id", id).eq("user_id", user.id).eq("status", decision.status).select("id,status,context_snapshot").maybeSingle();
  if (error) return NextResponse.json({ error: "Could not update decision" }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Decision changed; reload and retry" }, { status: 409 });
  return NextResponse.json({ decision: data });
}
