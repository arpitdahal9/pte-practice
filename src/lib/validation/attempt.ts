import { z } from "zod";

export const createAttemptSchema = z.object({
  questionId: z.string().min(1),
  mode: z.enum(["PRACTICE", "MOCK"]).default("PRACTICE"),
  /** Task-specific response; validated against the task's schema server-side. */
  responseData: z.unknown(),
  durationSec: z.number().int().nonnegative().optional(),
  /** For speaking tasks: STT transcript + metrics (from /api/transcribe). */
  transcript: z.string().optional(),
  audioMeta: z
    .object({
      durationSec: z.number().optional(),
      wordCount: z.number().optional(),
      wpm: z.number().optional(),
    })
    .optional(),
  mockAttemptId: z.string().optional(),
});

export type CreateAttemptInput = z.infer<typeof createAttemptSchema>;
