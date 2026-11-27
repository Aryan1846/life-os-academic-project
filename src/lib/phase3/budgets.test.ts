import { describe, expect, it } from "vitest";
import { budgetStatus } from "./budgets";

describe("budget threshold", () => {
  it("alerts at the configured ratio and identifies overspend", () => {
    expect(budgetStatus(799, 1000, 0.8)).toEqual({ ratio: 0.799, alert: false, exceeded: false });
    expect(budgetStatus(800, 1000, 0.8)).toEqual({ ratio: 0.8, alert: true, exceeded: false });
    expect(budgetStatus(1200, 1000, 0.8)).toEqual({ ratio: 1.2, alert: true, exceeded: true });
  });
});
