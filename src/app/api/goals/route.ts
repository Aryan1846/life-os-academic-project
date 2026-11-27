import { createClient } from "@/lib/supabase/server";
import { createGoalSchema } from "@/lib/validators/goals";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1. Fetch user goals
  const { data: goals, error: goalsError } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (goalsError) {
    return NextResponse.json({ error: goalsError.message }, { status: 500 });
  }

  // 2. Fetch task counts for each goal to provide complete stats
  const { data: tasks, error: tasksError } = await supabase
    .from("tasks")
    .select("id, goal_id, status")
    .eq("user_id", user.id)
    .not("goal_id", "is", null);

  if (tasksError) {
    return NextResponse.json({ error: tasksError.message }, { status: 500 });
  }

  const taskStatsByGoal: Record<string, { total: number; completed: number }> = {};
  if (tasks) {
    for (const t of tasks) {
      if (!t.goal_id) continue;
      if (!taskStatsByGoal[t.goal_id]) {
        taskStatsByGoal[t.goal_id] = { total: 0, completed: 0 };
      }
      taskStatsByGoal[t.goal_id].total += 1;
      if (t.status === "done") {
        taskStatsByGoal[t.goal_id].completed += 1;
      }
    }
  }

  const enrichedGoals = (goals || []).map((g) => ({
    ...g,
    total_tasks: taskStatsByGoal[g.id]?.total || 0,
    completed_tasks: taskStatsByGoal[g.id]?.completed || 0,
  }));

  return NextResponse.json({ goals: enrichedGoals });
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
  const parsed = createGoalSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { data: goal, error: insertError } = await supabase
    .from("goals")
    .insert({
      user_id: user.id,
      title: parsed.data.title,
      description: parsed.data.description || null,
      category: parsed.data.category || null,
      target_date: parsed.data.target_date || null,
      progress: parsed.data.progress ?? 0,
      status: parsed.data.status ?? "active",
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ goal }, { status: 201 });
}
