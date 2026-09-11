import { getDb } from "@/lib/db";
import { handler, ok, requireUser, ApiError } from "@/lib/api";

// GET /api/attempts/[id] — a single attempt with full score + question (review).
export const GET = handler(async (_req, { params }) => {
  await requireUser();
  const { id } = await params;
  const prisma = await getDb();

  const attempt = await prisma.attempt.findUnique({
    where: { id },
    include: { score: true, question: true },
  });
  if (!attempt) {
    throw new ApiError("Attempt not found", 404);
  }
  return ok({ attempt });
});
