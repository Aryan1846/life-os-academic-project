import { createClient } from "@/lib/supabase/server";
import { calculateHabitStreak, getLocalDateString } from "@/lib/habits/streak";
import { logHabitSchema } from "@/lib/validators/habits";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1. Verify habit ownership
  const { data: habit, error: habitError } = await supabase
    .from("habits")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (habitError || !habit) {
    return NextResponse.json({ error: "Habit not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = logHabitSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const completedAt = parsed.data.completed_at || new Date().toISOString();
  const targetDateStr = getLocalDateString(completedAt, "UTC");

  // 2. Fetch existing logs for today to prevent accidental duplicates if target_count == 1
  const startOfDay = `${targetDateStr}T00:00:00.000Z`;
  const endOfDay = `${targetDateStr}T23:59:59.999Z`;

  const { data: existingTodayLogs } = await supabase
    .from("habit_logs")
    .select("id")
    .eq("habit_id", id)
    .eq("user_id", user.id)
    .gte("completed_at", startOfDay)
    .lte("completed_at", endOfDay);

  if (existingTodayLogs && existingTodayLogs.length >= (habit.target_count || 1)) {
    return NextResponse.json(
      { error: "Habit has already been completed for this day" },
      { status: 409 }
    );
  }

  // 3. Insert new habit log
  const { error: insertError } = await supabase.from("habit_logs").insert({
    habit_id: id,
    user_id: user.id,
    completed_at: completedAt,
    notes: parsed.data.notes || null,
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // 4. Fetch updated logs (last 60 days) to recompute streak deterministically
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
  const { data: allLogs } = await supabase
    .from("habit_logs")
    .select("completed_at")
    .eq("habit_id", id)
    .eq("user_id", user.id)
    .gte("completed_at", sixtyDaysAgo)
    .order("completed_at", { ascending: true });

  const streak = calculateHabitStreak(
    habit.frequency,
    allLogs || [],
    new Date(),
    "UTC",
    habit.longest_streak || 0
  );

  // 5. Update habit streaks in DB
  const { data: updatedHabit } = await supabase
    .from("habits")
    .update({
      current_streak: streak.currentStreak,
      longest_streak: streak.longestStreak,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  return NextResponse.json({
    success: true,
    streak,
    habit: updatedHabit,
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1. Verify habit ownership
  const { data: habit, error: habitError } = await supabase
    .from("habits")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (habitError || !habit) {
    return NextResponse.json({ error: "Habit not found" }, { status: 404 });
  }

  // 2. Find and remove the latest log for today
  const todayStr = getLocalDateString(new Date(), "UTC");
  const startOfDay = `${todayStr}T00:00:00.000Z`;
  const endOfDay = `${todayStr}T23:59:59.999Z`;

  const { data: todayLogs } = await supabase
    .from("habit_logs")
    .select("id")
    .eq("habit_id", id)
    .eq("user_id", user.id)
    .gte("completed_at", startOfDay)
    .lte("completed_at", endOfDay)
    .order("completed_at", { ascending: false })
    .limit(1);

  if (!todayLogs || todayLogs.length === 0) {
    return NextResponse.json({ error: "No completion log found for today" }, { status: 404 });
  }

  const { error: deleteError } = await supabase
    .from("habit_logs")
    .delete()
    .eq("id", todayLogs[0].id)
    .eq("user_id", user.id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  // 3. Recompute streak
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
  const { data: allLogs } = await supabase
    .from("habit_logs")
    .select("completed_at")
    .eq("habit_id", id)
    .eq("user_id", user.id)
    .gte("completed_at", sixtyDaysAgo)
    .order("completed_at", { ascending: true });

  const streak = calculateHabitStreak(
    habit.frequency,
    allLogs || [],
    new Date(),
    "UTC",
    habit.longest_streak || 0
  );

  const { data: updatedHabit } = await supabase
    .from("habits")
    .update({
      current_streak: streak.currentStreak,
      longest_streak: streak.longestStreak,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  return NextResponse.json({
    success: true,
    message: "Today's completion log removed",
    streak,
    habit: updatedHabit,
  });
}
