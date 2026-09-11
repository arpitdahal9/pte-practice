import Link from "next/link";
import { getDb } from "@/lib/db";
import { requirePageAuth } from "@/lib/session";
import { TASK_TYPES, SECTION_LABELS } from "@/lib/pte/taskTypes";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";

export const metadata = { title: "History — PTE Practice" };

export default async function HistoryPage() {
  const user = await requirePageAuth();
  const prisma = await getDb();
  const attempts = await prisma.attempt.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      score: { select: { overall: true } },
      question: { select: { title: true, taskType: true, section: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">History</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Attempt history</h1>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          Revisit past attempts and their feedback.
        </p>
      </div>

      {attempts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No attempts yet.{" "}
            <Link href="/practice" className="text-primary hover:underline">
              Start practising
            </Link>
            .
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y">
              {attempts.map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/history/${a.id}`}
                    className="flex min-h-14 items-center gap-3 px-4 py-3 hover:bg-accent active:bg-accent"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{a.question.title}</div>
                      <div className="text-xs text-muted-foreground">
                        <span className="font-mono text-readout">
                          {TASK_TYPES[a.question.taskType].shortLabel}
                        </span>
                        {" · "}
                        {SECTION_LABELS[a.question.section]} ·{" "}
                        {a.createdAt.toLocaleDateString()}
                      </div>
                    </div>
                    <Badge variant="secondary" className="font-mono tabular">
                      {a.score?.overall ?? "—"}
                    </Badge>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
