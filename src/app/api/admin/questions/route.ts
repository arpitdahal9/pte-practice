import { getDb } from "@/lib/db";
import { handler, ok, requireAdmin } from "@/lib/api";
import { asStringArray } from "@/lib/utils";

// GET /api/admin/questions — full questions (incl. answers) for the admin UI.
export const GET = handler(async (req) => {
  await requireAdmin();
  const url = new URL(req.url);
  const taskType = url.searchParams.get("taskType");
  const prisma = await getDb();

  const questions = await prisma.question.findMany({
    where: taskType ? { taskType: taskType as never } : undefined,
    orderBy: { createdAt: "desc" },
    take: 300,
  });
  return ok({
    questions: questions.map((q) => ({ ...q, tags: asStringArray(q.tags) })),
  });
});
