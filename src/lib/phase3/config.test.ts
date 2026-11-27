import { describe, expect, it } from "vitest";
import { validatePhase3 } from "./config";

describe("Phase 3 input validation", () => {
  it("rejects invalid finance amounts and thresholds", () => {
    expect(validatePhase3("transactions", { type: "expense", category: "Food", amount: -5, transaction_date: "2026-11-17" }).success).toBe(false);
    expect(validatePhase3("budgets", { category: "Food", monthly_limit: 1000, alert_threshold: 1.5 }).success).toBe(false);
  });
  it("accepts sleep and application records", () => {
    expect(validatePhase3("health_activities", { activity_type: "Sleep", activity_date: "2026-11-17", sleep_hours: 8 }).success).toBe(true);
    expect(validatePhase3("career_items", { type: "application", title: "Role", status: "planned", metadata: { application_stage: "Applied" } }).success).toBe(true);
  });
  it("requires a valid linked reminder pair", () => {
    expect(validatePhase3("reminders", { title: "Call", remind_at: "2026-11-17T09:00:00.000Z", entity_type: "contact" }).success).toBe(false);
  });
});
