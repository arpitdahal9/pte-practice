import { handler, ok, requireUser, ApiError } from "@/lib/api";
import { rescoreAttempt } from "@/lib/attempts";
import { ScoringUnavailableError } from "@/lib/scoring";

// POST /api/attempts/:id/rescore — retry scoring for an attempt that failed.
export const POST = handler(async (_req, ctx) => {
  const user = await requireUser();
  const { id } = await ctx.params;

  try {
    const score = await rescoreAttempt(user.id, id);
    return ok({ score });
  } catch (err) {
    if (err instanceof ScoringUnavailableError) {
      // 503, not 500: the request was valid and the attempt is intact — the
      // scorer is what's unavailable, and retrying later may well succeed.
      throw new ApiError(err.message, 503);
    }
    throw err;
  }
});
