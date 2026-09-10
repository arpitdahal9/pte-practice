import { z } from "zod";

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  targetScore: z.number().int().min(10).max(90).nullable().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
