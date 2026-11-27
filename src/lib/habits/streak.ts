// ==============================================================================
// Life OS — Habit Streak Engine (Deterministic & Timezone-Aware)
// Source of truth: docs/SPEC.md (FR-2.6) & AGENTS.md §8
// ==============================================================================

import type { HabitFrequency, HabitLog } from "@/types";

export interface StreakResult {
  currentStreak: number;
  longestStreak: number;
  isCompletedToday: boolean;
  totalCompletions: number;
}

/**
 * Extracts local date string 'YYYY-MM-DD' from a Date or ISO string
 * using the specified IANA timezone (or UTC if unspecified).
 */
export function getLocalDateString(
  dateInput: string | Date,
  timeZone: string = "UTC"
): string {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) {
    throw new Error("Invalid date provided to getLocalDateString");
  }

  // Format with Intl.DateTimeFormat for strict timezone representation
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(date); // outputs 'YYYY-MM-DD'
}

/**
 * Returns an array of distinct dates (YYYY-MM-DD) sorted chronologically ascending.
 */
export function getDistinctLogDates(
  logs: HabitLog[] | { completed_at: string }[],
  timeZone: string = "UTC"
): string[] {
  const dateSet = new Set<string>();
  for (const log of logs) {
    if (log.completed_at) {
      dateSet.add(getLocalDateString(log.completed_at, timeZone));
    }
  }
  return Array.from(dateSet).sort();
}

/**
 * Difference in calendar days between two 'YYYY-MM-DD' date strings (date2 - date1).
 */
export function diffCalendarDays(date1Str: string, date2Str: string): number {
  const [y1, m1, d1] = date1Str.split("-").map(Number);
  const [y2, m2, d2] = date2Str.split("-").map(Number);
  const utc1 = Date.UTC(y1, m1 - 1, d1);
  const utc2 = Date.UTC(y2, m2 - 1, d2);
  return Math.round((utc2 - utc1) / (1000 * 60 * 60 * 24));
}

/**
 * Calculate streak metrics for a daily habit.
 *
 * Rules:
 * 1. An empty log returns currentStreak = 0, longestStreak = 0, isCompletedToday = false.
 * 2. If the user completed the habit today, the streak ends today.
 * 3. If the user hasn't completed today, but completed yesterday, the streak is still intact
 *    (as the user still has time to complete it today).
 * 4. If the most recent completion is 2 or more days ago, currentStreak = 0.
 * 5. longestStreak is the max run of consecutive days across the entire history.
 */
export function calculateDailyStreak(
  logs: HabitLog[] | { completed_at: string }[],
  referenceDate: Date = new Date(),
  timeZone: string = "UTC",
  previousLongest: number = 0
): StreakResult {
  if (!logs || logs.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: previousLongest,
      isCompletedToday: false,
      totalCompletions: 0,
    };
  }

  const distinctDates = getDistinctLogDates(logs, timeZone);
  if (distinctDates.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: previousLongest,
      isCompletedToday: false,
      totalCompletions: 0,
    };
  }

  const todayStr = getLocalDateString(referenceDate, timeZone);
  const isCompletedToday = distinctDates.includes(todayStr);

  // Compute all consecutive runs to determine the historical maximum (longestStreak)
  let maxRun = 1;
  let currentRun = 1;

  for (let i = 1; i < distinctDates.length; i++) {
    const diff = diffCalendarDays(distinctDates[i - 1], distinctDates[i]);
    if (diff === 1) {
      currentRun += 1;
      if (currentRun > maxRun) {
        maxRun = currentRun;
      }
    } else if (diff > 1) {
      currentRun = 1;
    }
    // diff === 0 shouldn't happen because of distinct dates
  }

  // Calculate current active streak ending today or yesterday
  const lastCompletedDate = distinctDates[distinctDates.length - 1];
  const daysSinceLastCompletion = diffCalendarDays(lastCompletedDate, todayStr);

  let currentStreak = 0;

  if (daysSinceLastCompletion === 0) {
    // Completed today: walk backwards from today
    currentStreak = 1;
    let expectedDate = lastCompletedDate;
    for (let i = distinctDates.length - 2; i >= 0; i--) {
      const prevDate = distinctDates[i];
      if (diffCalendarDays(prevDate, expectedDate) === 1) {
        currentStreak += 1;
        expectedDate = prevDate;
      } else {
        break;
      }
    }
  } else if (daysSinceLastCompletion === 1) {
    // Completed yesterday (today still pending): walk backwards from yesterday
    currentStreak = 1;
    let expectedDate = lastCompletedDate;
    for (let i = distinctDates.length - 2; i >= 0; i--) {
      const prevDate = distinctDates[i];
      if (diffCalendarDays(prevDate, expectedDate) === 1) {
        currentStreak += 1;
        expectedDate = prevDate;
      } else {
        break;
      }
    }
  } else {
    // More than 1 day missed -> current streak broken
    currentStreak = 0;
  }

  const longestStreak = Math.max(previousLongest, maxRun, currentStreak);

  return {
    currentStreak,
    longestStreak,
    isCompletedToday,
    totalCompletions: logs.length,
  };
}

/**
 * Universal dispatcher supporting daily, weekly, or monthly frequencies.
 */
export function calculateHabitStreak(
  frequency: HabitFrequency,
  logs: HabitLog[] | { completed_at: string }[],
  referenceDate: Date = new Date(),
  timeZone: string = "UTC",
  previousLongest: number = 0
): StreakResult {
  if (frequency === "weekly") {
    return calculateWeeklyStreak(logs, referenceDate, timeZone, previousLongest);
  }
  // Default to daily logic
  return calculateDailyStreak(logs, referenceDate, timeZone, previousLongest);
}

/**
 * Calculate weekly habit streaks based on calendar weeks (Monday as start of week).
 */
export function calculateWeeklyStreak(
  logs: HabitLog[] | { completed_at: string }[],
  referenceDate: Date = new Date(),
  timeZone: string = "UTC",
  previousLongest: number = 0
): StreakResult {
  if (!logs || logs.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: previousLongest,
      isCompletedToday: false,
      totalCompletions: 0,
    };
  }

  // Group logs into distinct ISO week identifiers "YYYY-Www"
  const weekSet = new Set<string>();
  const distinctDates = getDistinctLogDates(logs, timeZone);

  for (const dateStr of distinctDates) {
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    // ISO week calculation
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    weekSet.add(`${date.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`);
  }

  const distinctWeeks = Array.from(weekSet).sort();
  const todayStr = getLocalDateString(referenceDate, timeZone);
  const isCompletedToday = distinctDates.includes(todayStr);

  // Current ISO week
  const ref = new Date(referenceDate);
  const refDay = ref.getUTCDay() || 7;
  ref.setUTCDate(ref.getUTCDate() + 4 - refDay);
  const refYearStart = new Date(Date.UTC(ref.getUTCFullYear(), 0, 1));
  const currentWeekNo = Math.ceil(((ref.getTime() - refYearStart.getTime()) / 86400000 + 1) / 7);
  const currentWeekStr = `${ref.getUTCFullYear()}-W${String(currentWeekNo).padStart(2, "0")}`;

  const currentStreak = distinctWeeks.includes(currentWeekStr) ? distinctWeeks.length : 0;
  const longestStreak = Math.max(previousLongest, distinctWeeks.length);

  return {
    currentStreak,
    longestStreak,
    isCompletedToday,
    totalCompletions: logs.length,
  };
}

/**
 * Returns a 7-day completion array (true/false) for the last 7 days ending on referenceDate.
 * Index 0 is 6 days ago, Index 6 is today.
 */
export function getLast7DaysActivity(
  logs: HabitLog[] | { completed_at: string }[],
  referenceDate: Date = new Date(),
  timeZone: string = "UTC"
): { dateStr: string; dayLabel: string; isCompleted: boolean }[] {
  const distinctDates = new Set(getDistinctLogDates(logs, timeZone));
  const result: { dateStr: string; dayLabel: string; isCompleted: boolean }[] = [];

  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(referenceDate);
    d.setUTCDate(d.getUTCDate() - i);
    const dateStr = getLocalDateString(d, timeZone);
    const dayLabel = dayLabels[d.getUTCDay()];
    result.push({
      dateStr,
      dayLabel,
      isCompleted: distinctDates.has(dateStr),
    });
  }

  return result;
}
