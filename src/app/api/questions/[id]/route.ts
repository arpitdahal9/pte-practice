import { prisma } from "@/lib/db";
import { handler, ok, parseBody, requireUser, requireAdmin, ApiError } from "@/lib/api";
import { toClientQuestion } from "@/lib/questions";
import { updateQuestionSchema } from "@/lib/validation/question";
import { payloadSchemaFor } from "@/lib/pte/schemas";

// GET /api/questions/[id] — sanitized question for the player (auth required)
export const GET = handler(async (_req, { params }) => {
  await requireUser();
  const { id } = await params;
  const q = await prisma.question.findUnique({ where: { id } });
  if (!q) throw new ApiError("Question not found", 404);
  return ok({ question: toClientQuestion(q) });
});

// PATCH /api/questions/[id] — admin update
export const PATCH = handler(async (req, { params }) => {
  await requireAdmin();
  const { id } = await params;
  const existing = await prisma.question.findUnique({ where: { id } });
  if (!existing) throw new ApiError("Question not found", 404);

  const body = await parseBody(req, updateQuestionSchema);

  // If payload changes, validate against the (new or existing) task type.
  let payload = existing.payload;
  if (body.payload !== undefined) {
    const taskType = body.taskType ?? existing.taskType;
    const parsed = payloadSchemaFor(taskType).safeParse(body.payload);
    if (!parsed.success) {
      throw new ApiError("Invalid payload for this task type", 422, parsed.error.flatten());
    }
    payload = parsed.data as typeof existing.payload;
  }

  const updated = await prisma.question.update({
    where: { id },
    data: {
      section: body.section ?? undefined,
      taskType: body.taskType ?? undefined,
      title: body.title ?? undefined,
      instructions: body.instructions,
      promptText: body.promptText,
      mediaUrl: body.mediaUrl,
      mediaType: body.mediaType,
      payload: payload as object,
      difficulty: body.difficulty ?? undefined,
      tags: body.tags ?? undefined,
      isSample: body.isSample ?? undefined,
    },
  });

  return ok({ question: updated });
});

// DELETE /api/questions/[id] — admin delete
export const DELETE = handler(async (_req, { params }) => {
  await requireAdmin();
  const { id } = await params;
  await prisma.question.delete({ where: { id } }).catch(() => {
    throw new ApiError("Question not found", 404);
  });
  return ok({ ok: true });
});
