import { createClient } from "@/lib/supabase/server";
import { decisionInputSchema, validateReady } from "@/lib/decision/schema";
import { collectPermittedContext } from "@/lib/decision/context";
import { computeDeterministicRanking } from "@/lib/decision/scoring";
import { evaluateQualitative, getAIConfig } from "@/lib/ai/decision-evaluator";
import { NextResponse } from "next/server";
import { z } from "zod";

type Route = { params: Promise<{ id: string }> };

async function runEvaluation(route: Route, onToken?: (text: string) => void) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await route.params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  let { data: decision } = await supabase.from("decisions").select("status,input_snapshot,evaluation_started_at").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (!decision) return NextResponse.json({ error: "Decision not found" }, { status: 404 });
  if (decision.status === "evaluating" && decision.evaluation_started_at && new Date(decision.evaluation_started_at).getTime() < Date.now() - 90000) {
    await supabase.from("decisions").update({ status: "context_attached", last_error: "Previous evaluation was interrupted; retry when ready", evaluation_started_at: null }).eq("id", id).eq("user_id", user.id).eq("status", "evaluating");
    ({ data: decision } = await supabase.from("decisions").select("status,input_snapshot,evaluation_started_at").eq("id", id).eq("user_id", user.id).maybeSingle());
  }
  if (!decision || decision.status !== "context_attached") return NextResponse.json({ error: "Prepare the decision before evaluation, or wait for the current evaluation" }, { status: 409 });
  const input = decisionInputSchema.safeParse(decision.input_snapshot);
  if (!input.success || validateReady(input.data)) return NextResponse.json({ error: "Decision inputs are incomplete" }, { status: 400 });
  let context: Record<string, unknown>;
  try { context = await collectPermittedContext(supabase, user.id, input.data); }
  catch (cause) { return NextResponse.json({ error: cause instanceof Error ? cause.message : "Context unavailable" }, { status: 403 }); }
  let math: ReturnType<typeof computeDeterministicRanking>;
  try { math = computeDeterministicRanking(input.data.alternatives.map((item, sort_order) => ({ ...item, decision_id: id, sort_order })), input.data.criteria.map(item => ({ ...item, decision_id: id })), input.data.scores); }
  catch (cause) { return NextResponse.json({ error: cause instanceof Error ? cause.message : "Could not score decision" }, { status: 400 }); }
  let config: ReturnType<typeof getAIConfig>;
  try { config = getAIConfig(); } catch { return NextResponse.json({ error: "AI provider configuration is invalid" }, { status: 503 }); }
  if (config.provider !== "mock") {
    if (!config.apiKey) return NextResponse.json({ error: `Configure ${config.provider === "gemini" ? "GEMINI_API_KEY" : "OPENAI_API_KEY"} or use AI_PROVIDER=mock` }, { status: 503 });
    const { data: allowed, error: quotaError } = await supabase.rpc("claim_decision_ai_quota");
    if (quotaError) return NextResponse.json({ error: "Could not check AI request quota" }, { status: 500 });
    if (!allowed) return NextResponse.json({ error: "AI evaluation limit reached; try again after the one-hour window" }, { status: 429 });
  }
  const { data: claimed, error: claimError } = await supabase.from("decisions").update({ status: "evaluating", evaluation_started_at: new Date().toISOString(), last_error: null }).eq("id", id).eq("user_id", user.id).eq("status", "context_attached").select("id").maybeSingle();
  if (claimError) return NextResponse.json({ error: "Could not start evaluation" }, { status: 500 });
  if (!claimed) return NextResponse.json({ error: "Evaluation is already in progress" }, { status: 409 });
  try {
    const qualitative = await evaluateQualitative(input.data, math, context, config, fetch, onToken);
    const { data: latest, error: versionError } = await supabase.from("decision_evaluations").select("version").eq("decision_id", id).order("version", { ascending: false }).limit(1).maybeSingle();
    if (versionError) throw new Error("Could not read evaluation history");
    const version = (latest?.version || 0) + 1;
    const prosCons = Object.fromEntries(qualitative.analysis.alternatives.map(item => [item.id, { pros: item.strengths, cons: item.weaknesses }]));
    const { data: evaluation, error: insertError } = await supabase.from("decision_evaluations").insert({
      decision_id: id, version, ai_provider: qualitative.provider, ai_model: qualitative.model,
      deterministic_scores: math.scoresByAlternative, ranking: math.ranking,
      ai_reasoning: qualitative.analysis.reasoning, pros_cons: prosCons,
      trade_off_analysis: qualitative.analysis.tradeOffAnalysis, analysis: qualitative.analysis,
      sensitivity: math.sensitivity, excluded: math.excluded, penalties: math.penalties, normalized_weights: math.normalizedWeights,
      input_snapshot: input.data, context_snapshot: context,
    }).select("id,version").single();
    if (insertError) throw new Error("Could not save evaluation history");
    const { error: finishError } = await supabase.from("decisions").update({ status: "evaluated", context_snapshot: context, evaluation_started_at: null, last_error: null, updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", user.id).eq("status", "evaluating");
    if (finishError) throw new Error("Evaluation saved but could not update decision status");
    return NextResponse.json({ evaluation, simulated: qualitative.simulated });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Evaluation failed";
    await supabase.from("decisions").update({ status: "context_attached", evaluation_started_at: null, last_error: message }).eq("id", id).eq("user_id", user.id).eq("status", "evaluating");
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function POST(request: Request, route: Route) {
  if (new URL(request.url).searchParams.get("stream") !== "1") return runEvaluation(route);
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: string, value: unknown) => controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(value)}\n\n`));
      send("progress", { message: "Computing deterministic scores" });
      void runEvaluation(route, token => send("token", { text: token })).then(async response => {
        const body = await response.json();
        send(response.ok ? "done" : "error", body);
      }).catch(() => send("error", { error: "Evaluation failed" })).finally(() => controller.close());
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" } });
}
