import type { TaskType } from "@prisma/client";
import type { ScoreContext } from "./types";

export interface Criterion {
  key: string;
  label: string;
  /** Maximum raw points for this criterion. */
  max: number;
  /** Guidance the model uses to award points. */
  description: string;
}

export interface RubricSpec {
  taskType: TaskType;
  /** Examiner persona / task framing. */
  persona: string;
  criteria: Criterion[];
  /** Build the reference + response section shown to the model. */
  buildReference: (ctx: ScoreContext) => string;
  /** Words expected (for form checks / mock heuristic). */
  expectedWords?: { min: number; max: number };
  /** True if scored from a speech transcript + audio metrics. */
  speech?: boolean;
}

const asBlock = (label: string, value?: string | null) =>
  value ? `${label}:\n${value}\n` : "";

// ── Writing ─────────────────────────────────────────────────
const WRITE_ESSAY: RubricSpec = {
  taskType: "WRITE_ESSAY",
  persona:
    "You are an experienced PTE Academic writing examiner scoring a 200–300 word argumentative essay against the official-style analytic rubric.",
  expectedWords: { min: 200, max: 300 },
  criteria: [
    { key: "content", label: "Content", max: 3, description: "Addresses the prompt fully with relevant, well-supported ideas." },
    { key: "development", label: "Development, structure & coherence", max: 2, description: "Clear intro/body/conclusion, logical flow, cohesive devices." },
    { key: "form", label: "Form", max: 2, description: "Length within 200–300 words; paragraphed prose. Award 0 if far outside range." },
    { key: "grammar", label: "Grammar", max: 2, description: "Range and correctness of grammatical structures." },
    { key: "vocabulary", label: "Vocabulary", max: 2, description: "Range and appropriacy of word choice." },
    { key: "linguistic", label: "General linguistic range", max: 2, description: "Ability to express nuanced meaning with varied phrasing." },
    { key: "spelling", label: "Spelling", max: 2, description: "Correct spelling throughout." },
  ],
  buildReference: (ctx) =>
    asBlock("Essay prompt", (ctx.payload as { prompt?: string })?.prompt ?? ctx.promptText) +
    asBlock("Candidate essay", (ctx.response as { text?: string })?.text),
};

const SUMMARIZE_WRITTEN_TEXT: RubricSpec = {
  taskType: "SUMMARIZE_WRITTEN_TEXT",
  persona:
    "You are a PTE examiner scoring a one-sentence summary of a passage (5–75 words, must be a single sentence).",
  expectedWords: { min: 5, max: 75 },
  criteria: [
    { key: "content", label: "Content", max: 2, description: "Captures the main point(s) of the passage." },
    { key: "form", label: "Form", max: 1, description: "Exactly ONE sentence of 5–75 words. Award 0 otherwise." },
    { key: "grammar", label: "Grammar", max: 2, description: "Grammatically correct, well-formed sentence." },
    { key: "vocabulary", label: "Vocabulary", max: 2, description: "Appropriate, precise word choice." },
  ],
  buildReference: (ctx) =>
    asBlock("Source passage", (ctx.payload as { passage?: string })?.passage ?? ctx.promptText) +
    asBlock("Candidate summary", (ctx.response as { text?: string })?.text),
};

// ── Listening (written production) ──────────────────────────
const SUMMARIZE_SPOKEN_TEXT: RubricSpec = {
  taskType: "SUMMARIZE_SPOKEN_TEXT",
  persona:
    "You are a PTE examiner scoring a 50–70 word summary of a short lecture the candidate listened to.",
  expectedWords: { min: 50, max: 70 },
  criteria: [
    { key: "content", label: "Content", max: 2, description: "Reflects the key points of the recording." },
    { key: "form", label: "Form", max: 2, description: "Length 50–70 words. Award 0 if far outside." },
    { key: "grammar", label: "Grammar", max: 2, description: "Correct, varied grammar." },
    { key: "vocabulary", label: "Vocabulary", max: 2, description: "Appropriate academic vocabulary." },
    { key: "spelling", label: "Spelling", max: 2, description: "Correct spelling." },
  ],
  buildReference: (ctx) =>
    asBlock("Reference transcript of the recording", (ctx.payload as { transcript?: string })?.transcript ?? ctx.promptText) +
    asBlock("Key points", ((ctx.payload as { keyPoints?: string[] })?.keyPoints ?? []).join("; ")) +
    asBlock("Candidate summary", (ctx.response as { text?: string })?.text),
};

// ── Speaking (transcript + audio metrics) ───────────────────
function speakingReference(ctx: ScoreContext, referenceLabel: string, reference?: string): string {
  const meta = ctx.audioMeta;
  const metaLine = meta
    ? `Audio metrics: duration=${meta.durationSec ?? "?"}s, words=${meta.wordCount ?? "?"}, wpm=${meta.wpm ?? "?"}\n`
    : "";
  return (
    asBlock(referenceLabel, reference) +
    asBlock("Automatic transcript of the candidate's speech", ctx.transcript) +
    metaLine +
    "Note: pronunciation and fluency are estimated from the transcript, timing, and speech rate; treat them as indicative."
  );
}

const speakingCriteria = (contentMax: number): Criterion[] => [
  { key: "content", label: "Content", max: contentMax, description: "Relevance and completeness relative to the expected response." },
  { key: "oral_fluency", label: "Oral fluency", max: 5, description: "Smooth, even pace without unnatural pauses/hesitations (inferred from rate & transcript)." },
  { key: "pronunciation", label: "Pronunciation", max: 5, description: "Intelligibility inferred from transcript accuracy and completeness." },
];

const READ_ALOUD: RubricSpec = {
  taskType: "READ_ALOUD",
  persona: "You are a PTE speaking examiner scoring a Read Aloud response.",
  speech: true,
  criteria: speakingCriteria(3),
  buildReference: (ctx) =>
    speakingReference(ctx, "Text the candidate was asked to read", (ctx.payload as { text?: string })?.text ?? ctx.promptText ?? undefined),
};

const REPEAT_SENTENCE: RubricSpec = {
  taskType: "REPEAT_SENTENCE",
  persona: "You are a PTE speaking examiner scoring a Repeat Sentence response.",
  speech: true,
  criteria: speakingCriteria(3),
  buildReference: (ctx) =>
    speakingReference(ctx, "Sentence the candidate had to repeat", (ctx.payload as { sentence?: string })?.sentence ?? ctx.promptText ?? undefined),
};

const DESCRIBE_IMAGE: RubricSpec = {
  taskType: "DESCRIBE_IMAGE",
  persona: "You are a PTE speaking examiner scoring a Describe Image response.",
  speech: true,
  criteria: speakingCriteria(5),
  buildReference: (ctx) =>
    speakingReference(
      ctx,
      "Key points that should be mentioned",
      ((ctx.payload as { keyPoints?: string[] })?.keyPoints ?? []).join("; ") || ctx.promptText || undefined,
    ),
};

const RETELL_LECTURE: RubricSpec = {
  taskType: "RETELL_LECTURE",
  persona: "You are a PTE speaking examiner scoring a Re-tell Lecture response.",
  speech: true,
  criteria: speakingCriteria(5),
  buildReference: (ctx) =>
    speakingReference(
      ctx,
      "Reference transcript / key points of the lecture",
      (ctx.payload as { transcript?: string })?.transcript ??
        (((ctx.payload as { keyPoints?: string[] })?.keyPoints ?? []).join("; ") ||
          ctx.promptText ||
          undefined),
    ),
};

const ANSWER_SHORT_QUESTION: RubricSpec = {
  taskType: "ANSWER_SHORT_QUESTION",
  persona:
    "You are a PTE examiner scoring Answer Short Question — a correct short answer earns full marks, an incorrect one earns zero.",
  speech: true,
  criteria: [
    { key: "content", label: "Content (correctness)", max: 1, description: "1 if the answer is correct/acceptable, else 0." },
  ],
  buildReference: (ctx) =>
    speakingReference(
      ctx,
      "Question and accepted answers",
      `${(ctx.payload as { question?: string })?.question ?? ctx.promptText ?? ""}\nAccepted: ${((ctx.payload as { acceptedAnswers?: string[] })?.acceptedAnswers ?? []).join(", ")}`,
    ),
};

export const RUBRICS: Partial<Record<TaskType, RubricSpec>> = {
  WRITE_ESSAY,
  SUMMARIZE_WRITTEN_TEXT,
  SUMMARIZE_SPOKEN_TEXT,
  READ_ALOUD,
  REPEAT_SENTENCE,
  DESCRIBE_IMAGE,
  RETELL_LECTURE,
  ANSWER_SHORT_QUESTION,
};

export function rubricFor(taskType: TaskType): RubricSpec | undefined {
  return RUBRICS[taskType];
}

/**
 * Maximum points for each criterion of a task, e.g. { content: 3, form: 2 }.
 *
 * The UI needs these to draw a breakdown honestly: criteria are scored on their
 * own small scales (0–1, 0–3, 0–5), so a bar has to be normalised against the
 * criterion's own maximum. Without them, 3/3 and 3/5 look identical.
 */
export function criterionMaxes(taskType: TaskType): Record<string, number> {
  const spec = RUBRICS[taskType];
  if (!spec) return {};
  return Object.fromEntries(spec.criteria.map((c) => [c.key, c.max]));
}
