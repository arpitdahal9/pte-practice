import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/api";
import { responseSchemaFor } from "@/lib/pte/schemas";
import { TASK_TYPES } from "@/lib/pte/taskTypes";
import { scoreResponse, ScoringUnavailableError } from "@/lib/scoring";
import type { ScoreResult } from "@/lib/scoring";
import type { CreateAttemptInput } from "@/lib/validation/attempt";

/**
 * Validate a response, score it, and persist the Attempt + Score.
 * Shared by the practice and mock-test flows.
 */
export async function createScoredAttempt(userId: string, input: CreateAttemptInput) {
  const question = await prisma.question.findUnique({ where: { id: input.questionId } });
  if (!question) throw new ApiError("Question not found", 404);

  const meta = TASK_TYPES[question.taskType];

  // Validate the response shape for this task type.
  const parsed = responseSchemaFor(question.taskType).safeParse(input.responseData);
  if (!parsed.success) {
    throw new ApiError("Invalid response for this task type", 422, parsed.error.flatten());
  }
  const responseData = parsed.data as Record<string, unknown>;

  // Score: deterministic in-code, or AI against the task rubric.
  //
  // If AI scoring fails we still persist the attempt — losing a candidate's
  // essay because the scorer was down would be the worse failure — but the
  // Score row is marked FAILED and carries the reason. Nothing fabricates a
  // number here; the UI shows an error state and offers a re-score.
  let score: ScoreResult | null = null;
  let scoringError: string | null = null;
  try {
    score = await scoreResponse(question.taskType, responseData, {
      payload: question.payload,
      promptText: question.promptText,
      transcript: input.transcript ?? null,
      audioMeta: input.audioMeta,
    });
  } catch (err) {
    if (!(err instanceof ScoringUnavailableError)) throw err;
    console.error(`[attempts] scoring failed for ${question.taskType}:`, err);
    scoringError = err.message;
  }

  // Derive stored columns.
  const isAudio = meta.responseKind === "AUDIO";
  const responseText =
    typeof responseData.text === "string" ? (responseData.text as string) : null;
  const responseAudioUrl =
    isAudio && typeof responseData.audioUrl === "string"
      ? (responseData.audioUrl as string)
      : null;

  const attempt = await prisma.attempt.create({
    data: {
      userId,
      questionId: question.id,
      mode: input.mode,
      responseText,
      responseAudioUrl,
      transcript: input.transcript ?? null,
      responseData: responseData as object,
      durationSec: input.durationSec,
      mockAttemptId: input.mockAttemptId ?? null,
      score: {
        create: score
          ? {
              status: "SCORED",
              overall: score.overall,
              breakdown: score.breakdown,
              feedback: score.feedback,
              strengths: score.strengths,
              improvements: score.improvements,
              rawResponse: (score.raw ?? undefined) as object | undefined,
              scorerModel: score.scorerModel,
              scorerVersion: score.scorerVersion,
            }
          : {
              status: "FAILED",
              // Placeholder, not a grade. Excluded from all stats by the
              // status filter in getUserStats().
              overall: 0,
              breakdown: {},
              feedback: "",
              error: scoringError,
            },
      },
    },
    include: {
      score: true,
      question: {
        select: { id: true, title: true, taskType: true, section: true },
      },
    },
  });

  return {
    attempt,
    mock: score?.mock ?? false,
    scoringFailed: score == null,
    scoringError,
  };
}

/**
 * Re-run scoring for an attempt whose score previously FAILED. Used by the
 * "Retry scoring" action so a transient outage doesn't cost the user the work.
 */
export async function rescoreAttempt(_userId: string, attemptId: string) {
  const attempt = await prisma.attempt.findFirst({
    where: { id: attemptId },
    include: { question: true, score: true },
  });
  if (!attempt) throw new ApiError("Attempt not found", 404);
  if (attempt.score?.status === "SCORED") {
    throw new ApiError("This attempt is already scored", 409);
  }

  const score = await scoreResponse(
    attempt.question.taskType,
    attempt.responseData,
    {
      payload: attempt.question.payload,
      promptText: attempt.question.promptText,
      transcript: attempt.transcript,
      audioMeta: undefined,
    },
  );

  return prisma.score.update({
    where: { attemptId: attempt.id },
    data: {
      status: "SCORED",
      overall: score.overall,
      breakdown: score.breakdown,
      feedback: score.feedback,
      strengths: score.strengths,
      improvements: score.improvements,
      rawResponse: (score.raw ?? undefined) as object | undefined,
      scorerModel: score.scorerModel,
      scorerVersion: score.scorerVersion,
      error: null,
    },
  });
}
