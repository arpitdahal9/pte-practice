import type { TaskType } from "@prisma/client";

/** Normalized scoring result stored against an attempt. */
export interface ScoreResult {
  /** 0–90, PTE-aligned. */
  overall: number;
  /** Per-sub-criterion raw scores (each on the criterion's own small scale). */
  breakdown: Record<string, number>;
  /** Human-readable feedback paragraph. */
  feedback: string;
  strengths: string[];
  improvements: string[];
  /** Raw model output / computation detail, for audit. */
  raw?: unknown;
  scorerModel?: string;
  scorerVersion: string;
  /** True when produced by a labeled fallback (no API key / API failure). */
  mock?: boolean;
}

/** Everything a scorer needs. */
export interface ScoreContext {
  taskType: TaskType;
  /** Validated Attempt.responseData. */
  response: unknown;
  /** Question.payload. */
  payload: unknown;
  promptText?: string | null;
  /** STT output for speaking tasks. */
  transcript?: string | null;
  /** Basic audio metrics for speaking tasks. */
  audioMeta?: { durationSec?: number; wordCount?: number; wpm?: number };
}

export const SCORER_VERSION = "v1";
