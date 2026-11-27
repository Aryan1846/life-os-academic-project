import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const schema = readFileSync(join(process.cwd(), "supabase/migrations/20261117000000_init_schema.sql"), "utf8");
const privateTables = [
  "goals", "tasks", "habits", "habit_logs", "transactions", "budgets",
  "health_activities", "career_items", "contacts", "interactions",
  "events", "reminders", "decisions", "decision_alternatives",
  "decision_criteria", "decision_evaluations", "notifications",
];

describe("private record policy regression", () => {
  it.each(privateTables)("keeps %s owner-scoped without an admin policy", table => {
    const policies = [...schema.matchAll(/CREATE POLICY\s+"[^"]+"\s+ON\s+public\.(\w+)\s+([\s\S]*?);/g)]
      .filter(match => match[1] === table)
      .map(match => match[2]);
    expect(policies.length).toBeGreaterThan(0);
    expect(policies.every(policy => policy.includes("auth.uid()") && !policy.includes("public.is_admin()"))).toBe(true);
  });
});
