import { z } from "zod";

export const habitFrequencySchema = z.enum(["daily", "weekly", "monthly"]);

export const createHabitSchema = z.object({
  title: z
    .string()
    .min(1, "Habit title is required")
    .max(120, "Habit title cannot exceed 120 characters")
    .trim(),
  description: z.string().max(1000).optional().nullable(),
  frequency: habitFrequencySchema.default("daily"),
  target_count: z.number().int().min(1, "Target count must be at least 1").max(50).default(1),
  is_active: z.boolean().default(true),
});

export const updateHabitSchema = createHabitSchema.partial();

export const logHabitSchema = z.object({
  completed_at: z.string().datetime().optional(),
  notes: z.string().max(500).optional().nullable(),
});

export type CreateHabitInput = z.infer<typeof createHabitSchema>;
export type UpdateHabitInput = z.infer<typeof updateHabitSchema>;
export type LogHabitInput = z.infer<typeof logHabitSchema>;
