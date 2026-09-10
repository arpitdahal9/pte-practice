import { prisma } from "@/lib/db";
import { toClientQuestion, shuffle, selectCandidateIds } from "@/lib/questions";
import type { TaskType } from "@prisma/client";

/** How many of the user's recent attempts count as "recently served". */
const RECENT_ATTEMPT_WINDOW = 200;

export interface NextQuestionOptions {
  /** Question ids already served in this practice session. */
  exclude?: string[];
  /** How many to return. */
  take?: number;
}

/**
 * Pick the next question(s) for a user, avoiding repeats.
 *
 * Selection walks three widening tiers and stops at the first non-empty one:
 *
 *   1. Never attempted by this user, and not already served this session.
 *   2. Not served this session (the user has exhausted the pool, so allow
 *      previously-attempted questions back in).
 *   3. Anything of this task type (the session has now seen the whole pool).
 *
 * Tier 2 is what stops the "same question forever" loop on a small bank:
 * without it, exhausting tier 1 left the caller with nothing and it fell back
 * to an unfiltered random pick, which could — and did — immediately re-serve
 * the question just answered.
 */
export async function pickNextQuestions(
  userId: string,
  taskType: TaskType,
  { exclude = [], take = 1 }: NextQuestionOptions = {},
) {
  // Ids only — cheap enough to filter in memory at question-bank scale, and
  // avoids a correlated subquery per candidate row.
  const [pool, recentAttempts] = await Promise.all([
    prisma.question.findMany({
      where: { taskType },
      select: { id: true },
    }),
    prisma.attempt.findMany({
      where: { userId, question: { taskType } },
      orderBy: { createdAt: "desc" },
      take: RECENT_ATTEMPT_WINDOW,
      select: { questionId: true },
    }),
  ]);

  if (pool.length === 0) return [];

  const candidates = selectCandidateIds(
    pool.map((q) => q.id),
    exclude,
    recentAttempts.map((a) => a.questionId),
  );

  const chosenIds = shuffle(candidates).slice(0, take);

  const questions = await prisma.question.findMany({
    where: { id: { in: chosenIds } },
  });

  // findMany does not preserve the order of `in`, so re-apply the shuffle.
  const byId = new Map(questions.map((q) => [q.id, q]));
  return chosenIds
    .map((id) => byId.get(id))
    .filter((q): q is NonNullable<typeof q> => q != null)
    .map(toClientQuestion);
}

/** A single next question for a user, sanitized for the client. */
export async function getNextClientQuestion(
  userId: string,
  taskType: TaskType,
  exclude: string[] = [],
) {
  const [q] = await pickNextQuestions(userId, taskType, { exclude, take: 1 });
  return q ?? null;
}

/** How many questions exist for a task type. */
export function countQuestions(taskType: TaskType) {
  return prisma.question.count({ where: { taskType } });
}

/** A specific question by id, sanitized for the client. */
export async function getClientQuestionById(id: string) {
  const q = await prisma.question.findUnique({ where: { id } });
  return q ? toClientQuestion(q) : null;
}
