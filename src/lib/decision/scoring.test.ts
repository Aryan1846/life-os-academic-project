import { describe, it, expect } from "vitest";
import { normalizeWeights, computeDeterministicRanking, mapOrdinalScore } from "./scoring";
import { DecisionAlternative, DecisionCriterion } from "@/types";

describe("Deterministic Weighted Scoring Engine", () => {
  const mockCriteria: DecisionCriterion[] = [
    { id: "c1", decision_id: "d1", name: "Cost", weight: 0.5 },
    { id: "c2", decision_id: "d1", name: "Speed", weight: 0.3 },
    { id: "c3", decision_id: "d1", name: "Quality", weight: 0.2 },
  ];

  const mockAlternatives: DecisionAlternative[] = [
    { id: "a1", decision_id: "d1", title: "Option A", sort_order: 0 },
    { id: "a2", decision_id: "d1", title: "Option B", sort_order: 1 },
  ];

  it("normalizes criteria weights to sum strictly to 1.0", () => {
    const normalized = normalizeWeights(mockCriteria);
    const sum = Object.values(normalized).reduce((acc, w) => acc + w, 0);
    expect(sum).toBeCloseTo(1.0, 5);
    expect(normalized["c1"]).toBeCloseTo(0.5, 5);
    expect(normalized["c2"]).toBeCloseTo(0.3, 5);
    expect(normalized["c3"]).toBeCloseTo(0.2, 5);
  });

  it("handles un-normalized weights (e.g., raw points)", () => {
    const rawCriteria: DecisionCriterion[] = [
      { id: "c1", decision_id: "d1", name: "Impact", weight: 10 },
      { id: "c2", decision_id: "d1", name: "Effort", weight: 30 },
    ];
    const normalized = normalizeWeights(rawCriteria);
    expect(normalized["c1"]).toBeCloseTo(0.25, 5);
    expect(normalized["c2"]).toBeCloseTo(0.75, 5);
  });

  it("calculates deterministic alternative rankings objectively", () => {
    // Option A: Cost 9, Speed 4, Quality 6 -> (0.5 * 9) + (0.3 * 4) + (0.2 * 6) = 4.5 + 1.2 + 1.2 = 6.9
    // Option B: Cost 4, Speed 8, Quality 9 -> (0.5 * 4) + (0.3 * 8) + (0.2 * 9) = 2.0 + 2.4 + 1.8 = 6.2
    const scores = [
      { alternativeId: "a1", criterionId: "c1", score: 9 },
      { alternativeId: "a1", criterionId: "c2", score: 4 },
      { alternativeId: "a1", criterionId: "c3", score: 6 },
      { alternativeId: "a2", criterionId: "c1", score: 4 },
      { alternativeId: "a2", criterionId: "c2", score: 8 },
      { alternativeId: "a2", criterionId: "c3", score: 9 },
    ];

    const result = computeDeterministicRanking(mockAlternatives, mockCriteria, scores);

    expect(result.scoresByAlternative["a1"].totalScore).toBe(6.9);
    expect(result.scoresByAlternative["a1"].rank).toBe(1);

    expect(result.scoresByAlternative["a2"].totalScore).toBe(6.2);
    expect(result.scoresByAlternative["a2"].rank).toBe(2);

    expect(result.ranking[0].alternative_id).toBe("a1");
    expect(result.ranking[1].alternative_id).toBe("a2");
  });

  it("handles deterministic ties identically", () => {
    const equalScores = [
      { alternativeId: "a1", criterionId: "c1", score: 8 },
      { alternativeId: "a1", criterionId: "c2", score: 8 },
      { alternativeId: "a1", criterionId: "c3", score: 8 },
      { alternativeId: "a2", criterionId: "c1", score: 8 },
      { alternativeId: "a2", criterionId: "c2", score: 8 },
      { alternativeId: "a2", criterionId: "c3", score: 8 },
    ];

    const result = computeDeterministicRanking(mockAlternatives, mockCriteria, equalScores);

    expect(result.scoresByAlternative["a1"].totalScore).toBe(8.0);
    expect(result.scoresByAlternative["a2"].totalScore).toBe(8.0);
    expect(result.scoresByAlternative["a1"].rank).toBe(1);
    expect(result.scoresByAlternative["a2"].rank).toBe(1);
  });

  it("inverts costs and excludes alternatives violating hard limits", () => {
    const criteria: DecisionCriterion[] = [
      { ...mockCriteria[0], direction: "cost", hardConstraint: { operator: "<=", value: 5000 } },
      { ...mockCriteria[1], weight: 0.5 },
    ];
    const result = computeDeterministicRanking(mockAlternatives, criteria, [
      { alternativeId: "a1", criterionId: "c1", score: 2, rawValue: 4000 },
      { alternativeId: "a1", criterionId: "c2", score: 5 },
      { alternativeId: "a2", criterionId: "c1", score: 1, rawValue: 6000 },
      { alternativeId: "a2", criterionId: "c2", score: 10 },
    ]);
    expect(result.scoresByAlternative.a1.totalScore).toBe(6.5);
    expect(result.ranking.map(item => item.alternative_id)).toEqual(["a1"]);
    expect(result.excluded.a2[0]).toContain("6000 violates <= 5000");
  });

  it("maps ordinal and Likert scales and rejects missing scores", () => {
    expect(["low", "medium", "high", "likert:1", "likert:5"].map(mapOrdinalScore)).toEqual([0, 5, 10, 0, 10]);
    expect(() => computeDeterministicRanking(mockAlternatives, mockCriteria, [])).toThrow(/Missing score/);
  });

  it("finds a weight at which the leader changes", () => {
    const criteria = [{ ...mockCriteria[0], weight: 0.5 }, { ...mockCriteria[1], weight: 0.5 }];
    const result = computeDeterministicRanking(mockAlternatives, criteria, [
      { alternativeId: "a1", criterionId: "c1", score: 10 },
      { alternativeId: "a1", criterionId: "c2", score: 4 },
      { alternativeId: "a2", criterionId: "c1", score: 2 },
      { alternativeId: "a2", criterionId: "c2", score: 10 },
    ]);
    expect(result.ranking[0].alternative_id).toBe("a1");
    expect(result.sensitivity.find(item => item.criterionId === "c1")?.tippingWeight).toBeCloseTo(0.429, 3);
  });
  it("applies a transparent soft penalty without excluding an alternative", () => {
    const criteria: DecisionCriterion[] = [{ ...mockCriteria[0], weight: 1, softConstraint: { operator: "<=", value: 5000, penalty: 3 } }];
    const result = computeDeterministicRanking(mockAlternatives, criteria, [
      { alternativeId: "a1", criterionId: "c1", score: 9, rawValue: 6000 },
      { alternativeId: "a2", criterionId: "c1", score: 7, rawValue: 4000 },
    ]);
    expect(result.scoresByAlternative.a1.totalScore).toBe(6);
    expect(result.ranking[0].alternative_id).toBe("a2");
    expect(result.excluded.a1).toBeUndefined();
    expect(result.penalties.a1[0]).toMatch(/-3 criterion points/);
  });
});
