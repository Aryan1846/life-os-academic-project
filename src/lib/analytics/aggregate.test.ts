import { describe, expect, it } from "vitest";
import { aggregateAnalytics, periodStart, type AnalyticsRows } from "./aggregate";

const empty = (): AnalyticsRows => ({ goals: [], tasks: [], habits: [], habit_logs: [], transactions: [], health_activities: [], career_items: [], interactions: [], events: [] });
describe("analytics aggregation", () => {
  it("includes both date boundaries and preserves empty periods", () => {
    const rows = empty();
    rows.transactions = [{ type: "income", amount: 1000, category: "Pay", transaction_date: "2026-11-01" }, { type: "expense", amount: 250, category: "Food", transaction_date: "2026-11-03" }];
    rows.tasks = [{ status: "done", completed_at: "2026-11-03T23:59:00Z" }];
    const result = aggregateAnalytics(rows, "2026-11-01", "2026-11-03", "week");
    expect(result.series).toHaveLength(3);
    expect(result.series[1].income).toBe(0);
    expect(result.summary).toMatchObject({ income: 1000, expenses: 250, savings: 750, tasksCompleted: 1 });
  });
  it("groups yearly data by calendar month and filters finance category", () => {
    const rows = empty();
    rows.transactions = [{ type: "expense", amount: 50, category: "Food", transaction_date: "2026-01-31" }, { type: "expense", amount: 20, category: "Travel", transaction_date: "2026-02-01" }];
    const result = aggregateAnalytics(rows, "2026-01-30", "2026-02-02", "year", "Food");
    expect(result.series.map(item => item.label)).toEqual(["2026-01", "2026-02"]);
    expect(result.summary.expenses).toBe(50);
  });
  it("calculates leap-day windows", () => {
    expect(periodStart("week", new Date("2024-03-01T00:00:00Z"))).toBe("2024-02-24");
  });
  it("uses each habit's creation date and target for consistency", () => {
    const rows = empty();
    rows.habits = [{ id: "habit-1", is_active: true, frequency: "daily", target_count: 2, created_at: "2026-11-03T10:00:00Z" }];
    rows.habit_logs = [{ habit_id: "habit-1", completed_at: "2026-11-03T11:00:00Z" }, { habit_id: "habit-1", completed_at: "2026-11-03T12:00:00Z" }];
    expect(aggregateAnalytics(rows, "2026-11-01", "2026-11-03", "week").summary.habitConsistency).toBe(100);
  });
});
