import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { loginSchema } from "@/lib/validators/auth";
import { createAdminClient } from "@/lib/supabase/admin";

async function recordLogin(action: string, actorId?: string) {
  try { await createAdminClient().from("audit_logs").insert({ actor_id: actorId || null, action, entity_type: "authentication" }); } catch { /* Authentication remains available if audit storage is temporarily unavailable. */ }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;
    const supabase = await createClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      await recordLogin("auth.login_failed");
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    // Check if user profile is active
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_active, role, full_name")
      .eq("id", data.user.id)
      .single();

    if (profile && profile.is_active === false) {
      await recordLogin("auth.login_failed", data.user.id);
      await supabase.auth.signOut();
      return NextResponse.json(
        { error: "Account has been deactivated. Please contact an administrator." },
        { status: 403 }
      );
    }

    await recordLogin("auth.login_succeeded", data.user.id);

    return NextResponse.json({
      message: "Login successful",
      user: {
        id: data.user.id,
        email: data.user.email,
        role: profile?.role || "user",
        fullName: profile?.full_name || "User",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
