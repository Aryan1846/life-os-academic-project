import { z } from "zod";

const text = z.string().trim().min(1).max(200);
const optional = z.string().trim().max(2000).nullable().optional();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const time = z.string().datetime({ offset: true });
const id = z.string().uuid();

export const schemas = {
  transactions: z.object({ type: z.enum(["income", "expense"]), category: text, amount: z.number().positive().finite(), description: optional, transaction_date: date }),
  budgets: z.object({ category: text, monthly_limit: z.number().positive().finite(), alert_threshold: z.number().min(0.01).max(1) }),
  health_activities: z.object({ activity_type: text, duration_minutes: z.number().int().nonnegative().nullable().optional(), calories_burned: z.number().int().nonnegative().nullable().optional(), notes: optional, activity_date: date, sleep_hours: z.number().min(0).max(24).nullable().optional(), metric_value: z.number().finite().nullable().optional(), metric_unit: z.string().max(30).nullable().optional() }),
  career_items: z.object({ type: z.enum(["skill", "certification", "milestone", "course", "project", "idea", "application"]), title: text, description: optional, status: z.enum(["planned", "in_progress", "completed", "abandoned"]), goal_id: id.nullable().optional(), metadata: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(), target_date: date.nullable().optional() }),
  contacts: z.object({ name: text, relationship_type: optional, email: z.union([z.string().email(), z.literal("")]).nullable().optional(), phone: optional, notes: optional, tags: z.array(text).max(20) }),
  interactions: z.object({ contact_id: id, type: text, notes: optional, interaction_date: date }),
  events: z.object({ title: text, description: optional, start_time: time, end_time: time.nullable().optional(), is_all_day: z.boolean(), recurrence_rule: z.enum(["none", "daily", "weekly", "monthly"]).nullable().optional() }).refine(v => !v.end_time || v.end_time >= v.start_time, { message: "End must follow start", path: ["end_time"] }),
  reminders: z.object({ title: text, remind_at: time, entity_type: z.enum(["event", "task", "contact"]).nullable().optional(), entity_id: id.nullable().optional() }).refine(v => Boolean(v.entity_type) === Boolean(v.entity_id), { message: "Choose both a linked item and its type" }),
} as const;

export type Phase3Table = keyof typeof schemas;
export const phase3Tables = Object.keys(schemas) as Phase3Table[];
export function isPhase3Table(value: string): value is Phase3Table { return phase3Tables.includes(value as Phase3Table); }

export function validatePhase3(table: Phase3Table, body: unknown): { success: true; data: Record<string, unknown> } | { success: false; error: unknown } {
  const result = schemas[table].safeParse(body);
  return result.success ? { success: true, data: result.data as Record<string, unknown> } : { success: false, error: result.error.flatten() };
}
