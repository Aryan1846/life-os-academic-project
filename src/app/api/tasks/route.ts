import { createClient } from "@/lib/supabase/server";
import { createTaskSchema } from "@/lib/validators/tasks";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const view = searchParams.get("view"); // 'all' | 'today' | 'upcoming' | 'overdue' | 'completed'
  const goalId = searchParams.get("goal_id");
  const priority = searchParams.get("priority");
  const status = searchParams.get("status");

  let query = supabase
    .from("tasks")
    .select("*, goals(id, title, category)")
    .eq("user_id", user.id);

  if (goalId) {
    query = query.eq("goal_id", goalId);
  }

  if (priority) {
    query = query.eq("priority", priority);
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const endOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999
  ).toISOString();

  if (view === "completed") {
    query = query.eq("status", "done");
  } else if (view === "today") {
    query = query
      .neq("status", "done")
      .neq("status", "cancelled")
      .gte("due_date", startOfToday)
      .lte("due_date", endOfToday);
  } else if (view === "overdue") {
    query = query
      .neq("status", "done")
      .neq("status", "cancelled")
      .lt("due_date", startOfToday);
  } else if (view === "upcoming") {
    query = query
      .neq("status", "done")
      .neq("status", "cancelled")
      .gt("due_date", endOfToday);
  } else if (status) {
    query = query.eq("status", status);
  }

  query = query.order("due_date", { ascending: true, nullsFirst: false });

  const { data: tasks, error: tasksError } = await query;

  if (tasksError) {
    return NextResponse.json({ error: tasksError.message }, { status: 500 });
  }

  return NextResponse.json({ tasks: tasks || [] });
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
  const parsed = createTaskSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // If goal_id is provided, verify it belongs to the user
  if (parsed.data.goal_id) {
    const { data: goal } = await supabase
      .from("goals")
      .select("id")
      .eq("id", parsed.data.goal_id)
      .eq("user_id", user.id)
      .single();

    if (!goal) {
      return NextResponse.json({ error: "Associated goal does not exist or access denied" }, { status: 400 });
    }
  }

  const completedAt = parsed.data.status === "done" ? new Date().toISOString() : null;

  const { data: task, error: insertError } = await supabase
    .from("tasks")
    .insert({
      user_id: user.id,
      goal_id: parsed.data.goal_id || null,
      title: parsed.data.title,
      description: parsed.data.description || null,
      priority: parsed.data.priority ?? "medium",
      status: parsed.data.status ?? "todo",
      due_date: parsed.data.due_date || null,
      completed_at: completedAt,
    })
    .select("*, goals(id, title, category)")
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ task }, { status: 201 });
}
