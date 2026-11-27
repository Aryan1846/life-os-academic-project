import { createClient } from "@/lib/supabase/server";
import { aggregateAnalytics, periodStart, type AnalyticsRows, type Period } from "@/lib/analytics/aggregate";
import { NextResponse } from "next/server";
import { z } from "zod";

const querySchema = z.object({ period: z.enum(["week", "month", "year"]).default("month"), from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), category: z.string().trim().max(100).default("") });
const sources = {
  goals: { date: "completed_at", columns: "status,completed_at,category" },
  tasks: { date: "completed_at", columns: "status,completed_at" },
  habits: { date: null, columns: "id,is_active,frequency,target_count,created_at,longest_streak" },
  habit_logs: { date: "completed_at", columns: "habit_id,completed_at" },
  transactions: { date: "transaction_date", columns: "type,category,amount,transaction_date" },
  health_activities: { date: "activity_date", columns: "activity_date,duration_minutes,sleep_hours" },
  career_items: { date: "completed_at", columns: "status,completed_at" },
  interactions: { date: "interaction_date", columns: "interaction_date" },
  events: { date: "start_time", columns: "start_time" },
} as const;

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Invalid filters" }, { status: 400 });
  const today = new Date().toISOString().slice(0, 10);
  const period: Period = parsed.data.period;
  const from = parsed.data.from || periodStart(period);
  const to = parsed.data.to || today;
  const startDate = new Date(`${from}T00:00:00.000Z`);
  const endDate = new Date(`${to}T00:00:00.000Z`);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || startDate.toISOString().slice(0, 10) !== from || endDate.toISOString().slice(0, 10) !== to || endDate < startDate || (endDate.getTime() - startDate.getTime()) / 86400000 > 366 || to > today) return NextResponse.json({ error: "Select a valid range of at most 366 days ending today or earlier" }, { status: 400 });
  const exclusiveEnd = new Date(endDate.getTime() + 86400000).toISOString();
  try {
    const entries = await Promise.all(Object.entries(sources).map(async ([table, source]) => {
      const records: Record<string, unknown>[] = [];
      for (let offset = 0; ; offset += 1000) {
        let query = supabase.from(table).select(source.columns).eq("user_id", user.id).range(offset, offset + 999);
        if (source.date) query = source.date === "transaction_date" || source.date === "activity_date" || source.date === "interaction_date" ? query.gte(source.date, from).lte(source.date, to) : query.gte(source.date, from).lt(source.date, exclusiveEnd);
        const { data, error } = await query;
        if (error) throw new Error(`Could not load ${table}`);
        records.push(...((data || []) as unknown as Record<string, unknown>[]));
        if (!data || data.length < 1000) break;
      }
      return [table, records] as const;
    }));
    const rows = Object.fromEntries(entries) as AnalyticsRows;
    return NextResponse.json({ from, to, period, category: parsed.data.category, ...aggregateAnalytics(rows, from, to, period, parsed.data.category) });
  } catch { return NextResponse.json({ error: "Could not calculate analytics" }, { status: 500 }); }
}
