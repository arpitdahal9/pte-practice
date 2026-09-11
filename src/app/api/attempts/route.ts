import { getDb } from "@/lib/db";
import { handler, ok, parseBody, requireUser } from "@/lib/api";
import { createAttemptSchema } from "@/lib/validation/attempt";
import { createScoredAttempt } from "@/lib/attempts";

// POST /api/attempts — submit a response, score it, store it.
//
// Always 201: the attempt IS persisted even when scoring fails. The client
// reads `scoringFailed` to decide between showing a score card and an error
// state with a retry. Returning 4xx/5xx here would imply the response was
// lost, which it wasn't.
export const POST = handler(async (req) => {
  const user = await requireUser();
  const input = await parseBody(req, createAttemptSchema);
  const { attempt, mock, scoringFailed, scoringError } = await createScoredAttempt(
    user.id,
    input,
  );
  return ok({ attempt, mock, scoringFailed, scoringError }, 201);
});

// GET /api/attempts?take=&skip= — current user's attempt history.
export const GET = handler(async (req) => {
  const user = await requireUser();
  const url = new URL(req.url);
  const take = Math.min(Number(url.searchParams.get("take") ?? 20), 100);
  const skip = Math.max(Number(url.searchParams.get("skip") ?? 0), 0);
  const prisma = await getDb();

  const [attempts, total] = await Promise.all([
    prisma.attempt.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take,
      skip,
      include: {
        score: { select: { overall: true, scorerModel: true } },
        question: { select: { id: true, title: true, taskType: true, section: true } },
      },
    }),
    prisma.attempt.count({ where: { userId: user.id } }),
  ]);

  return ok({ attempts, total, take, skip });
});
