import { z } from "zod";
import { getDb } from "@/lib/db";
import { handler, ok, parseBody, requireUser, ApiError } from "@/lib/api";

const startSchema = z.object({ mockTestId: z.string().min(1) });

// POST /api/mock-attempts — begin a mock test.
export const POST = handler(async (req) => {
  const user = await requireUser();
  const { mockTestId } = await parseBody(req, startSchema);
  const prisma = await getDb();

  const test = await prisma.mockTest.findUnique({ where: { id: mockTestId } });
  if (!test) throw new ApiError("Mock test not found", 404);

  const attempt = await prisma.mockAttempt.create({
    data: { userId: user.id, mockTestId },
    select: { id: true },
  });
  return ok({ mockAttemptId: attempt.id }, 201);
});
