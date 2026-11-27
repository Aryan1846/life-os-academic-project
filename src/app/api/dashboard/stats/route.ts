import { createClient } from "@/lib/supabase/server";
import { calculateHabitStreak, getLast7DaysActivity, getLocalDateString } from "@/lib/habits/streak";
import { NextResponse } from "next/server";
import type { Goal, Habit, Task } from "@/types";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const todayStr = getLocalDateString(now, "UTC");
  const startOfToday = `${todayStr}T00:00:00.000Z`;
  const endOfToday = `${todayStr}T23:59:59.999Z`;

  // 1. Fetch Goals
  const { data: rawGoals } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", user.id)
    .order("progress", { ascending: false });

  // 2. Fetch Tasks
  const { data: rawTasks } = await supabase
    .from("tasks")
    .select("*, goals(id, title, category)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // 3. Fetch Habits
  const { data: rawHabits } = await supabase
    .from("habits")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  // 4. Fetch Habit Logs (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: rawHabitLogs } = await supabase
    .from("habit_logs")
    .select("*")
    .eq("user_id", user.id)
    .gte("completed_at", thirtyDaysAgo)
    .order("completed_at", { ascending: true });

  const monthStart = `${todayStr.slice(0, 7)}-01`;
  const [financeResult, healthResult, eventResult, careerResult, contactResult] = await Promise.all([
    supabase.from("transactions").select("type,amount").eq("user_id", user.id).gte("transaction_date", monthStart),
    supabase.from("health_activities").select("duration_minutes,calories_burned,sleep_hours").eq("user_id", user.id).gte("activity_date", monthStart),
    supabase.from("events").select("title,start_time").eq("user_id", user.id).gte("start_time", now.toISOString()).order("start_time").limit(5),
    supabase.from("career_items").select("id,status").eq("user_id", user.id),
    supabase.from("contacts").select("id").eq("user_id", user.id),
  ]);
  const moduleError = [financeResult.error, healthResult.error, eventResult.error, careerResult.error, contactResult.error].find(Boolean);
  if (moduleError) return NextResponse.json({ error: moduleError.message }, { status: 500 });
  const finance = financeResult.data || [];
  const health = healthResult.data || [];
  const { data: recentDecisionRows, error: decisionError } = await supabase.from("decisions").select("id,title,status,updated_at").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(3);
  if (decisionError) return NextResponse.json({ error: "Could not load decision summaries" }, { status: 500 });
  const decisionIds = (recentDecisionRows || []).map(item => item.id);
  const { data: recentEvaluationRows, error: evaluationError } = decisionIds.length ? await supabase.from("decision_evaluations").select("decision_id,version,ranking").in("decision_id", decisionIds).order("version", { ascending: false }) : { data: [], error: null };
  if (evaluationError) return NextResponse.json({ error: "Could not load recent evaluations" }, { status: 500 });
  const recentDecisions = (recentDecisionRows || []).map(item => {
    const latest = (recentEvaluationRows || []).find(row => row.decision_id === item.id);
    const ranking = latest?.ranking as { total_score?: number }[] | undefined;
    return { ...item, latestVersion: latest?.version ?? null, leadingScore: ranking?.[0]?.total_score ?? null };
  });

  // Aggregate goal stats
  const tasksByGoal: Record<string, { total: number; completed: number }> = {};
  for (const t of rawTasks || []) {
    if (!t.goal_id) continue;
    if (!tasksByGoal[t.goal_id]) tasksByGoal[t.goal_id] = { total: 0, completed: 0 };
    tasksByGoal[t.goal_id].total += 1;
    if (t.status === "done") tasksByGoal[t.goal_id].completed += 1;
  }

  const goals = (rawGoals || []).map((g: Goal) => ({
    ...g,
    total_tasks: tasksByGoal[g.id]?.total || 0,
    completed_tasks: tasksByGoal[g.id]?.completed || 0,
  }));

  const activeGoals = goals.filter((g) => g.status === "active");

  // Aggregate task categories
  const tasks: Task[] = rawTasks || [];
  const tasksDueToday = tasks.filter(
    (t) =>
      t.status !== "done" &&
      t.status !== "cancelled" &&
      t.due_date &&
      t.due_date >= startOfToday &&
      t.due_date <= endOfToday
  );

  const overdueTasks = tasks.filter(
    (t) =>
      t.status !== "done" &&
      t.status !== "cancelled" &&
      t.due_date &&
      t.due_date < startOfToday
  );

  const tasksCompletedToday = tasks.filter(
    (t) =>
      t.status === "done" &&
      t.completed_at &&
      t.completed_at >= startOfToday &&
      t.completed_at <= endOfToday
  );

  const totalTasksCount = tasks.length;
  const totalCompletedCount = tasks.filter((t) => t.status === "done").length;
  const completionRate =
    totalTasksCount > 0 ? Math.round((totalCompletedCount / totalTasksCount) * 100) : 0;

  // Aggregate habits with streak calculation
  const logsByHabit: Record<string, typeof rawHabitLogs> = {};
  for (const l of rawHabitLogs || []) {
    if (!logsByHabit[l.habit_id]) logsByHabit[l.habit_id] = [];
    logsByHabit[l.habit_id]?.push(l);
  }

  let totalStreakCount = 0;
  const enrichedHabits = (rawHabits || []).map((h: Habit) => {
    const hLogs = logsByHabit[h.id] || [];
    const streak = calculateHabitStreak(h.frequency, hLogs, now, "UTC", h.longest_streak || 0);
    const activity = getLast7DaysActivity(hLogs, now, "UTC");
    totalStreakCount += streak.currentStreak;

    return {
      ...h,
      current_streak: streak.currentStreak,
      longest_streak: streak.longestStreak,
      loggedToday: streak.isCompletedToday,
      recentHistory: activity.map((a) => a.isCompleted),
    };
  });

  // Calculate 7-day productivity activity (tasks completed & habits completed)
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const weeklyActivity: {
    day: string;
    date: string;
    tasksCompleted: number;
    habitsCompleted: number;
  }[] = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    const dStr = getLocalDateString(d, "UTC");
    const dStart = `${dStr}T00:00:00.000Z`;
    const dEnd = `${dStr}T23:59:59.999Z`;

    const dayTasksCount = tasks.filter(
      (t) =>
        t.status === "done" &&
        t.completed_at &&
        t.completed_at >= dStart &&
        t.completed_at <= dEnd
    ).length;

    const dayHabitsCount = (rawHabitLogs || []).filter(
      (l) => l.completed_at && l.completed_at >= dStart && l.completed_at <= dEnd
    ).length;

    weeklyActivity.push({
      day: dayNames[d.getUTCDay()],
      date: dStr,
      tasksCompleted: dayTasksCount,
      habitsCompleted: dayHabitsCount,
    });
  }

  // Greeting
  const hour = now.getUTCHours();
  let greeting = "Good evening";
  if (hour >= 5 && hour < 12) greeting = "Good morning";
  else if (hour >= 12 && hour < 17) greeting = "Good afternoon";

  const todayFormatted = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(now);

  return NextResponse.json({
    recentDecisions,
    greeting,
    todayDate: todayFormatted,
    activeGoals,
    tasksDueToday,
    overdueTasks,
    recentTasks: tasks.slice(0, 5),
    habits: enrichedHabits,
    completionStats: {
      tasksCompletedToday: tasksCompletedToday.length,
      tasksDueTodayCount: tasksDueToday.length,
      tasksTotalCount: totalTasksCount,
      completionRate,
      activeGoalsCount: activeGoals.length,
      activeHabitsCount: enrichedHabits.length,
      totalStreakCount,
    },
    weeklyActivity,
    lifeSummaries: {
      income: finance.filter(row => row.type === "income").reduce((sum, row) => sum + Number(row.amount), 0),
      expenses: finance.filter(row => row.type === "expense").reduce((sum, row) => sum + Number(row.amount), 0),
      activityMinutes: health.reduce((sum, row) => sum + Number(row.duration_minutes || 0), 0),
      averageSleep: (() => { const nights = health.filter(row => row.sleep_hours != null); return nights.length ? nights.reduce((sum, row) => sum + Number(row.sleep_hours), 0) / nights.length : null; })(),
      careerActive: (careerResult.data || []).filter(row => row.status === "in_progress").length,
      contacts: (contactResult.data || []).length,
      upcomingEvents: eventResult.data || [],
    },
  });
}
