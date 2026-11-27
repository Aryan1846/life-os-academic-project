import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { deleteAccountSchema } from "@/lib/validators/auth";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = deleteAccountSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Confirmation failed. You must type "DELETE" to confirm account deletion.' },
        { status: 400 }
      );
    }

    // 1. Audit log the deletion before wiping
    const adminClient = createAdminClient();
    await adminClient.from("audit_logs").insert({
      actor_id: user.id,
      action: "user.account_deleted_self_service",
      entity_type: "user",
      entity_id: user.id,
      details: {
        email: user.email,
        timestamp: new Date().toISOString(),
      },
    });

    // 2. Delete user from auth.users via admin service role client
    // PostgreSQL CASCADE rules will automatically purge:
    // - profiles
    // - goals, tasks, habits, habit_logs
    // - transactions, budgets
    // - health_activities
    // - career_items
    // - contacts, interactions
    // - events, reminders
    // - decisions, alternatives, criteria, evaluations
    // - notifications
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);

    if (deleteError) {
      return NextResponse.json(
        { error: `Account deletion failed: ${deleteError.message}` },
        { status: 500 }
      );
    }

    // 3. Clear session
    await supabase.auth.signOut();

    return NextResponse.json({
      message: "Your account and all associated personal data have been completely and permanently purged.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
