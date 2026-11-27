import type { SupabaseClient } from "@supabase/supabase-js";

export function nextEventOccurrence(startTime: string, rule: string | null, now: Date): Date | null {
  const first = new Date(startTime);
  if (Number.isNaN(first.getTime())) return null;
  if (first >= now) return first;
  const elapsed = now.getTime() - first.getTime();
  if (rule === "daily" || rule === "weekly") {
    const step = (rule === "daily" ? 1 : 7) * 86400000;
    return new Date(first.getTime() + Math.ceil(elapsed / step) * step);
  }
  if (rule === "monthly") {
    let months = (now.getUTCFullYear() - first.getUTCFullYear()) * 12 + now.getUTCMonth() - first.getUTCMonth();
    const occurrence = (offset: number) => { const year = first.getUTCFullYear(); const month = first.getUTCMonth() + offset; const day = Math.min(first.getUTCDate(), new Date(Date.UTC(year, month + 1, 0)).getUTCDate()); return new Date(Date.UTC(year, month, day, first.getUTCHours(), first.getUTCMinutes(), first.getUTCSeconds())); };
    let candidate = occurrence(months);
    if (candidate < now) candidate = occurrence(++months);
    return candidate;
  }
  return null;
}

export async function deliverCalendarAndTaskNotices(supabase: SupabaseClient, userId: string, now = new Date()) {
  const horizon = new Date(now.getTime() + 86400000);
  const catchup = new Date(now.getTime() - 7 * 86400000);
  const [{ data: tasks, error: taskError }, { data: events, error: eventError }] = await Promise.all([
    supabase.from("tasks").select("id,title,due_date,status").eq("user_id", userId).neq("status", "done").neq("status", "cancelled").gte("due_date", catchup.toISOString().slice(0, 10)).lte("due_date", horizon.toISOString().slice(0, 10)),
    supabase.from("events").select("id,title,start_time,recurrence_rule").eq("user_id", userId).lte("start_time", horizon.toISOString()),
  ]);
  if (taskError || eventError) throw new Error("Could not process upcoming notifications");
  const alerts: { user_id: string; type: string; title: string; message: string; entity_type: string; entity_id: string; dedupe_key: string }[] = [];
  for (const task of tasks || []) {
    alerts.push({ user_id: userId, type: "task_due", title: `Task due: ${task.title}`, message: String(task.due_date), entity_type: "task", entity_id: task.id, dedupe_key: `task:${task.id}:${task.due_date}` });
  }
  for (const event of events || []) {
    let occurrence = nextEventOccurrence(String(event.start_time), event.recurrence_rule, catchup);
    for (let i = 0; i < 9 && occurrence && occurrence <= horizon; i++) {
      alerts.push({ user_id: userId, type: "event_reminder", title: `Upcoming event: ${event.title}`, message: occurrence.toISOString(), entity_type: "event", entity_id: event.id, dedupe_key: `event:${event.id}:${occurrence.toISOString()}` });
      occurrence = nextEventOccurrence(String(event.start_time), event.recurrence_rule, new Date(occurrence.getTime() + 1));
    }
  }
  if (alerts.length) {
    const { error } = await supabase.from("notifications").upsert(alerts, { onConflict: "user_id,dedupe_key", ignoreDuplicates: true });
    if (error) throw new Error("Could not save upcoming notifications");
  }
}
