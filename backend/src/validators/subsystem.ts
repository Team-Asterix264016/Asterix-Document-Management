import { z } from "zod";

export const createSubsystemSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().default(""),
  parentBroadCategory: z.string().optional().default(""),
});

export const updateSubsystemSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  parentBroadCategory: z.string().optional(),
  active: z.boolean().optional(),
});
