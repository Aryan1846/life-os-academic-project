import { describe, it, expect } from "vitest";
import { createGoalSchema, updateGoalSchema } from "./goals";
import { createTaskSchema, updateTaskSchema } from "./tasks";
import { createHabitSchema, logHabitSchema } from "./habits";

describe("Validation Schemas (Goals, Tasks, Habits)", () => {
  describe("Goals Schema", () => {
    it("validates a valid goal payload", () => {
      const valid = {
        title: "Master TypeScript 5",
        description: "Study advanced types and compiler options",
        category: "Career",
        target_date: "2026-12-31",
        progress: 25,
        status: "active",
      };
      const result = createGoalSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("fails when goal title is empty or exceeds length", () => {
      expect(createGoalSchema.safeParse({ title: "" }).success).toBe(false);
      expect(createGoalSchema.safeParse({ title: "a".repeat(161) }).success).toBe(false);
    });

    it("rejects invalid date format", () => {
      const invalid = { title: "Test Goal", target_date: "31-12-2026" };
      expect(createGoalSchema.safeParse(invalid).success).toBe(false);
    });

    it("rejects progress outside 0-100", () => {
      expect(createGoalSchema.safeParse({ title: "Test Goal", progress: -1 }).success).toBe(false);
      expect(createGoalSchema.safeParse({ title: "Test Goal", progress: 101 }).success).toBe(false);
    });
  });

  describe("Tasks Schema", () => {
    it("validates a valid task payload", () => {
      const valid = {
        title: "Complete lab writeup",
        priority: "high",
        status: "todo",
        due_date: "2026-11-20T18:00:00.000Z",
      };
      const result = createTaskSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("fails on invalid status or priority", () => {
      expect(
        createTaskSchema.safeParse({ title: "Task", priority: "super-urgent" }).success
      ).toBe(false);
      expect(
        createTaskSchema.safeParse({ title: "Task", status: "completed" }).success // should be 'done'
      ).toBe(false);
    });
  });

  describe("Habits Schema", () => {
    it("validates valid habit payload and applies defaults", () => {
      const valid = {
        title: "Morning workout",
        frequency: "daily",
      };
      const result = createHabitSchema.safeParse(valid);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.target_count).toBe(1);
        expect(result.data.is_active).toBe(true);
      }
    });

    it("validates habit completion log payload", () => {
      const valid = {
        completed_at: "2026-11-17T08:00:00.000Z",
        notes: "Completed 5km run",
      };
      expect(logHabitSchema.safeParse(valid).success).toBe(true);
    });
  });
});
