import Link from "next/link";
import { prisma } from "@/lib/db";
import { requirePageAuth } from "@/lib/session";
import { getUserStats } from "@/lib/stats";
import { SECTIONS, SECTION_LABELS } from "@/lib/pte/taskTypes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendChart } from "@/components/dashboard/trend-chart";
import { ScoreBand } from "@/components/score-band";

export const metadata = { title: "Dashboard — PTE Practice" };

export default async function DashboardPage() {
  const sessionUser = await requirePageAuth();
  const [user, stats] = await Promise.all([
    prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: { name: true, targetScore: true },
    }),
    getUserStats(sessionUser.id),
  ]);

  const recent = await prisma.attempt.findMany({
    where: { userId: sessionUser.id },
    orderBy: { createdAt: "desc" },
    take: 6,
    include: {
      score: { select: { overall: true, status: true } },
      question: { select: { title: true, taskType: true } },
    },
  });

  const target = user?.targetScore ?? null;
  const overall = stats.predictedOverall;
  const gap = overall != null && target != null ? target - overall : null;

  return (
    <div className="space-y-8 sm:space-y-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            Your progress
          </h1>
          <p className="mt-1 text-sm text-muted-foreground sm:hidden">
            Pick a skill below to start practising.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Link href="/practice" className="sm:contents">
            <Button className="h-11 w-full sm:h-10 sm:w-auto">Practise</Button>
          </Link>
          <Link href="/mock" className="sm:contents">
            <Button variant="outline" className="h-11 w-full sm:h-10 sm:w-auto">
              Mock test
            </Button>
          </Link>
        </div>
      </div>

      {/* Quick skill entry — the fastest path into a practice session on phone. */}
      <section aria-label="Practice by skill">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="font-display text-base font-semibold">Start by skill</h2>
          <Link href="/practice" className="text-sm text-primary hover:underline">
            All tasks
          </Link>
        </div>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {SECTIONS.map((section) => {
            const skill = stats.skills.find((s) => s.section === section);
            return (
              <li key={section}>
                <Link
                  href={`/practice#${section.toLowerCase()}`}
                  className="flex h-full flex-col rounded-md border bg-card p-3 transition-colors hover:bg-accent/50 active:bg-accent"
                >
                  <span className="font-display text-sm font-semibold">
                    {SECTION_LABELS[section]}
                  </span>
                  <span className="mt-1 font-mono tabular text-lg font-semibold text-readout">
                    {skill?.average != null ? Math.round(skill.average) : "––"}
                  </span>
                  <span className="mt-0.5 text-[0.6875rem] text-muted-foreground">
                    {skill?.attempts
                      ? `${skill.attempts} attempt${skill.attempts === 1 ? "" : "s"}`
                      : "Tap to practise"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {/* The instrument. All four skills share the overall band's axis, so the
          reader compares them by eye instead of by arithmetic. */}
      <Card>
        <CardContent className="p-5 sm:p-8">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <span className="eyebrow">Predicted overall</span>
            {target ? (
              <span className="eyebrow">
                Target {target}
                {gap != null && gap > 0 && ` · ${gap} to go`}
                {gap != null && gap <= 0 && " · reached"}
              </span>
            ) : (
              <Link href="/profile" className="eyebrow underline hover:text-foreground">
                Set a target
              </Link>
            )}
          </div>

          <div className="mt-4">
            <ScoreBand score={overall} target={target} size="lg" showScale />
          </div>

          {overall == null && (
            <p className="mt-4 text-sm text-muted-foreground">
              No scored attempts yet. Complete a task and your bands appear here.
            </p>
          )}

          <div className="tick-rule my-6 sm:my-8" aria-hidden="true" />

          <div className="grid gap-x-10 gap-y-6 sm:grid-cols-2">
            {stats.skills.map((s) => (
              <div key={s.section}>
                <ScoreBand
                  label={SECTION_LABELS[s.section]}
                  score={s.average}
                  size="sm"
                />
                <p className="mt-1.5 font-mono text-[0.6875rem] text-muted-foreground">
                  {s.attempts === 0
                    ? "no attempts"
                    : `${s.attempts} attempt${s.attempts === 1 ? "" : "s"}`}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Score over time</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.trend.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Your trend line starts after your first scored attempt.
              </p>
            ) : (
              <TrendChart data={stats.trend} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Weakest task types</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.weakAreas.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Practise a few task types and the ones to work on will surface here.
              </p>
            ) : (
              <ul className="space-y-4">
                {stats.weakAreas.map((w) => (
                  <li key={w.taskType}>
                    <Link
                      href={`/practice/${w.taskType}`}
                      className="group block focus-visible:outline-none"
                    >
                      <ScoreBand
                        label={w.label}
                        score={w.average}
                        size="sm"
                        className="group-hover:opacity-80"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Recent attempts</CardTitle>
          <Link href="/history" className="text-sm text-primary hover:underline">
            View all
          </Link>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing yet. Pick a task type and start.
            </p>
          ) : (
            <ul className="divide-y border-t">
              {recent.map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/history/${a.id}`}
                    className="flex min-h-12 items-center justify-between gap-4 py-3 hover:bg-accent/40"
                  >
                    <span className="truncate text-sm">{a.question.title}</span>
                    {a.score?.status === "FAILED" ? (
                      <span className="shrink-0 font-mono text-xs text-destructive">
                        not scored
                      </span>
                    ) : (
                      <span className="shrink-0 font-mono tabular text-sm font-semibold text-readout">
                        {a.score?.overall ?? "––"}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
