import { z } from "zod";

export const alternativeSchema = z.object({ id: z.string().uuid(), title: z.string().trim().min(1).max(120), description: z.string().max(1000).default("") }).strict();
export const criterionSchema = z.object({
  id: z.string().uuid(), name: z.string().trim().min(1).max(100), weight: z.number().finite().min(0).max(100),
  direction: z.enum(["benefit", "cost"]),
  hardConstraint: z.object({ operator: z.enum(["<=", ">="]), value: z.number().finite() }).strict().nullable().default(null),
  softConstraint: z.object({ operator: z.enum(["<=", ">="]), value: z.number().finite(), penalty: z.number().finite().min(0).max(10) }).strict().nullable().default(null),
}).strict();
export const scoreSchema = z.object({ alternativeId: z.string().uuid(), criterionId: z.string().uuid(), score: z.union([z.number().min(0).max(10), z.enum(["low", "medium", "high", "likert:1", "likert:2", "likert:3", "likert:4", "likert:5", ""])]), rawValue: z.number().finite().optional() }).strict();
export const decisionInputSchema = z.object({
  title: z.string().trim().min(1).max(160), problemDescription: z.string().trim().min(10).max(3000),
  alternatives: z.array(alternativeSchema).max(12), criteria: z.array(criterionSchema).max(12),
  scores: z.array(scoreSchema).max(144), contextAreas: z.array(z.enum(["goals", "finance", "health", "career"])).max(4),
  consentExternal: z.boolean(),
}).strict();
export type DecisionInput = z.infer<typeof decisionInputSchema>;

export function validateReady(input: DecisionInput): string | null {
  if (input.alternatives.length < 2 || input.criteria.length < 1) return "Add at least two alternatives and one criterion";
  if (new Set(input.alternatives.map(item => item.id)).size !== input.alternatives.length || new Set(input.criteria.map(item => item.id)).size !== input.criteria.length) return "Duplicate identifiers";
  if (new Set(input.alternatives.map(item => item.title.toLowerCase())).size !== input.alternatives.length) return "Alternative titles must be distinct";
  if (new Set(input.criteria.map(item => item.name.toLowerCase())).size !== input.criteria.length) return "Criterion names must be distinct";
  if (input.criteria.reduce((sum, item) => sum + item.weight, 0) <= 0) return "Set a positive criterion weight";
  if (input.contextAreas.length && !input.consentExternal) return "Explicit consent is required to attach personal context";
  if (new Set(input.contextAreas).size !== input.contextAreas.length) return "Duplicate context area";
  const needed = new Set(input.alternatives.flatMap(alt => input.criteria.map(criterion => `${alt.id}:${criterion.id}`)));
  for (const score of input.scores) {
    const key = `${score.alternativeId}:${score.criterionId}`;
    if (!needed.delete(key)) return "Duplicate or unrelated score";
    if (score.score === "") return "Score every alternative against each criterion";
    const criterion = input.criteria.find(item => item.id === score.criterionId);
    if ((criterion?.hardConstraint || criterion?.softConstraint) && score.rawValue === undefined) return `Set a measured constraint value for ${criterion.name}`;
  }
  return needed.size ? "Score every alternative against each criterion" : null;
}
