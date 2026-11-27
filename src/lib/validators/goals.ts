import { z } from "zod";

export const goalCategorySchema = z.enum([
  "Career",
  "Finance",
  "Health",
  "Personal",
  "Education",
  "Relationships",
  "Other",
]);

export const goalStatusSchema = z.enum(["active", "completed", "paused", "abandoned"]);

export const createGoalSchema = z.object({
  title: z
    .string()
    .min(1, "Goal title is required")
    .max(160, "Goal title cannot exceed 160 characters")
    .trim(),
  description: z.string().max(1000, "Description cannot exceed 1000 characters").optional().nullable(),
  category: z.string().min(1).max(50).optional().nullable(),
  target_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Target date must be in YYYY-MM-DD format")
    .optional()
    .nullable(),
  progress: z.number().int().min(0).max(100).default(0),
  status: goalStatusSchema.default("active"),
});

export const updateGoalSchema = createGoalSchema.partial();

export type CreateGoalInput = z.infer<typeof createGoalSchema>;
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;
