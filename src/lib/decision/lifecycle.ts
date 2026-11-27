export type DecisionState = "draft" | "criteria_defined" | "context_attached" | "evaluating" | "evaluated" | "closed";
const transitions: Record<DecisionState, DecisionState[]> = {
  draft: ["criteria_defined"],
  criteria_defined: ["context_attached", "draft"],
  context_attached: ["evaluating", "draft"],
  evaluating: ["evaluated", "context_attached"],
  evaluated: ["closed", "draft"],
  closed: ["draft"],
};
export function canTransition(from: DecisionState, to: DecisionState): boolean { return transitions[from]?.includes(to) || false; }
