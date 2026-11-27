import { describe, expect, it } from "vitest";
import { canTransition } from "./lifecycle";
import { decisionInputSchema, validateReady } from "./schema";

describe("decision lifecycle and readiness", () => {
  it("allows evaluation and revision while rejecting skipped states", () => {
    expect(canTransition("draft", "criteria_defined")).toBe(true);
    expect(canTransition("criteria_defined", "context_attached")).toBe(true);
    expect(canTransition("context_attached", "evaluating")).toBe(true);
    expect(canTransition("evaluating", "evaluated")).toBe(true);
    expect(canTransition("evaluated", "closed")).toBe(true);
    expect(canTransition("closed", "draft")).toBe(true);
    expect(canTransition("draft", "evaluated")).toBe(false);
  });
  it("requires complete scores and explicit context consent", () => {
    const input = decisionInputSchema.parse({ title: "Choose", problemDescription: "Choose a course carefully", alternatives: [], criteria: [], scores: [], contextAreas: ["health"], consentExternal: false });
    expect(validateReady(input)).toMatch(/two alternatives/);
  });
});
