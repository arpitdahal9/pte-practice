import { getDb } from "@/lib/db";
import { handler, ok, requireUser, ApiError } from "@/lib/api";
import { TASK_TYPES } from "@/lib/pte/taskTypes";
import type { Section } from "@prisma/client";

// POST /api/mock-attempts/[id]/complete — aggregate section + overall scores.
export const POST = handler(async (_req, { params }) => {
  await requireUser();
  const { id } = await params;
  const prisma = await getDb();

  const mock = await prisma.mockAttempt.findUnique({
    where: { id },
    include: {
      attempts: {
        include: {
          score: { select: { overall: true } },
          question: { select: { taskType: true } },
        },
      },
    },
  });
  if (!mock) throw new ApiError("Mock attempt not found", 404);

  const bySection = new Map<Section, number[]>();
  for (const a of mock.attempts) {
    const overall = a.score?.overall;
    if (overall == null) continue;
    const section = TASK_TYPES[a.question.taskType].section;
    (bySection.get(section) ?? bySection.set(section, []).get(section)!).push(overall);
  }

  const sectionScores: Record<string, number> = {};
  for (const [section, xs] of bySection) {
    sectionScores[section] = Math.round(xs.reduce((s, x) => s + x, 0) / xs.length);
  }
  const values = Object.values(sectionScores);
  const overallScore = values.length
    ? Math.round(values.reduce((s, x) => s + x, 0) / values.length)
    : 0;

  await prisma.mockAttempt.update({
    where: { id },
    data: { completedAt: new Date(), sectionScores, overallScore },
  });

  return ok({ sectionScores, overallScore });
});
