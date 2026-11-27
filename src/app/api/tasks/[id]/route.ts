import { createClient } from "@/lib/supabase/server";
import { updateTaskSchema } from "@/lib/validators/tasks";
import { NextResponse } from "next/server";

export async function PATCH(
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

  const body = await request.json().catch(() => ({}));
  const parsed = updateTaskSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Check goal ownership if goal_id is changed
  if (parsed.data.goal_id) {
    const { data: goal } = await supabase
      .from("goals")
      .select("id")
      .eq("id", parsed.data.goal_id)
      .eq("user_id", user.id)
      .single();

    if (!goal) {
      return NextResponse.json({ error: "Goal not found or access denied" }, { status: 400 });
    }
  }

  const updateData: Record<string, unknown> = {
    ...parsed.data,
    updated_at: new Date().toISOString(),
  };

  // If status changed to done, set completed_at automatically if not specified
  if (parsed.data.status === "done" && parsed.data.completed_at === undefined) {
    updateData.completed_at = new Date().toISOString();
  } else if (
    (parsed.data.status === "todo" || parsed.data.status === "in_progress") &&
    parsed.data.completed_at === undefined
  ) {
    updateData.completed_at = null;
  }

  const { data: task, error: updateError } = await supabase
    .from("tasks")
    .update(updateData)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*, goals(id, title, category)")
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ task });
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

  const { error: deleteError } = await supabase
    .from("tasks")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: "Task deleted successfully" });
}
