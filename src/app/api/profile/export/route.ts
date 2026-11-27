import { createClient } from "@/lib/supabase/server";
import { personalExportTables, decisionChildExportTables } from "@/lib/export/tables";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: profile, error: profileError } = await supabase.from("profiles").select("id,full_name,avatar_url,privacy_settings,created_at,updated_at").eq("id", user.id).single();
  if (profileError) return NextResponse.json({ error: "Could not export profile" }, { status: 500 });
  try {
    const entries = await Promise.all(Object.entries(personalExportTables).map(async ([table, columns]) => {
      const records: Record<string, unknown>[] = [];
      for (let offset = 0; ; offset += 1000) {
        const { data, error } = await supabase.from(table).select(columns).eq("user_id", user.id).range(offset, offset + 999);
        if (error) throw new Error("Export query failed");
        records.push(...((data || []) as unknown as Record<string, unknown>[]));
        if (!data || data.length < 1000) break;
      }
      return [table, records] as const;
    }));
    const data = Object.fromEntries(entries);
    const decisionIds = ((data.decisions || []) as { id: string }[]).map(item => item.id);
    for (const [table, columns] of Object.entries(decisionChildExportTables)) {
      const records: Record<string, unknown>[] = [];
      for (let batch = 0; batch < decisionIds.length; batch += 100) {
        for (let offset = 0; ; offset += 1000) {
          const { data: rows, error } = await supabase.from(table).select(columns).in("decision_id", decisionIds.slice(batch, batch + 100)).range(offset, offset + 999);
          if (error) throw new Error("Decision export query failed");
          records.push(...((rows || []) as unknown as Record<string, unknown>[]));
          if (!rows || rows.length < 1000) break;
        }
      }
      data[table] = records;
    }
    const document = { format: "life-os-personal-data-v1", exported_at: new Date().toISOString(), profile, data };
    return new Response(JSON.stringify(document, null, 2), { headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="life-os-export-${new Date().toISOString().slice(0, 10)}.json"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch { return NextResponse.json({ error: "Could not export personal records" }, { status: 500 }); }
}
