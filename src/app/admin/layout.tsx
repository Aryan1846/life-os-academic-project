import { adminContext } from "@/lib/admin/guard";
import { AppShell } from "@/components/layout/shell";
import { redirect } from "next/navigation";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ctx = await adminContext();
  if (ctx.status === 401) redirect("/login");
  if (!ctx.user) redirect("/dashboard");
  const { data: profile } = await ctx.supabase.from("profiles").select("full_name").eq("id", ctx.user.id).single();
  return <AppShell userEmail={ctx.user.email} userName={profile?.full_name || "Administrator"} userRole="admin">{children}</AppShell>;
}
