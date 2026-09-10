import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePageAuth } from "@/lib/session";
import { TASK_TYPES, SECTION_LABELS } from "@/lib/pte/taskTypes";
import { ScoreCard, type AttemptScore } from "@/components/practice/score-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePageAuth();
  const { id } = await params;

  const attempt = await prisma.attempt.findUnique({
    where: { id },
    include: { score: true, question: true },
  });
  if (!attempt) notFound();

  const meta = TASK_TYPES[attempt.question.taskType];
  const score = attempt.score;

  return (
    <div className="space-y-6">
      <Link href="/history">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="h-4 w-4" /> Back to history
        </Button>
      </Link>

      <div>
        <h1 className="text-2xl font-bold">{attempt.question.title}</h1>
        <p className="text-muted-foreground">
          {meta.label} · {SECTION_LABELS[attempt.question.section]} ·{" "}
          {attempt.createdAt.toLocaleString()}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your response</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {attempt.responseAudioUrl && (
            <audio className="w-full" src={attempt.responseAudioUrl} controls />
          )}
          {attempt.transcript && (
            <div>
              <div className="mb-1 font-medium">Transcript</div>
              <p className="text-muted-foreground">{attempt.transcript}</p>
            </div>
          )}
          {attempt.responseText && (
            <p className="whitespace-pre-wrap text-muted-foreground">{attempt.responseText}</p>
          )}
          {!attempt.responseText && !attempt.transcript && !attempt.responseAudioUrl && (
            <pre className="overflow-x-auto rounded bg-muted p-3 text-xs">
              {JSON.stringify(attempt.responseData, null, 2)}
            </pre>
          )}
        </CardContent>
      </Card>

      {score && score.status === "FAILED" ? (
        // A FAILED score holds the error, not a grade — showing its 0 as a
        // band would misrepresent the attempt.
        <Card>
          <CardContent className="space-y-2 py-8">
            <p className="font-medium">This response was never scored</p>
            <p className="text-sm text-muted-foreground">
              {score.error ?? "Scoring was unavailable when you submitted."}
            </p>
            <p className="text-sm text-muted-foreground">
              Your answer is saved. Re-submit it from practice to score it.
            </p>
          </CardContent>
        </Card>
      ) : score ? (
        <ScoreCard
          score={{
            overall: score.overall,
            breakdown: score.breakdown as Record<string, number>,
            feedback: score.feedback,
            strengths: score.strengths,
            improvements: score.improvements,
            scorerModel: score.scorerModel,
          } satisfies AttemptScore}
          mock={score.scorerModel === "mock-heuristic"}
          taskType={attempt.question.taskType}
        />
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            This attempt was not scored.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
