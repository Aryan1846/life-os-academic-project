import { describe, expect, it, vi } from "vitest";
import { evaluateQualitative, validateAnalysis } from "./decision-evaluator";
import type { DecisionInput } from "@/lib/decision/schema";
import { computeDeterministicRanking } from "../decision/scoring";

const a = "11111111-1111-4111-8111-111111111111";
const b = "22222222-2222-4222-8222-222222222222";
const c = "33333333-3333-4333-8333-333333333333";
const input: DecisionInput = { title: "Decision", problemDescription: "Choose between two paths", alternatives: [{ id: a, title: "One", description: "" }, { id: b, title: "Two", description: "" }], criteria: [{ id: c, name: "Fit", weight: 1, direction: "benefit", hardConstraint: null, softConstraint: null }], scores: [{ alternativeId: a, criterionId: c, score: 8 }, { alternativeId: b, criterionId: c, score: 5 }], contextAreas: [], consentExternal: false };
const math = computeDeterministicRanking(input.alternatives.map((item, sort_order) => ({ ...item, decision_id: "d", sort_order })), input.criteria.map(item => ({ ...item, decision_id: "d" })), input.scores);

describe("structured decision analysis", () => {
  it("labels local simulation and retains deterministic scores outside the model", async () => {
    const result = await evaluateQualitative(input, math, {}, { provider: "mock", model: "local" });
    expect(result.simulated).toBe(true);
    expect(result.analysis.reasoning).toMatch(/Simulated/);
    expect(math.ranking[0].alternative_id).toBe(a);
  });
  it("rejects unknown alternative identifiers", () => {
    const analysis = { reasoning: "A sufficiently detailed explanation.", tradeOffAnalysis: "Enough trade-off detail", recommendation: "Consider option one", risks: [], uncertainties: [], nextSteps: [], alternatives: [{ id: a, strengths: [], weaknesses: [] }, { id: c, strengths: [], weaknesses: [] }] };
    expect(() => validateAnalysis(analysis, input)).toThrow(/missing or unrelated/);
  });
  it("fails visibly on provider errors instead of fabricating analysis", async () => {
    const transport = vi.fn(async () => new Response("unavailable", { status: 503 })) as unknown as typeof fetch;
    await expect(evaluateQualitative(input, math, {}, { provider: "openai", model: "test", apiKey: "test" }, transport)).rejects.toThrow(/HTTP 503/);
    await expect(evaluateQualitative(input, math, {}, { provider: "gemini", model: "test" })).rejects.toThrow(/Configure GEMINI_API_KEY/);
  });
  it("rejects invalid structured content and reports timeouts", async () => {
    const invalid = vi.fn(async () => Response.json({ choices: [{ message: { content: JSON.stringify({ reasoning: "incomplete" }) } }] })) as unknown as typeof fetch;
    await expect(evaluateQualitative(input, math, {}, { provider: "openai", model: "test", apiKey: "test" }, invalid)).rejects.toThrow(/schema validation/);
    const timeout = vi.fn(async () => { throw new DOMException("expired", "TimeoutError"); }) as unknown as typeof fetch;
    await expect(evaluateQualitative(input, math, {}, { provider: "gemini", model: "test", apiKey: "test" }, timeout)).rejects.toThrow(/timed out/);
  });
  it("streams provider tokens and validates the assembled response", async () => {
    const simulated = await evaluateQualitative(input, math, {}, { provider: "mock", model: "local" });
    const serialized = JSON.stringify(simulated.analysis);
    const halves = [serialized.slice(0, 60), serialized.slice(60)];
    const body = halves.map(text => `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`).join("");
    const transport = vi.fn(async () => new Response(body, { headers: { "Content-Type": "text/event-stream" } })) as unknown as typeof fetch;
    let received = "";
    const result = await evaluateQualitative(input, math, {}, { provider: "openai", model: "test", apiKey: "test" }, transport, token => { received += token; });
    expect(received).toBe(serialized);
    expect(result.analysis).toEqual(simulated.analysis);
    expect(result.simulated).toBe(false);
  });
});
