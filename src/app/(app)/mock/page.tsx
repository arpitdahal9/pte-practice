import Link from "next/link";
import { getDb } from "@/lib/db";
import { SECTION_LABELS } from "@/lib/pte/taskTypes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Timer } from "lucide-react";

export const metadata = { title: "Mock Tests — PTE Practice" };

export default async function MockHub() {
  const prisma = await getDb();
  const tests = await prisma.mockTest.findMany({
    orderBy: [{ type: "asc" }, { title: "asc" }],
    include: { _count: { select: { questions: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Mocks</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Mock tests</h1>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          Timed, exam-style runs. Each task uses real-PTE-style timing; your section
          and overall scores are computed at the end.
        </p>
      </div>

      {tests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No mock tests yet. Run <code>npm run db:seed</code> to load samples.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {tests.map((t) => (
            <Card key={t.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-snug">{t.title}</CardTitle>
                  <Badge variant={t.type === "FULL" ? "default" : "secondary"}>
                    {t.type === "FULL" ? "Full" : t.section ? SECTION_LABELS[t.section] : "Section"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{t.description}</p>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-xs text-muted-foreground">
                    {t._count.questions} questions
                  </span>
                  <Link href={`/mock/${t.id}`} className="sm:contents">
                    <Button size="sm" className="h-11 w-full sm:h-9 sm:w-auto">
                      <Timer className="h-4 w-4" /> Start
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
