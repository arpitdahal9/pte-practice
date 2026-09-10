import type { TaskType } from "@prisma/client";
import { callClaudeJson } from "@/lib/scoring/claude";
import { payloadSchemaFor } from "@/lib/pte/schemas";
import { parseBlanks } from "@/lib/pte/blanks";

/**
 * Claude-backed generator for style-alike PTE practice questions.
 *
 * Everything produced here is ORIGINAL practice material generated for this
 * project. It is not official PTE content and carries no affiliation with
 * Pearson — generated items are tagged `ai-generated` so they stay
 * distinguishable from hand-authored seed content in the admin UI.
 *
 * Output is constrained by a per-task JSON schema, then re-validated against
 * the same zod payload schema the API and seed script use, so a malformed item
 * is rejected here rather than corrupting the question bank.
 */

/** A generated item, shaped to match prisma/seed-data.ts `SeedItem`. */
export interface GeneratedItem {
  taskType: TaskType;
  title: string;
  instructions?: string;
  /** Script to be spoken by TTS, for audio-prompt tasks. */
  spoken?: string;
  payload: unknown;
  tags: string[];
  difficulty: number;
}

interface GenSpec {
  /** What the author should produce, in task-specific terms. */
  guidance: string;
  /** JSON schema for this task's `payload`. */
  payloadSchema: Record<string, unknown>;
  /** True when the prompt is delivered as audio and needs a spoken script. */
  spoken?: boolean;
  /** Extra checks beyond the zod payload schema. Return an error string. */
  validate?: (payload: Record<string, unknown>) => string | null;
}

const str = { type: "string" } as const;
const strArray = { type: "array", items: { type: "string" } } as const;

const optionsSchema = {
  type: "array",
  items: {
    type: "object",
    properties: { id: str, text: str },
    required: ["id", "text"],
    additionalProperties: false,
  },
} as const;

const obj = (
  properties: Record<string, unknown>,
  required: string[],
): Record<string, unknown> => ({
  type: "object",
  properties,
  required,
  additionalProperties: false,
});

/**
 * Every `{{token}}` in `text` must have a matching blank, and vice versa. A
 * mismatch renders as a gap the user cannot fill or an answer with no gap.
 */
function checkBlanks(payload: Record<string, unknown>): string | null {
  const text = String(payload.text ?? "");
  const blanks = (payload.blanks ?? []) as { id: string }[];
  const inText = parseBlanks(text)
    .filter((s): s is { type: "blank"; id: string } => s.type === "blank")
    .map((s) => s.id);
  const declared = blanks.map((b) => b.id);

  const missing = inText.filter((id) => !declared.includes(id));
  const unused = declared.filter((id) => !inText.includes(id));
  if (missing.length) return `text has {{${missing.join("}}, {{")}}} with no matching blank`;
  if (unused.length) return `blanks declared but absent from text: ${unused.join(", ")}`;
  if (!inText.length) return "text contains no {{blank}} tokens";
  return null;
}

/** The correct option id must actually exist among the options. */
function checkSingleAnswer(payload: Record<string, unknown>): string | null {
  const options = (payload.options ?? []) as { id: string }[];
  const correct = String(payload.correctOptionId ?? "");
  return options.some((o) => o.id === correct)
    ? null
    : `correctOptionId "${correct}" is not one of the options`;
}

function checkMultiAnswer(payload: Record<string, unknown>): string | null {
  const options = (payload.options ?? []) as { id: string }[];
  const correct = (payload.correctOptionIds ?? []) as string[];
  const ids = options.map((o) => o.id);
  const bad = correct.filter((c) => !ids.includes(c));
  if (bad.length) return `correctOptionIds not among options: ${bad.join(", ")}`;
  if (correct.length === options.length) return "every option marked correct";
  return null;
}

const SPEAKING_NOTE =
  "Use neutral academic English suitable for an international university audience. Avoid culture-specific idioms, named real people, and anything politically sensitive.";

export const GEN_SPECS: Record<TaskType, GenSpec> = {
  // ── Speaking ────────────────────────────────────────────
  READ_ALOUD: {
    guidance: `A single academic sentence of 35–60 words for the candidate to read aloud. It should be one well-formed sentence with some subordinate clauses. ${SPEAKING_NOTE}`,
    payloadSchema: obj({ text: str }, ["text"]),
  },
  REPEAT_SENTENCE: {
    guidance: `One spoken sentence of 8–14 words the candidate must repeat verbatim. Everyday academic/campus register. ${SPEAKING_NOTE}`,
    payloadSchema: obj({ sentence: str }, ["sentence"]),
    spoken: true,
    validate: (p) => (String(p.sentence ?? "").trim() ? null : "sentence is empty"),
  },
  DESCRIBE_IMAGE: {
    guidance:
      "4–5 key points a candidate should mention when describing a chart. Describe them abstractly (trend, largest category, smallest category, comparison) since the chart image is generated separately.",
    payloadSchema: obj({ keyPoints: strArray }, ["keyPoints"]),
  },
  RETELL_LECTURE: {
    guidance: `A 60–90 word lecture excerpt on an academic topic, plus 4 key points a good retelling must cover. ${SPEAKING_NOTE}`,
    payloadSchema: obj({ transcript: str, keyPoints: strArray }, ["transcript", "keyPoints"]),
    spoken: true,
  },
  ANSWER_SHORT_QUESTION: {
    guidance:
      "A general-knowledge question answerable in one or two words, plus every reasonable accepted answer (include singular/plural and common synonyms, all lowercase).",
    payloadSchema: obj({ question: str, acceptedAnswers: strArray }, [
      "question",
      "acceptedAnswers",
    ]),
    spoken: true,
    validate: (p) =>
      ((p.acceptedAnswers as string[]) ?? []).length ? null : "no accepted answers",
  },

  // ── Writing ─────────────────────────────────────────────
  SUMMARIZE_WRITTEN_TEXT: {
    guidance:
      "An academic passage of 200–300 words with a clear main argument, suitable for summarising in a single sentence.",
    payloadSchema: obj({ passage: str }, ["passage"]),
  },
  WRITE_ESSAY: {
    guidance:
      "An argumentative essay prompt inviting a clear position, in the style 'Some people believe X, others believe Y. Discuss both views and give your own opinion.' Keep it to 2–3 sentences.",
    payloadSchema: obj({ prompt: str }, ["prompt"]),
  },

  // ── Reading ─────────────────────────────────────────────
  RW_FILL_BLANKS: {
    guidance:
      "An academic paragraph of 80–120 words with 4–5 gaps written as {{b1}}, {{b2}}, … Each blank needs its correct word. The wordBank must contain every correct answer PLUS 3 plausible distractors, in shuffled order.",
    payloadSchema: obj(
      {
        text: str,
        blanks: {
          type: "array",
          items: obj({ id: str, answer: str }, ["id", "answer"]),
        },
        wordBank: strArray,
      },
      ["text", "blanks", "wordBank"],
    ),
    validate: (p) => {
      const blankErr = checkBlanks(p);
      if (blankErr) return blankErr;
      const bank = (p.wordBank ?? []) as string[];
      const answers = ((p.blanks ?? []) as { answer: string }[]).map((b) => b.answer);
      const missing = answers.filter((a) => !bank.includes(a));
      return missing.length ? `wordBank missing answers: ${missing.join(", ")}` : null;
    },
  },
  MCQ_SINGLE_R: {
    guidance:
      "A reading passage of 120–180 words, a comprehension question about it, and 4 options (ids a–d) with exactly one correct. Distractors should be plausible but clearly wrong on a careful read.",
    payloadSchema: obj({ question: str, options: optionsSchema, correctOptionId: str }, [
      "question",
      "options",
      "correctOptionId",
    ]),
    validate: checkSingleAnswer,
  },
  MCQ_MULTI_R: {
    guidance:
      "A reading passage of 120–180 words, a question, and 5 options (ids a–e) of which 2–3 are correct.",
    payloadSchema: obj({ question: str, options: optionsSchema, correctOptionIds: strArray }, [
      "question",
      "options",
      "correctOptionIds",
    ]),
    validate: checkMultiAnswer,
  },
  REORDER_PARAGRAPHS: {
    guidance:
      "4–5 sentences (ids s1, s2, …) that form one coherent paragraph in a specific order. Cohesion must be unambiguous — use clear referents and connectives so exactly one ordering works. correctOrder lists the ids in that order.",
    payloadSchema: obj({ items: optionsSchema, correctOrder: strArray }, [
      "items",
      "correctOrder",
    ]),
    validate: (p) => {
      const ids = ((p.items ?? []) as { id: string }[]).map((i) => i.id).sort();
      const order = [...((p.correctOrder ?? []) as string[])].sort();
      return JSON.stringify(ids) === JSON.stringify(order)
        ? null
        : "correctOrder does not contain exactly the item ids";
    },
  },
  R_FILL_BLANKS: {
    guidance:
      "An academic paragraph of 80–120 words with 4–5 gaps written as {{b1}}, {{b2}}, … Each blank has its correct answer and 4 dropdown options (including the answer).",
    payloadSchema: obj(
      {
        text: str,
        blanks: {
          type: "array",
          items: obj({ id: str, answer: str, options: strArray }, ["id", "answer", "options"]),
        },
      },
      ["text", "blanks"],
    ),
    validate: (p) => {
      const blankErr = checkBlanks(p);
      if (blankErr) return blankErr;
      const blanks = (p.blanks ?? []) as { id: string; answer: string; options: string[] }[];
      const bad = blanks.filter((b) => !b.options?.includes(b.answer));
      return bad.length
        ? `blanks whose options omit the answer: ${bad.map((b) => b.id).join(", ")}`
        : null;
    },
  },

  // ── Listening ───────────────────────────────────────────
  SUMMARIZE_SPOKEN_TEXT: {
    guidance:
      "A 90–130 word lecture excerpt to be played as audio, plus 4 key points a 50–70 word summary should capture.",
    payloadSchema: obj({ transcript: str, keyPoints: strArray }, ["transcript", "keyPoints"]),
    spoken: true,
  },
  MCQ_MULTI_L: {
    guidance:
      "A 70–110 word spoken passage, a question about it, and 5 options (ids a–e) of which 2–3 are correct.",
    payloadSchema: obj(
      { transcript: str, question: str, options: optionsSchema, correctOptionIds: strArray },
      ["transcript", "question", "options", "correctOptionIds"],
    ),
    spoken: true,
    validate: checkMultiAnswer,
  },
  L_FILL_BLANKS: {
    guidance:
      "A 60–90 word spoken passage. Provide the same text with 4–5 content words replaced by {{b1}}, {{b2}}, … tokens, and each blank's exact answer word. The candidate types the missing words while listening.",
    payloadSchema: obj(
      {
        transcript: str,
        text: str,
        blanks: { type: "array", items: obj({ id: str, answer: str }, ["id", "answer"]) },
      },
      ["transcript", "text", "blanks"],
    ),
    spoken: true,
    validate: checkBlanks,
  },
  HIGHLIGHT_SUMMARY: {
    guidance:
      "A 70–110 word spoken passage and 4 candidate summaries (ids a–d), exactly one of which accurately summarises it. Wrong ones should distort emphasis or add unsupported claims.",
    payloadSchema: obj(
      { transcript: str, question: str, options: optionsSchema, correctOptionId: str },
      ["transcript", "question", "options", "correctOptionId"],
    ),
    spoken: true,
    validate: checkSingleAnswer,
  },
  MCQ_SINGLE_L: {
    guidance:
      "A 70–110 word spoken passage, a question, and 4 options (ids a–d) with exactly one correct.",
    payloadSchema: obj(
      { transcript: str, question: str, options: optionsSchema, correctOptionId: str },
      ["transcript", "question", "options", "correctOptionId"],
    ),
    spoken: true,
    validate: checkSingleAnswer,
  },
  SELECT_MISSING_WORD: {
    guidance:
      "A 50–80 word spoken passage that stops before its final word or short phrase. Provide 4 options (ids a–d) for what comes next, exactly one of which fits. The transcript must NOT include the missing word.",
    payloadSchema: obj(
      { transcript: str, question: str, options: optionsSchema, correctOptionId: str },
      ["transcript", "question", "options", "correctOptionId"],
    ),
    spoken: true,
    validate: checkSingleAnswer,
  },
  HIGHLIGHT_INCORRECT_WORDS: {
    guidance:
      "A 50–80 word passage as an array of individual words (transcriptWords, one word per element, punctuation attached). Then pick 3–4 positions and replace those words with different ones, listing their zero-based positions in incorrectIndices. `spoken` must be the ORIGINAL correct text; transcriptWords is the altered version the candidate reads.",
    payloadSchema: obj(
      {
        spokenText: str,
        transcriptWords: strArray,
        incorrectIndices: { type: "array", items: { type: "integer" } },
      },
      ["spokenText", "transcriptWords", "incorrectIndices"],
    ),
    spoken: true,
    validate: (p) => {
      const words = (p.transcriptWords ?? []) as string[];
      const idx = (p.incorrectIndices ?? []) as number[];
      const oob = idx.filter((i) => i < 0 || i >= words.length);
      if (oob.length) return `incorrectIndices out of range: ${oob.join(", ")}`;
      return idx.length ? null : "no incorrect words marked";
    },
  },
  WRITE_FROM_DICTATION: {
    guidance:
      "One spoken sentence of 9–14 words with clear academic vocabulary, to be typed verbatim by the candidate.",
    payloadSchema: obj({ referenceText: str }, ["referenceText"]),
    spoken: true,
  },
};

/** JSON schema for a batch of items of one task type. */
function batchSchema(spec: GenSpec): Record<string, unknown> {
  const itemProps: Record<string, unknown> = {
    title: { type: "string", description: "Short descriptive title, e.g. 'Read Aloud — Urban trees'" },
    payload: spec.payloadSchema,
  };
  return {
    type: "object",
    properties: {
      items: { type: "array", items: obj(itemProps, ["title", "payload"]) },
    },
    required: ["items"],
    additionalProperties: false,
  };
}

interface RawItem {
  title: string;
  payload: Record<string, unknown>;
}

/**
 * Pull the TTS script out of a generated payload. Audio tasks keep their
 * spoken source in different fields, and for HIGHLIGHT_INCORRECT_WORDS the
 * spoken text is deliberately NOT what the candidate sees.
 */
function extractSpoken(taskType: TaskType, payload: Record<string, unknown>): string | undefined {
  switch (taskType) {
    case "REPEAT_SENTENCE":
      return String(payload.sentence ?? "");
    case "ANSWER_SHORT_QUESTION":
      return String(payload.question ?? "");
    case "WRITE_FROM_DICTATION":
      return String(payload.referenceText ?? "");
    case "HIGHLIGHT_INCORRECT_WORDS":
      return String(payload.spokenText ?? "");
    default:
      return payload.transcript ? String(payload.transcript) : undefined;
  }
}

export interface GenerateOptions {
  /** Topic hint, e.g. "environmental science". Improves variety across runs. */
  topic?: string;
  difficulty?: number;
  /** Titles that already exist, so the model avoids duplicating them. */
  avoidTitles?: string[];
}

export interface GenerateResult {
  items: GeneratedItem[];
  /** Items the model produced that failed validation, with the reason. */
  rejected: { title: string; reason: string }[];
}

/**
 * Generate `count` questions of one task type. Invalid items are reported in
 * `rejected` rather than thrown, so one bad item doesn't lose the whole batch.
 */
export async function generateQuestions(
  taskType: TaskType,
  count: number,
  opts: GenerateOptions = {},
): Promise<GenerateResult> {
  const spec = GEN_SPECS[taskType];
  if (!spec) throw new Error(`No generation spec for task type: ${taskType}`);

  const system = `You are an experienced PTE Academic item writer producing ORIGINAL practice questions in the style of the exam. You are not reproducing real PTE questions — invent fresh content.

Task type: ${taskType}
What to write: ${spec.guidance}

Rules:
- Every item must be self-contained and factually accurate.
- Vary topic, structure and difficulty across the batch; do not reuse a template.
- Titles follow "Task name — Topic", e.g. "Read Aloud — Urban trees".
- Use British or American spelling consistently within an item.`;

  const parts = [`Write ${count} distinct ${taskType} items.`];
  if (opts.topic) parts.push(`Draw topics from: ${opts.topic}.`);
  if (opts.avoidTitles?.length) {
    parts.push(
      `These titles already exist — write on clearly different topics:\n${opts.avoidTitles
        .slice(0, 60)
        .map((t) => `- ${t}`)
        .join("\n")}`,
    );
  }

  const { data } = await callClaudeJson<{ items: RawItem[] }>(
    system,
    parts.join("\n\n"),
    batchSchema(spec),
    // Batches of full reading passages are long; give the response real room.
    { maxTokens: 16000 },
  );

  const items: GeneratedItem[] = [];
  const rejected: { title: string; reason: string }[] = [];

  for (const raw of data.items ?? []) {
    const payload = { ...(raw.payload ?? {}) };
    const spoken = spec.spoken ? extractSpoken(taskType, payload) : undefined;

    // Fields that exist only to carry the TTS script are not part of the
    // stored payload contract.
    delete payload.spokenText;

    const extraError = spec.validate?.(payload);
    if (extraError) {
      rejected.push({ title: raw.title, reason: extraError });
      continue;
    }

    const parsed = payloadSchemaFor(taskType).safeParse(payload);
    if (!parsed.success) {
      rejected.push({
        title: raw.title,
        reason: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      });
      continue;
    }

    if (spec.spoken && !spoken?.trim()) {
      rejected.push({ title: raw.title, reason: "audio task produced no spoken script" });
      continue;
    }

    items.push({
      taskType,
      title: raw.title,
      spoken,
      payload: parsed.data,
      tags: ["ai-generated"],
      difficulty: opts.difficulty ?? 2,
    });
  }

  return { items, rejected };
}
