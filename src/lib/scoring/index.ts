import type { TaskType } from "@prisma/client";
import { scoringMode } from "@/lib/env";
import type { ScoreContext, ScoreResult } from "./types";
import { isDeterministic, scoreDeterministic } from "./deterministic";
import { rubricFor } from "./rubrics";
import { aiScore, mockScore } from "./ai";

export type { ScoreContext, ScoreResult } from "./types";
export { isDeterministic } from "./deterministic";
export { ScoringUnavailableError } from "./claude";

/**
 * Route a response to the correct scorer for its task type.
 *
 *  - Objective tasks (MCQ, reorder, fill, dictation, highlight) are scored in
 *    code, deterministically.
 *  - Open-ended tasks (essays, summaries, speaking) are scored by Claude
 *    against that task's rubric.
 *
 * If AI scoring fails, this THROWS ScoringUnavailableError. It deliberately
 * does not fall back to the heuristic: a plausible-looking wrong score is
 * worse than a visible error, because the learner cannot tell the difference
 * and calibrates their practice against a number that means nothing. The
 * heuristic runs only when SCORING_MOCK=true is set explicitly.
 *
 * @param taskType      The PTE task type.
 * @param userResponse  Validated Attempt.responseData.
 * @param referenceData Question content + context (payload, promptText,
 *                      transcript, audioMeta).
 */
export async function scoreResponse(
  taskType: TaskType,
  userResponse: unknown,
  referenceData: Omit<ScoreContext, "taskType" | "response">,
): Promise<ScoreResult> {
  const ctx: ScoreContext = { taskType, response: userResponse, ...referenceData };

  if (isDeterministic(taskType)) {
    return scoreDeterministic(ctx);
  }

  const rubric = rubricFor(taskType);
  if (!rubric) {
    throw new Error(`No scorer registered for task type: ${taskType}`);
  }

  if (scoringMode() === "mock") {
    return mockScore(ctx, rubric);
  }

  // Throws ScoringUnavailableError on failure — intentionally uncaught here.
  return aiScore(ctx, rubric);
}
