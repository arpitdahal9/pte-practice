import { getDb } from "@/lib/db";
import { handler, ok, parseBody, requireUser, requireAdmin, ApiError } from "@/lib/api";
import { toClientQuestion } from "@/lib/questions";
import { createQuestionSchema } from "@/lib/validation/question";
import { payloadSchemaFor } from "@/lib/pte/schemas";
import { Prisma, Section, TaskType } from "@prisma/client";

// GET /api/questions?section=&taskType=&take=&random=1  (auth required)
export const GET = handler(async (req) => {
  await requireUser();
  const url = new URL(req.url);
  const section = url.searchParams.get("section") as Section | null;
  const taskType = url.searchParams.get("taskType") as TaskType | null;
  const random = url.searchParams.get("random") === "1";
  const take = Math.min(Number(url.searchParams.get("take") ?? 50), 100);
  const prisma = await getDb();

  const where = {
    ...(section && Object.values(Section).includes(section) ? { section } : {}),
    ...(taskType && Object.values(TaskType).includes(taskType) ? { taskType } : {}),
  };

  let questions = await prisma.question.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: random ? 100 : take,
  });

  if (random) {
    questions = questions.sort(() => Math.random() - 0.5).slice(0, take);
  }

  return ok({ questions: questions.map(toClientQuestion) });
});

// POST /api/questions  (admin only) — create a question
export const POST = handler(async (req) => {
  await requireAdmin();
  const body = await parseBody(req, createQuestionSchema);
  const prisma = await getDb();

  const payloadParsed = payloadSchemaFor(body.taskType).safeParse(body.payload);
  if (!payloadParsed.success) {
    throw new ApiError("Invalid payload for this task type", 422, payloadParsed.error.flatten());
  }

  const created = await prisma.question.create({
    data: {
      section: body.section,
      taskType: body.taskType,
      title: body.title,
      instructions: body.instructions ?? null,
      promptText: body.promptText ?? null,
      mediaUrl: body.mediaUrl ?? null,
      mediaType: body.mediaType ?? null,
      payload: payloadParsed.data as object,
      difficulty: body.difficulty,
      tags: body.tags as Prisma.InputJsonValue,
      isSample: body.isSample,
    },
  });

  return ok({ question: created }, 201);
});
