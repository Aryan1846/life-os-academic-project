export type DatedRecord = Record<string, unknown>;
export type AnalyticsRows = { goals: DatedRecord[]; tasks: DatedRecord[]; habits: DatedRecord[]; habit_logs: DatedRecord[]; transactions: DatedRecord[]; health_activities: DatedRecord[]; career_items: DatedRecord[]; interactions: DatedRecord[]; events: DatedRecord[] };
export type Period = "week" | "month" | "year";
export function isoDay(value: unknown): string { return typeof value === "string" ? value.slice(0, 10) : ""; }
export function periodStart(period: Period, now = new Date()): string {
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (period === "week") date.setUTCDate(date.getUTCDate() - 6);
  if (period === "month") date.setUTCDate(date.getUTCDate() - 29);
  if (period === "year") date.setUTCDate(date.getUTCDate() - 364);
  return date.toISOString().slice(0, 10);
}
export function aggregateAnalytics(rows: AnalyticsRows, from: string, to: string, period: Period, category = "") {
  const useCategory = (row: DatedRecord) => !category || String(row.category || "").toLowerCase() === category.toLowerCase();
  const goals = rows.goals.filter(useCategory);
  const transactions = rows.transactions.filter(useCategory);
  const index = new Map<string, { label: string; goalsCompleted: number; tasksCompleted: number; habitLogs: number; income: number; expenses: number; exerciseMinutes: number; sleepHours: number; sleepNights: number; careerCompleted: number; interactions: number }>();
  const current = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(`${to}T00:00:00.000Z`);
  for (; current <= end; current.setUTCDate(current.getUTCDate() + 1)) {
    const day = current.toISOString().slice(0, 10);
    const label = period === "year" ? day.slice(0, 7) : day;
    if (!index.has(label)) index.set(label, { label, goalsCompleted: 0, tasksCompleted: 0, habitLogs: 0, income: 0, expenses: 0, exerciseMinutes: 0, sleepHours: 0, sleepNights: 0, careerCompleted: 0, interactions: 0 });
  }
  const add = (records: DatedRecord[], dateKey: string, fn: (bucket: NonNullable<ReturnType<typeof index.get>>, record: DatedRecord) => void) => {
    for (const record of records) { const day = isoDay(record[dateKey]); const bucket = index.get(period === "year" ? day.slice(0, 7) : day); if (bucket) fn(bucket, record); }
  };
  add(goals.filter(row => row.status === "completed"), "completed_at", b => b.goalsCompleted++);
  add(rows.tasks.filter(row => row.status === "done"), "completed_at", b => b.tasksCompleted++);
  add(rows.habit_logs, "completed_at", b => b.habitLogs++);
  add(transactions, "transaction_date", (b, row) => { if (row.type === "income") b.income += Number(row.amount); else b.expenses += Number(row.amount); });
  add(rows.health_activities, "activity_date", (b, row) => { b.exerciseMinutes += Number(row.duration_minutes || 0); if (row.sleep_hours != null) { b.sleepHours += Number(row.sleep_hours); b.sleepNights++; } });
  add(rows.career_items.filter(row => row.status === "completed"), "completed_at", b => b.careerCompleted++);
  add(rows.interactions, "interaction_date", b => b.interactions++);
  const series = [...index.values()].map(({ sleepHours, sleepNights, ...bucket }) => ({ ...bucket, savings: bucket.income - bucket.expenses, averageSleep: sleepNights ? sleepHours / sleepNights : null }));
  const sum = (key: keyof typeof series[number]) => series.reduce((total, row) => total + Number(row[key] || 0), 0);
  const spendingByCategory = Object.entries(transactions.filter(row => row.type === "expense").reduce<Record<string, number>>((acc, row) => { const name = String(row.category); acc[name] = (acc[name] || 0) + Number(row.amount); return acc; }, {})).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
  const activeHabits = rows.habits.filter(row => row.is_active !== false);
  let expectedLogs = 0; let completedLogs = 0;
  for (const habit of activeHabits) {
    const effectiveFrom = isoDay(habit.created_at) > from ? isoDay(habit.created_at) : from;
    const activeDays = Math.max(0, Math.floor((end.getTime() - new Date(`${effectiveFrom}T00:00:00.000Z`).getTime()) / 86400000) + 1);
    const frequency = String(habit.frequency);
    const periods = frequency === "weekly" ? Math.ceil(activeDays / 7) : frequency === "monthly" ? (activeDays ? (end.getUTCFullYear() - Number(effectiveFrom.slice(0, 4))) * 12 + end.getUTCMonth() - Number(effectiveFrom.slice(5, 7)) + 1 : 0) : activeDays;
    const target = Math.max(1, Number(habit.target_count || 1));
    const due = periods * target;
    expectedLogs += due;
    completedLogs += Math.min(due, rows.habit_logs.filter(log => log.habit_id === habit.id).length);
  }
  return { series, spendingByCategory, summary: { goalsCompleted: sum("goalsCompleted"), tasksCompleted: sum("tasksCompleted"), habitLogs: sum("habitLogs"), habitConsistency: expectedLogs ? Math.round(completedLogs / expectedLogs * 100) : null, longestStreak: Math.max(0, ...activeHabits.map(row => Number(row.longest_streak || 0))), income: sum("income"), expenses: sum("expenses"), savings: sum("savings"), exerciseMinutes: sum("exerciseMinutes"), careerCompleted: sum("careerCompleted"), interactions: sum("interactions"), events: rows.events.length, averageSleep: (() => { const nights = rows.health_activities.filter(row => row.sleep_hours != null); return nights.length ? nights.reduce((total, row) => total + Number(row.sleep_hours), 0) / nights.length : null; })() } };
}
