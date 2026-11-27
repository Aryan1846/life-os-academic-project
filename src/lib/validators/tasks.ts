import { z } from "zod";

export const taskPrioritySchema = z.enum(["low", "medium", "high", "urgent"]);
export const taskStatusSchema = z.enum(["todo", "in_progress", "done", "cancelled"]);

export const createTaskSchema = z.object({
  title: z
    .string()
    .min(1, "Task title is required")
    .max(200, "Task title cannot exceed 200 characters")
    .trim(),
  description: z.string().max(2000, "Description cannot exceed 2000 characters").optional().nullable(),
  priority: taskPrioritySchema.default("medium"),
  status: taskStatusSchema.default("todo"),
  due_date: z
    .string()
    .datetime({ message: "Due date must be a valid ISO 8601 string" })
    .optional()
    .nullable(),
  goal_id: z.string().uuid("Invalid goal ID").optional().nullable(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).trim().optional(),
  description: z.string().max(2000).optional().nullable(),
  priority: taskPrioritySchema.optional(),
  status: taskStatusSchema.optional(),
  due_date: z.string().datetime().optional().nullable(),
  goal_id: z.string().uuid().optional().nullable(),
  completed_at: z.string().datetime().optional().nullable(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
