import { createClient } from "@/lib/supabase/server";
import { calculateHabitStreak, getLast7DaysActivity } from "@/lib/habits/streak";
import { createHabitSchema } from "@/lib/validators/habits";
import { NextResponse } from "next/server";
import type { Habit } from "@/types";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch active habits
  const { data: habits, error: habitsError } = await supabase
    .from("habits")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (habitsError) {
    return NextResponse.json({ error: habitsError.message }, { status: 500 });
  }

  if (!habits || habits.length === 0) {
    return NextResponse.json({ habits: [] });
  }

  const habitIds = habits.map((h) => h.id);

  // Fetch logs for these habits (last 60 days)
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
  const { data: logs, error: logsError } = await supabase
    .from("habit_logs")
    .select("*")
    .eq("user_id", user.id)
    .in("habit_id", habitIds)
    .gte("completed_at", sixtyDaysAgo)
    .order("completed_at", { ascending: true });

  if (logsError) {
    return NextResponse.json({ error: logsError.message }, { status: 500 });
  }

  // Group logs by habit_id
  const logsByHabit: Record<string, typeof logs> = {};
  for (const log of logs || []) {
    if (!logsByHabit[log.habit_id]) logsByHabit[log.habit_id] = [];
    logsByHabit[log.habit_id].push(log);
  }

  const now = new Date();

  // Enrich habits with calculated streak and recent 7-day activity
  const enrichedHabits = await Promise.all(
    habits.map(async (habit: Habit) => {
      const habitLogs = logsByHabit[habit.id] || [];
      const streakInfo = calculateHabitStreak(
        habit.frequency,
        habitLogs,
        now,
        "UTC",
        habit.longest_streak || 0
      );
      const activity7Days = getLast7DaysActivity(habitLogs, now, "UTC");

      // Sync streak in DB if changed
      if (
        streakInfo.currentStreak !== habit.current_streak ||
        streakInfo.longestStreak !== habit.longest_streak
      ) {
        await supabase
          .from("habits")
          .update({
            current_streak: streakInfo.currentStreak,
            longest_streak: streakInfo.longestStreak,
            updated_at: new Date().toISOString(),
          })
          .eq("id", habit.id)
          .eq("user_id", user.id);
      }

      return {
        ...habit,
        current_streak: streakInfo.currentStreak,
        longest_streak: streakInfo.longestStreak,
        isCompletedToday: streakInfo.isCompletedToday,
        totalCompletions: streakInfo.totalCompletions,
        recentActivity: activity7Days,
      };
    })
  );

  return NextResponse.json({ habits: enrichedHabits });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = createHabitSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { data: habit, error: insertError } = await supabase
    .from("habits")
    .insert({
      user_id: user.id,
      title: parsed.data.title,
      description: parsed.data.description || null,
      frequency: parsed.data.frequency ?? "daily",
      target_count: parsed.data.target_count ?? 1,
      is_active: parsed.data.is_active ?? true,
      current_streak: 0,
      longest_streak: 0,
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ habit }, { status: 201 });
}
