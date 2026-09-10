import type { TaskType } from "@prisma/client";
import {
  mcqSinglePayload,
  mcqMultiPayload,
  reorderPayload,
  fillDragPayload,
  fillDropdownPayload,
  typedBlanksPayload,
  dictationPayload,
  highlightIncorrectPayload,
} from "@/lib/pte/schemas";
import type { ScoreContext, ScoreResult } from "./types";
import { SCORER_VERSION } from "./types";
import { normalizeWord, toPteScore, words } from "./scale";

function result(
  overall: number,
  breakdown: Record<string, number>,
  feedback: string,
  strengths: string[],
  improvements: string[],
  raw?: unknown,
): ScoreResult {
  return {
    overall,
    breakdown,
    feedback,
    strengths,
    improvements,
    raw,
    scorerVersion: SCORER_VERSION,
    scorerModel: "deterministic",
  };
}

const eq = (a: string, b: string) => normalizeWord(a) === normalizeWord(b);

/** Returns true if this task type is scored deterministically. */
export function isDeterministic(taskType: TaskType): boolean {
  return [
    "RW_FILL_BLANKS",
    "MCQ_SINGLE_R",
    "MCQ_MULTI_R",
    "REORDER_PARAGRAPHS",
    "R_FILL_BLANKS",
    "L_FILL_BLANKS",
    "MCQ_MULTI_L",
    "HIGHLIGHT_SUMMARY",
    "MCQ_SINGLE_L",
    "SELECT_MISSING_WORD",
    "HIGHLIGHT_INCORRECT_WORDS",
    "WRITE_FROM_DICTATION",
  ].includes(taskType);
}

export function scoreDeterministic(ctx: ScoreContext): ScoreResult {
  const { taskType } = ctx;
  switch (taskType) {
    case "MCQ_SINGLE_R":
    case "MCQ_SINGLE_L":
    case "HIGHLIGHT_SUMMARY":
    case "SELECT_MISSING_WORD":
      return scoreMcqSingle(ctx);
    case "MCQ_MULTI_R":
    case "MCQ_MULTI_L":
      return scoreMcqMulti(ctx);
    case "REORDER_PARAGRAPHS":
      return scoreReorder(ctx);
    case "RW_FILL_BLANKS":
    case "R_FILL_BLANKS":
    case "L_FILL_BLANKS":
      return scoreFill(ctx);
    case "WRITE_FROM_DICTATION":
      return scoreDictation(ctx);
    case "HIGHLIGHT_INCORRECT_WORDS":
      return scoreHighlightIncorrect(ctx);
    default:
      throw new Error(`Not a deterministic task type: ${taskType}`);
  }
}

function scoreMcqSingle(ctx: ScoreContext): ScoreResult {
  const payload = mcqSinglePayload.parse(ctx.payload);
  const selected = (ctx.response as { selectedOptionId?: string })?.selectedOptionId;
  const correct = selected === payload.correctOptionId;
  const correctText =
    payload.options.find((o) => o.id === payload.correctOptionId)?.text ?? "";
  return result(
    correct ? 90 : 0,
    { correct: correct ? 1 : 0 },
    correct
      ? "Correct — you selected the right answer."
      : `Not quite. The correct answer was: "${correctText}".`,
    correct ? ["Accurate comprehension"] : [],
    correct ? [] : ["Re-read the passage/listen again for the key detail."],
    { selected, expected: payload.correctOptionId },
  );
}

function scoreMcqMulti(ctx: ScoreContext): ScoreResult {
  const payload = mcqMultiPayload.parse(ctx.payload);
  const selected = new Set(
    (ctx.response as { selectedOptionIds?: string[] })?.selectedOptionIds ?? [],
  );
  const correctSet = new Set(payload.correctOptionIds);

  let chosenCorrect = 0;
  let chosenWrong = 0;
  for (const id of selected) {
    if (correctSet.has(id)) chosenCorrect++;
    else chosenWrong++;
  }
  const max = correctSet.size;
  // PTE partial credit: +1 correct, −1 incorrect, floored at 0.
  const points = Math.max(0, chosenCorrect - chosenWrong);
  const overall = toPteScore(points / max);

  return result(
    overall,
    { correctSelected: chosenCorrect, incorrectSelected: chosenWrong, total: max },
    `You selected ${chosenCorrect}/${max} correct option(s)` +
      (chosenWrong ? ` and ${chosenWrong} incorrect one(s), which reduce the score.` : "."),
    chosenCorrect > 0 ? ["Identified relevant correct options"] : [],
    chosenWrong > 0
      ? ["Avoid guessing — incorrect selections are penalized."]
      : chosenCorrect < max
        ? ["Some correct options were missed."]
        : [],
    { selected: [...selected], expected: payload.correctOptionIds },
  );
}

function scoreReorder(ctx: ScoreContext): ScoreResult {
  const payload = reorderPayload.parse(ctx.payload);
  const order = (ctx.response as { order?: string[] })?.order ?? [];
  const correct = payload.correctOrder;

  // PTE scores the number of correctly ordered adjacent pairs.
  let adjacentCorrect = 0;
  for (let i = 0; i < correct.length - 1; i++) {
    const a = correct[i];
    const b = correct[i + 1];
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    if (ia !== -1 && ib !== -1 && ib === ia + 1) adjacentCorrect++;
  }
  const max = correct.length - 1;
  const overall = toPteScore(adjacentCorrect / max);
  const fullyCorrect = order.join("|") === correct.join("|");

  return result(
    overall,
    { adjacentPairsCorrect: adjacentCorrect, total: max },
    fullyCorrect
      ? "Perfect ordering."
      : `You placed ${adjacentCorrect}/${max} adjacent pairs correctly. Look for the topic sentence first, then follow referential links (pronouns, connectors).`,
    adjacentCorrect > 0 ? ["Grasped part of the logical flow"] : [],
    fullyCorrect ? [] : ["Identify the opening sentence and chain each paragraph to the previous one."],
    { order, expected: correct },
  );
}

function scoreFill(ctx: ScoreContext): ScoreResult {
  const payload =
    ctx.taskType === "RW_FILL_BLANKS"
      ? fillDragPayload.parse(ctx.payload)
      : ctx.taskType === "R_FILL_BLANKS"
        ? fillDropdownPayload.parse(ctx.payload)
        : typedBlanksPayload.parse(ctx.payload);
  const answers = (ctx.response as { answers?: Record<string, string> })?.answers ?? {};

  let correctCount = 0;
  const wrong: string[] = [];
  for (const blank of payload.blanks) {
    const given = answers[blank.id] ?? "";
    if (eq(given, blank.answer)) correctCount++;
    else wrong.push(`"${blank.answer}"`);
  }
  const total = payload.blanks.length;
  const overall = toPteScore(correctCount / total);

  return result(
    overall,
    { correctBlanks: correctCount, total },
    correctCount === total
      ? "All blanks correct."
      : `You filled ${correctCount}/${total} blanks correctly. Missed answers: ${wrong.join(", ")}.`,
    correctCount > 0 ? ["Good use of context clues"] : [],
    correctCount < total
      ? ["Use surrounding grammar (articles, prepositions, collocations) to narrow choices."]
      : [],
    { answers, expected: Object.fromEntries(payload.blanks.map((b) => [b.id, b.answer])) },
  );
}

function scoreDictation(ctx: ScoreContext): ScoreResult {
  const payload = dictationPayload.parse(ctx.payload);
  const given = (ctx.response as { text?: string })?.text ?? "";
  const refWords = words(payload.referenceText);
  const givenWords = words(given);

  // Count correct words (multiset intersection).
  const pool = new Map<string, number>();
  for (const w of givenWords) pool.set(w, (pool.get(w) ?? 0) + 1);
  let matched = 0;
  for (const w of refWords) {
    const n = pool.get(w) ?? 0;
    if (n > 0) {
      matched++;
      pool.set(w, n - 1);
    }
  }
  const overall = toPteScore(matched / refWords.length);

  return result(
    overall,
    { correctWords: matched, total: refWords.length },
    matched === refWords.length
      ? "Exact — every word captured."
      : `You captured ${matched}/${refWords.length} words. Reference: "${payload.referenceText}".`,
    matched > 0 ? ["Captured most of the sentence"] : [],
    matched < refWords.length
      ? ["Write down function words too; practice holding the whole sentence in memory."]
      : [],
    { given, reference: payload.referenceText },
  );
}

function scoreHighlightIncorrect(ctx: ScoreContext): ScoreResult {
  const payload = highlightIncorrectPayload.parse(ctx.payload);
  const selected = new Set(
    (ctx.response as { selectedIndices?: number[] })?.selectedIndices ?? [],
  );
  const wrongSet = new Set(payload.incorrectIndices);

  let hit = 0;
  let falsePos = 0;
  for (const idx of selected) {
    if (wrongSet.has(idx)) hit++;
    else falsePos++;
  }
  const max = wrongSet.size || 1;
  const points = Math.max(0, hit - falsePos); // penalize false positives
  const overall = toPteScore(points / max);

  return result(
    overall,
    { correctlyFlagged: hit, falsePositives: falsePos, total: wrongSet.size },
    `You correctly flagged ${hit}/${wrongSet.size} altered word(s)` +
      (falsePos ? ` but also flagged ${falsePos} correct word(s).` : "."),
    hit > 0 ? ["Good listening-reading alignment"] : [],
    falsePos > 0
      ? ["Only click words that clearly differ from the audio."]
      : hit < wrongSet.size
        ? ["Follow the transcript word-by-word while listening."]
        : [],
    { selected: [...selected], expected: payload.incorrectIndices },
  );
}
