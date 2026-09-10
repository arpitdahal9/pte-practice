import { z } from "zod";
import type { TaskType } from "@prisma/client";
import { TASK_TYPES } from "./taskTypes";

/**
 * Shapes for Question.payload (content) and Attempt.responseData (user answer),
 * per task type. `payload` is stored as JSON; these zod schemas validate it on
 * write (seed/admin) and validate responses on submission (API).
 *
 * Placeholder convention for gap-fill tasks: gaps in `text` are written as
 * `{{blankId}}` tokens, e.g. "The {{b1}} sat on the {{b2}}."
 */

// ── Shared ──────────────────────────────────────────────────
export const optionSchema = z.object({
  id: z.string(),
  text: z.string(),
});
export type Option = z.infer<typeof optionSchema>;

export const blankSchema = z.object({
  id: z.string(),
  answer: z.string(),
  /** For dropdown-style gaps (R_FILL_BLANKS): the choices shown. */
  options: z.array(z.string()).optional(),
});

// ── Payload schemas (per task family) ───────────────────────
export const mcqSinglePayload = z.object({
  /** Question stem shown to the user (not an answer). */
  question: z.string().optional(),
  options: z.array(optionSchema).min(2),
  correctOptionId: z.string(),
});

export const mcqMultiPayload = z.object({
  question: z.string().optional(),
  options: z.array(optionSchema).min(2),
  correctOptionIds: z.array(z.string()).min(1),
});

export const reorderPayload = z.object({
  items: z.array(optionSchema).min(2), // id + text (paragraph)
  correctOrder: z.array(z.string()).min(2), // item ids in correct order
});

export const fillDragPayload = z.object({
  text: z.string(), // contains {{blankId}} tokens
  blanks: z.array(blankSchema).min(1),
  wordBank: z.array(z.string()).min(1), // draggable words (includes distractors)
});

export const fillDropdownPayload = z.object({
  text: z.string(),
  blanks: z.array(blankSchema.extend({ options: z.array(z.string()).min(2) })).min(1),
});

export const typedBlanksPayload = z.object({
  text: z.string(), // {{blankId}} tokens; user types each
  blanks: z.array(blankSchema).min(1),
});

export const dictationPayload = z.object({
  referenceText: z.string(),
});

export const highlightIncorrectPayload = z.object({
  transcriptWords: z.array(z.string()).min(1), // words shown to the user
  incorrectIndices: z.array(z.number().int().nonnegative()), // which differ from audio
});

export const essayPayload = z.object({
  prompt: z.string(),
});

export const summarizeWrittenPayload = z.object({
  passage: z.string(),
});

export const summarizeSpokenPayload = z.object({
  transcript: z.string().optional(), // reference transcript for scoring
  keyPoints: z.array(z.string()).optional(),
});

export const readAloudPayload = z.object({
  text: z.string(),
});

export const speakingPromptPayload = z.object({
  /** reference transcript / expected content used for AI scoring */
  transcript: z.string().optional(),
  sentence: z.string().optional(),
  question: z.string().optional(),
  keyPoints: z.array(z.string()).optional(),
  acceptedAnswers: z.array(z.string()).optional(),
});

// ── Response schemas (per responseKind) ─────────────────────
const mcqSingleResponse = z.object({ selectedOptionId: z.string() });
const mcqMultiResponse = z.object({ selectedOptionIds: z.array(z.string()) });
const reorderResponse = z.object({ order: z.array(z.string()) });
const fillResponse = z.object({ answers: z.record(z.string(), z.string()) });
const textResponse = z.object({ text: z.string().min(1) });
const highlightResponse = z.object({ selectedIndices: z.array(z.number().int()) });
const audioResponse = z.object({
  audioUrl: z.string(),
  transcript: z.string().optional(),
});

/** The zod schema a submission's `responseData` must satisfy for a task type. */
export function responseSchemaFor(taskType: TaskType): z.ZodTypeAny {
  const kind = TASK_TYPES[taskType].responseKind;
  switch (kind) {
    case "AUDIO":
      return audioResponse;
    case "TEXT":
      // typed-blank listening tasks also use text answers map
      if (taskType === "L_FILL_BLANKS") return fillResponse;
      return textResponse;
    case "MCQ_SINGLE":
      return mcqSingleResponse;
    case "MCQ_MULTI":
      return mcqMultiResponse;
    case "REORDER":
      return reorderResponse;
    case "FILL_DRAG":
    case "FILL_DROPDOWN":
      return fillResponse;
    case "HIGHLIGHT":
      return highlightResponse;
    default:
      return z.any();
  }
}

/** The zod schema a question's `payload` must satisfy for a task type. */
export function payloadSchemaFor(taskType: TaskType): z.ZodTypeAny {
  switch (taskType) {
    case "MCQ_SINGLE_R":
    case "MCQ_SINGLE_L":
    case "HIGHLIGHT_SUMMARY":
    case "SELECT_MISSING_WORD":
      return mcqSinglePayload;
    case "MCQ_MULTI_R":
    case "MCQ_MULTI_L":
      return mcqMultiPayload;
    case "REORDER_PARAGRAPHS":
      return reorderPayload;
    case "RW_FILL_BLANKS":
      return fillDragPayload;
    case "R_FILL_BLANKS":
      return fillDropdownPayload;
    case "L_FILL_BLANKS":
      return typedBlanksPayload;
    case "WRITE_FROM_DICTATION":
      return dictationPayload;
    case "HIGHLIGHT_INCORRECT_WORDS":
      return highlightIncorrectPayload;
    case "WRITE_ESSAY":
      return essayPayload;
    case "SUMMARIZE_WRITTEN_TEXT":
      return summarizeWrittenPayload;
    case "SUMMARIZE_SPOKEN_TEXT":
      return summarizeSpokenPayload;
    case "READ_ALOUD":
      return readAloudPayload;
    case "REPEAT_SENTENCE":
    case "DESCRIBE_IMAGE":
    case "RETELL_LECTURE":
    case "ANSWER_SHORT_QUESTION":
      return speakingPromptPayload;
    default:
      return z.any();
  }
}

// Convenience response types
export type McqSingleResponse = z.infer<typeof mcqSingleResponse>;
export type McqMultiResponse = z.infer<typeof mcqMultiResponse>;
export type ReorderResponse = z.infer<typeof reorderResponse>;
export type FillResponse = z.infer<typeof fillResponse>;
export type TextResponse = z.infer<typeof textResponse>;
export type HighlightResponse = z.infer<typeof highlightResponse>;
export type AudioResponse = z.infer<typeof audioResponse>;
