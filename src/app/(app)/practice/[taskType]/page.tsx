import Link from "next/link";
import { notFound } from "next/navigation";
import { TaskType } from "@prisma/client";
import { TASK_TYPES } from "@/lib/pte/taskTypes";
import { getNextClientQuestion, countQuestions } from "@/lib/queries";
import { requireUser } from "@/lib/api";
import { PracticeRunner } from "@/components/practice/practice-runner";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

export default async function PracticeTaskPage({
  params,
}: {
  params: Promise<{ taskType: string }>;
}) {
  const { taskType } = await params;
  if (!Object.values(TaskType).includes(taskType as TaskType)) notFound();
  const tt = taskType as TaskType;

  const user = await requireUser();
  const [question, poolSize] = await Promise.all([
    getNextClientQuestion(user.id, tt),
    countQuestions(tt),
  ]);

  return (
    <div className="space-y-4">
      <Link
        href="/practice"
        className="inline-flex h-10 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        All tasks
        <span className="hidden text-muted-foreground/80 sm:inline">
          · {TASK_TYPES[tt].shortLabel}
        </span>
      </Link>

      {question ? (
        <PracticeRunner initialQuestion={question} poolSize={poolSize} />
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="font-medium">No {TASK_TYPES[tt].label} questions yet.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Seed the database (<code>npm run db:seed</code>) or add questions in the admin panel.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
