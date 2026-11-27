import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { registerSchema } from "@/lib/validators/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, password, fullName } = parsed.data;
    const { data: registration, error: settingError } = await createAdminClient().from("system_settings").select("value").eq("key", "registration_enabled").maybeSingle();
    if (settingError) return NextResponse.json({ error: "Registration is temporarily unavailable" }, { status: 503 });
    if (registration?.value === false) return NextResponse.json({ error: "Registration is currently disabled" }, { status: 403 });
    const supabase = await createClient();

    // Sign up with Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/auth/callback`,
      },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const user = data.user;
    if (user) {
      // Ensure profile row exists (in case trigger is delayed or manual entry needed)
      await supabase.from("profiles").upsert(
        {
          id: user.id,
          full_name: fullName,
          role: "user",
          is_active: true,
          privacy_settings: {
            share_goals: false,
            share_finance: false,
            share_health: false,
            share_career: false,
          },
        },
        { onConflict: "id" }
      );
    }

    return NextResponse.json({
      message: "Registration successful. Please verify your email.",
      user: {
        id: user?.id,
        email: user?.email,
        confirmationSent: !data.session,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
