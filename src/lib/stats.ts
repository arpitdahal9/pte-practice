import { prisma } from "@/lib/db";
import { TASK_TYPES } from "@/lib/pte/taskTypes";
import type { Section, TaskType } from "@prisma/client";

export interface SkillStat {
  section: Section;
  average: number | null;
  attempts: number;
}

export interface TrendPoint {
  date: string; // YYYY-MM-DD
  score: number;
}

export interface UserStats {
  predictedOverall: number | null;
  skills: SkillStat[];
  trend: TrendPoint[];
  totalAttempts: number;
  weakAreas: { taskType: TaskType; label: string; average: number; attempts: number }[];
}

const SECTION_ORDER: Section[] = ["SPEAKING", "WRITING", "READING", "LISTENING"];

export async function getUserStats(userId: string): Promise<UserStats> {
  const attempts = await prisma.attempt.findMany({
    // Only SCORED counts. A FAILED score is a placeholder holding the error
    // message, with overall = 0; including it would drag every average and
    // trend point down and misrepresent the learner's actual level.
    where: { userId, score: { is: { status: "SCORED" } } },
    orderBy: { createdAt: "asc" },
    take: 1000,
    select: {
      createdAt: true,
      question: { select: { taskType: true } },
      score: { select: { overall: true } },
    },
  });

  const bySection = new Map<Section, number[]>();
  const byTask = new Map<TaskType, number[]>();
  const byDay = new Map<string, number[]>();

  for (const a of attempts) {
    const overall = a.score?.overall;
    if (overall == null) continue;
    const tt = a.question.taskType;
    const section = TASK_TYPES[tt].section;

    (bySection.get(section) ?? bySection.set(section, []).get(section)!).push(overall);
    (byTask.get(tt) ?? byTask.set(tt, []).get(tt)!).push(overall);

    const day = a.createdAt.toISOString().slice(0, 10);
    (byDay.get(day) ?? byDay.set(day, []).get(day)!).push(overall);
  }

  const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((s, x) => s + x, 0) / xs.length) : null);

  const skills: SkillStat[] = SECTION_ORDER.map((section) => {
    const xs = bySection.get(section) ?? [];
    return { section, average: avg(xs), attempts: xs.length };
  });

  const sectionAverages = skills.map((s) => s.average).filter((v): v is number => v != null);
  const predictedOverall = sectionAverages.length
    ? Math.round(sectionAverages.reduce((s, x) => s + x, 0) / sectionAverages.length)
    : null;

  const trend: TrendPoint[] = [...byDay.entries()]
    .map(([date, xs]) => ({ date, score: avg(xs)! }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const weakAreas = [...byTask.entries()]
    .map(([taskType, xs]) => ({
      taskType,
      label: TASK_TYPES[taskType].label,
      average: avg(xs)!,
      attempts: xs.length,
    }))
    .sort((a, b) => a.average - b.average)
    .slice(0, 4);

  return {
    predictedOverall,
    skills,
    trend,
    totalAttempts: attempts.length,
    weakAreas,
  };
}
