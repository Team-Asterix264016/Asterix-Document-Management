import { z } from "zod";

export const aiQuerySchema = z.object({
  query: z.string().trim().min(1, "Query is required").max(500, "Query is too long (max 500 characters)"),
});
