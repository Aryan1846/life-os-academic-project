import { describe, it, expect } from "vitest";
import {
  calculateDailyStreak,
  calculateHabitStreak,
  calculateWeeklyStreak,
  diffCalendarDays,
  getDistinctLogDates,
  getLast7DaysActivity,
  getLocalDateString,
} from "./streak";

describe("Habit Streak Engine (Deterministic & Timezone-Aware)", () => {
  const REF_DATE = new Date("2026-11-17T12:00:00Z"); // "today" is 2026-11-17

  describe("Date Utility Helpers", () => {
    it("formats UTC dates into YYYY-MM-DD", () => {
      expect(getLocalDateString("2026-11-17T08:30:00Z", "UTC")).toBe("2026-11-17");
      expect(getLocalDateString(new Date("2026-01-05T00:00:00Z"), "UTC")).toBe("2026-01-05");
    });

    it("handles timezones correctly across day boundaries", () => {
      // 2026-11-17 23:00 UTC is 2026-11-18 04:30 in Asia/Kolkata (+5:30)
      const lateUTC = "2026-11-17T23:00:00Z";
      expect(getLocalDateString(lateUTC, "UTC")).toBe("2026-11-17");
      expect(getLocalDateString(lateUTC, "Asia/Kolkata")).toBe("2026-11-18");
    });

    it("calculates exact calendar day differences", () => {
      expect(diffCalendarDays("2026-11-10", "2026-11-15")).toBe(5);
      expect(diffCalendarDays("2026-11-15", "2026-11-10")).toBe(-5);
      expect(diffCalendarDays("2026-11-17", "2026-11-17")).toBe(0);
      expect(diffCalendarDays("2026-02-28", "2026-03-01")).toBe(1);
    });

    it("deduplicates logs on the same date and sorts them", () => {
      const logs = [
        { completed_at: "2026-11-17T18:00:00Z" },
        { completed_at: "2026-11-15T10:00:00Z" },
        { completed_at: "2026-11-17T09:00:00Z" }, // duplicate day
      ];
      expect(getDistinctLogDates(logs, "UTC")).toEqual(["2026-11-15", "2026-11-17"]);
    });
  });

  describe("Daily Streak Calculation", () => {
    it("returns zero for empty logs while preserving previous longest streak", () => {
      const result = calculateDailyStreak([], REF_DATE, "UTC", 12);
      expect(result.currentStreak).toBe(0);
      expect(result.longestStreak).toBe(12);
      expect(result.isCompletedToday).toBe(false);
      expect(result.totalCompletions).toBe(0);
    });

    it("calculates streak = 1 when completed today", () => {
      const logs = [{ completed_at: "2026-11-17T08:00:00Z" }];
      const result = calculateDailyStreak(logs, REF_DATE, "UTC");
      expect(result.currentStreak).toBe(1);
      expect(result.longestStreak).toBe(1);
      expect(result.isCompletedToday).toBe(true);
      expect(result.totalCompletions).toBe(1);
    });

    it("keeps streak intact when completed yesterday but not yet today (pending)", () => {
      // Completed yesterday (2026-11-16), not completed today (2026-11-17)
      const logs = [{ completed_at: "2026-11-16T15:00:00Z" }];
      const result = calculateDailyStreak(logs, REF_DATE, "UTC");
      expect(result.currentStreak).toBe(1);
      expect(result.longestStreak).toBe(1);
      expect(result.isCompletedToday).toBe(false);
    });

    it("calculates multi-day consecutive streak ending today", () => {
      const logs = [
        { completed_at: "2026-11-13T10:00:00Z" },
        { completed_at: "2026-11-14T11:00:00Z" },
        { completed_at: "2026-11-15T09:00:00Z" },
        { completed_at: "2026-11-16T14:00:00Z" },
        { completed_at: "2026-11-17T08:00:00Z" },
      ];
      const result = calculateDailyStreak(logs, REF_DATE, "UTC");
      expect(result.currentStreak).toBe(5);
      expect(result.longestStreak).toBe(5);
      expect(result.isCompletedToday).toBe(true);
    });

    it("calculates multi-day streak ending yesterday (grace period for today)", () => {
      const logs = [
        { completed_at: "2026-11-13T10:00:00Z" },
        { completed_at: "2026-11-14T11:00:00Z" },
        { completed_at: "2026-11-15T09:00:00Z" },
        { completed_at: "2026-11-16T14:00:00Z" },
      ];
      const result = calculateDailyStreak(logs, REF_DATE, "UTC");
      expect(result.currentStreak).toBe(4);
      expect(result.longestStreak).toBe(4);
      expect(result.isCompletedToday).toBe(false);
    });

    it("resets current streak to 0 if last completion was 2 or more days ago", () => {
      // Last completed on 2026-11-15 (2 days ago from 2026-11-17)
      const logs = [
        { completed_at: "2026-11-13T10:00:00Z" },
        { completed_at: "2026-11-14T11:00:00Z" },
        { completed_at: "2026-11-15T09:00:00Z" },
      ];
      const result = calculateDailyStreak(logs, REF_DATE, "UTC");
      expect(result.currentStreak).toBe(0);
      expect(result.longestStreak).toBe(3);
      expect(result.isCompletedToday).toBe(false);
    });

    it("preserves historical longest streak even after a break and new shorter streak", () => {
      // Historic run: 5 days (Nov 1 - Nov 5)
      // Break: Nov 6 - Nov 15
      // Current run: 2 days (Nov 16 - Nov 17)
      const logs = [
        { completed_at: "2026-11-01T10:00:00Z" },
        { completed_at: "2026-11-02T10:00:00Z" },
        { completed_at: "2026-11-03T10:00:00Z" },
        { completed_at: "2026-11-04T10:00:00Z" },
        { completed_at: "2026-11-05T10:00:00Z" },
        { completed_at: "2026-11-16T10:00:00Z" },
        { completed_at: "2026-11-17T10:00:00Z" },
      ];
      const result = calculateDailyStreak(logs, REF_DATE, "UTC");
      expect(result.currentStreak).toBe(2);
      expect(result.longestStreak).toBe(5);
      expect(result.isCompletedToday).toBe(true);
    });

    it("handles multiple logs on the same day without inflating streak count", () => {
      const logs = [
        { completed_at: "2026-11-16T08:00:00Z" },
        { completed_at: "2026-11-16T12:00:00Z" },
        { completed_at: "2026-11-16T20:00:00Z" },
        { completed_at: "2026-11-17T09:00:00Z" },
        { completed_at: "2026-11-17T11:00:00Z" },
      ];
      const result = calculateDailyStreak(logs, REF_DATE, "UTC");
      expect(result.currentStreak).toBe(2);
      expect(result.longestStreak).toBe(2);
      expect(result.totalCompletions).toBe(5);
    });
  });

  describe("Weekly Habit Streak", () => {
    it("handles weekly frequency streak correctly", () => {
      const logs = [
        { completed_at: "2026-11-10T10:00:00Z" },
        { completed_at: "2026-11-17T10:00:00Z" },
      ];
      const result = calculateWeeklyStreak(logs, REF_DATE, "UTC");
      expect(result.currentStreak).toBeGreaterThan(0);
      expect(result.longestStreak).toBeGreaterThan(0);
    });
  });

  describe("Last 7 Days Activity Helper", () => {
    it("returns exactly 7 days of activity ending today", () => {
      const logs = [
        { completed_at: "2026-11-17T10:00:00Z" },
        { completed_at: "2026-11-15T10:00:00Z" },
      ];
      const activity = getLast7DaysActivity(logs, REF_DATE, "UTC");
      expect(activity).toHaveLength(7);
      expect(activity[6].dateStr).toBe("2026-11-17");
      expect(activity[6].isCompleted).toBe(true);
      expect(activity[5].dateStr).toBe("2026-11-16");
      expect(activity[5].isCompleted).toBe(false);
      expect(activity[4].dateStr).toBe("2026-11-15");
      expect(activity[4].isCompleted).toBe(true);
    });
  });

  describe("Universal Dispatcher", () => {
    it("dispatches correctly to daily and weekly calculation", () => {
      const logs = [{ completed_at: "2026-11-17T08:00:00Z" }];
      const dailyRes = calculateHabitStreak("daily", logs, REF_DATE, "UTC");
      expect(dailyRes.currentStreak).toBe(1);

      const weeklyRes = calculateHabitStreak("weekly", logs, REF_DATE, "UTC");
      expect(weeklyRes.currentStreak).toBe(1);
    });
  });
});
