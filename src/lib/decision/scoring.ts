import type { DecisionAlternative, DecisionCriterion, DeterministicScoreRecord } from "@/types";

export interface CriterionScoreInput {
  alternativeId: string;
  criterionId: string;
  score: number | string;
  rawValue?: number;
}

export interface DeterministicScoringResult {
  scoresByAlternative: Record<string, DeterministicScoreRecord>;
  ranking: { alternative_id: string; rank: number; total_score: number }[];
  normalizedWeights: Record<string, number>;
  excluded: Record<string, string[]>;
  penalties: Record<string, string[]>;
  sensitivity: { criterionId: string; currentWeight: number; tippingWeight: number | null; competingAlternativeId: string | null }[];
}

const round = (value: number) => Math.round(value * 1000) / 1000;

export function mapOrdinalScore(value: number | string): number {
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value < 0 || value > 10) throw new Error("Scores must be between 0 and 10");
    return value;
  }
  const label = value.trim().toLowerCase();
  if (label === "low") return 0;
  if (label === "medium") return 5;
  if (label === "high") return 10;
  const likert = /^likert:([1-5])$/.exec(label);
  if (likert) return (Number(likert[1]) - 1) * 2.5;
  throw new Error("Unknown ordinal score");
}

export function normalizeWeights(criteria: DecisionCriterion[]): Record<string, number> {
  if (!criteria.length) return {};
  const total = criteria.reduce((sum, criterion) => sum + criterion.weight, 0);
  if (!Number.isFinite(total) || total <= 0 || criteria.some(criterion => !Number.isFinite(criterion.weight) || criterion.weight < 0)) throw new Error("Criteria need positive finite weights");
  return Object.fromEntries(criteria.map(criterion => [criterion.id, criterion.weight / total]));
}

function sensitivity(
  ranking: DeterministicScoringResult["ranking"],
  criteria: DecisionCriterion[],
  adjusted: Record<string, Record<string, number>>,
  weights: Record<string, number>
): DeterministicScoringResult["sensitivity"] {
  const leader = ranking[0]?.alternative_id;
  if (!leader) return [];
  return criteria.map(criterion => {
    const currentWeight = weights[criterion.id];
    let tippingWeight: number | null = null;
    let competingAlternativeId: string | null = null;
    for (const contender of ranking.slice(1)) {
      const differenceAtCriterion = adjusted[contender.alternative_id][criterion.id] - adjusted[leader][criterion.id];
      const otherDifference = criteria.filter(other => other.id !== criterion.id).reduce((sum, other) => sum + weights[other.id] * (adjusted[contender.alternative_id][other.id] - adjusted[leader][other.id]), 0);
      const differenceAtZero = currentWeight < 1 ? otherDifference / (1 - currentWeight) : 0;
      const denominator = differenceAtCriterion - differenceAtZero;
      if (Math.abs(denominator) < 1e-10) continue;
      const threshold = -differenceAtZero / denominator;
      if (threshold < 0 || threshold > 1 || Math.abs(threshold - currentWeight) < 1e-10) continue;
      const sample = Math.min(1, Math.max(0, threshold + (threshold > currentWeight ? 1 : -1) * 0.00001));
      if (differenceAtZero + sample * denominator < -1e-8) continue;
      if (tippingWeight === null || Math.abs(threshold - currentWeight) < Math.abs(tippingWeight - currentWeight)) {
        tippingWeight = round(threshold);
        competingAlternativeId = contender.alternative_id;
      }
    }
    return { criterionId: criterion.id, currentWeight: round(currentWeight), tippingWeight, competingAlternativeId };
  });
}

export function computeDeterministicRanking(
  alternatives: DecisionAlternative[],
  criteria: DecisionCriterion[],
  scoreMatrix: CriterionScoreInput[]
): DeterministicScoringResult {
  if (alternatives.length < 2 || !criteria.length) throw new Error("At least two alternatives and one criterion are required");
  if (new Set(alternatives.map(item => item.id)).size !== alternatives.length || new Set(criteria.map(item => item.id)).size !== criteria.length) throw new Error("Duplicate identifiers are not allowed");
  const normalizedWeights = normalizeWeights(criteria);
  const matrix = new Map<string, CriterionScoreInput>();
  for (const item of scoreMatrix) {
    const key = `${item.alternativeId}:${item.criterionId}`;
    if (matrix.has(key)) throw new Error("Duplicate criterion score");
    matrix.set(key, item);
  }
  const scoresByAlternative: Record<string, DeterministicScoreRecord> = {};
  const adjusted: Record<string, Record<string, number>> = {};
  const excluded: Record<string, string[]> = {};
  const penalties: Record<string, string[]> = {};
  const eligible: { alternative_id: string; total_score: number }[] = [];
  for (const alternative of alternatives) {
    let total = 0;
    const criterionScores: Record<string, number> = {};
    adjusted[alternative.id] = {};
    const failures: string[] = [];
    for (const criterion of criteria) {
      const item = matrix.get(`${alternative.id}:${criterion.id}`);
      if (!item) throw new Error(`Missing score for ${alternative.title} / ${criterion.name}`);
      const raw = mapOrdinalScore(item.score);
      let effective = criterion.direction === "cost" ? 10 - raw : raw;
      const measured = item.rawValue ?? raw;
      if (!Number.isFinite(measured)) throw new Error("Constraint values must be finite");
      if (criterion.softConstraint) {
        const passes = criterion.softConstraint.operator === "<=" ? measured <= criterion.softConstraint.value : measured >= criterion.softConstraint.value;
        if (!passes) {
          effective = Math.max(0, effective - criterion.softConstraint.penalty);
          (penalties[alternative.id] ||= []).push(`${criterion.name}: ${measured} violates soft ${criterion.softConstraint.operator} ${criterion.softConstraint.value}; -${criterion.softConstraint.penalty} criterion points`);
        }
      }
      criterionScores[criterion.id] = raw;
      adjusted[alternative.id][criterion.id] = effective;
      total += normalizedWeights[criterion.id] * effective;
      if (criterion.hardConstraint) {
        const passes = criterion.hardConstraint.operator === "<=" ? measured <= criterion.hardConstraint.value : measured >= criterion.hardConstraint.value;
        if (!passes) failures.push(`${criterion.name}: ${measured} violates ${criterion.hardConstraint.operator} ${criterion.hardConstraint.value}`);
      }
    }
    scoresByAlternative[alternative.id] = { criterionScores, totalScore: round(total), rank: 0 };
    if (failures.length) excluded[alternative.id] = failures;
    else eligible.push({ alternative_id: alternative.id, total_score: round(total) });
  }
  eligible.sort((a, b) => b.total_score - a.total_score || a.alternative_id.localeCompare(b.alternative_id));
  const ranking = eligible.map((item, index) => {
    const rank = index > 0 && item.total_score === eligible[index - 1].total_score ? scoresByAlternative[eligible[index - 1].alternative_id].rank : index + 1;
    scoresByAlternative[item.alternative_id].rank = rank;
    return { ...item, rank };
  });
  return { scoresByAlternative, ranking, normalizedWeights, excluded, penalties, sensitivity: sensitivity(ranking, criteria, adjusted, normalizedWeights) };
}
