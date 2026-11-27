import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updatePrivacySchema } from "@/lib/validators/auth";
import { z } from "zod";

const combinedProfileUpdateSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters").max(100).optional(),
  avatarUrl: z.string().url("Invalid avatar URL").or(z.literal("")).optional(),
  privacySettings: updatePrivacySchema.optional(),
});

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, role, is_active, privacy_settings, created_at, updated_at")
      .eq("id", user.id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        emailConfirmed: !!user.email_confirmed_at,
      },
      profile,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const rawBody = await request.json();

    // Security Check: Explicitly reject any attempt to escalate role or modify account status
    if (
      "role" in rawBody ||
      "is_active" in rawBody ||
      "isActive" in rawBody ||
      "id" in rawBody ||
      "user_id" in rawBody
    ) {
      return NextResponse.json(
        { error: "Forbidden: Modifying role, user ID, or account activation status is prohibited." },
        { status: 403 }
      );
    }

    const parsed = combinedProfileUpdateSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (parsed.data.fullName !== undefined) {
      updates.full_name = parsed.data.fullName;
    }

    if (parsed.data.avatarUrl !== undefined) {
      updates.avatar_url = parsed.data.avatarUrl || null;
    }

    if (parsed.data.privacySettings !== undefined) {
      updates.privacy_settings = {
        share_goals: parsed.data.privacySettings.shareGoals,
        share_finance: parsed.data.privacySettings.shareFinance,
        share_health: parsed.data.privacySettings.shareHealth,
        share_career: parsed.data.privacySettings.shareCareer,
      };
    }

    const { data: updatedProfile, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.id) // Strictly user-isolated!
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      message: "Profile updated successfully",
      profile: updatedProfile,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
