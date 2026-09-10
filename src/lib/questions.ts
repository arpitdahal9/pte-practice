import type { Question, TaskType } from "@prisma/client";

/** Fisher–Yates shuffle (returns a new array). */
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type Payload = Record<string, unknown>;

/**
 * Narrow a pool of question ids to the best tier of candidates to serve next.
 *
 * Tiers widen until one is non-empty:
 *   1. Neither served this session nor previously attempted — the ideal pick.
 *   2. Not served this session (previously attempted is now acceptable).
 *   3. The whole pool (the session has cycled through everything).
 *
 * Always returns a non-empty array when `pool` is non-empty, which is the
 * property that prevents the caller from falling back to an unfiltered random
 * pick and re-serving the question the user just answered.
 */
export function selectCandidateIds(
  pool: string[],
  servedThisSession: Iterable<string>,
  previouslyAttempted: Iterable<string>,
): string[] {
  const served = new Set(servedThisSession);
  const attempted = new Set(previouslyAttempted);

  const fresh = pool.filter((id) => !served.has(id) && !attempted.has(id));
  if (fresh.length) return fresh;

  const unseen = pool.filter((id) => !served.has(id));
  if (unseen.length) return unseen;

  return pool;
}

/**
 * Strip correct answers / reference material from a question payload before
 * sending it to the browser. Scoring is always done server-side, so the client
 * never needs (and must not see) the answer key.
 */
export function clientPayload(taskType: TaskType, payloadRaw: unknown): Payload {
  const p = (payloadRaw ?? {}) as Payload;
  switch (taskType) {
    case "MCQ_SINGLE_R":
    case "MCQ_SINGLE_L":
    case "HIGHLIGHT_SUMMARY":
    case "SELECT_MISSING_WORD":
      return { question: p.question, options: shuffle((p.options as unknown[]) ?? []) };
    case "MCQ_MULTI_R":
    case "MCQ_MULTI_L":
      return { question: p.question, options: shuffle((p.options as unknown[]) ?? []) };
    case "REORDER_PARAGRAPHS":
      // Present the paragraphs shuffled; hide the correct order.
      return { items: shuffle((p.items as unknown[]) ?? []) };
    case "RW_FILL_BLANKS":
      return {
        text: p.text,
        wordBank: shuffle((p.wordBank as string[]) ?? []),
        blanks: ((p.blanks as { id: string }[]) ?? []).map((b) => ({ id: b.id })),
      };
    case "R_FILL_BLANKS":
      return {
        text: p.text,
        blanks: ((p.blanks as { id: string; options: string[] }[]) ?? []).map((b) => ({
          id: b.id,
          options: b.options,
        })),
      };
    case "L_FILL_BLANKS":
      return {
        text: p.text,
        blanks: ((p.blanks as { id: string }[]) ?? []).map((b) => ({ id: b.id })),
      };
    case "HIGHLIGHT_INCORRECT_WORDS":
      return { transcriptWords: p.transcriptWords };
    case "WRITE_FROM_DICTATION":
      return {}; // reference text is the answer — audio only
    case "WRITE_ESSAY":
      return { prompt: p.prompt };
    case "SUMMARIZE_WRITTEN_TEXT":
      return { passage: p.passage };
    case "SUMMARIZE_SPOKEN_TEXT":
      return {}; // transcript/keyPoints are reference — audio only
    case "READ_ALOUD":
      return { text: p.text };
    case "REPEAT_SENTENCE":
    case "DESCRIBE_IMAGE":
    case "RETELL_LECTURE":
    case "ANSWER_SHORT_QUESTION":
      // Speaking prompts are delivered via audio/image; reference text hidden.
      return {};
    default:
      return {};
  }
}

/** Shape sent to the client for rendering a question. */
export interface ClientQuestion {
  id: string;
  section: Question["section"];
  taskType: TaskType;
  title: string;
  instructions: string | null;
  promptText: string | null;
  mediaUrl: string | null;
  mediaType: string | null;
  difficulty: number;
  payload: Payload;
}

export function toClientQuestion(q: Question): ClientQuestion {
  // For speaking tasks the prompt text is the reference answer, so hide it
  // unless the task is meant to show text (Read Aloud shows its text via payload).
  const hidePromptText: TaskType[] = [
    "REPEAT_SENTENCE",
    "DESCRIBE_IMAGE",
    "RETELL_LECTURE",
    "ANSWER_SHORT_QUESTION",
    "WRITE_FROM_DICTATION",
    "SUMMARIZE_SPOKEN_TEXT",
    "HIGHLIGHT_INCORRECT_WORDS",
    "SELECT_MISSING_WORD",
    "MCQ_SINGLE_L",
    "MCQ_MULTI_L",
    "HIGHLIGHT_SUMMARY",
    "L_FILL_BLANKS",
  ];
  return {
    id: q.id,
    section: q.section,
    taskType: q.taskType,
    title: q.title,
    instructions: q.instructions,
    promptText: hidePromptText.includes(q.taskType) ? null : q.promptText,
    mediaUrl: q.mediaUrl,
    mediaType: q.mediaType,
    difficulty: q.difficulty,
    payload: clientPayload(q.taskType, q.payload),
  };
}
