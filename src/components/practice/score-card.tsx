"use client";

import { Info } from "lucide-react";
import type { TaskType } from "@prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScoreBand } from "@/components/score-band";
import { criterionMaxes } from "@/lib/scoring/rubrics";

export interface AttemptScore {
  overall: number;
  breakdown: Record<string, number>;
  feedback: string;
  strengths: string[];
  improvements: string[];
  scorerModel?: string | null;
}

function prettify(key: string) {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function ScoreCard({
  score,
  mock,
  taskType,
}: {
  score: AttemptScore;
  mock?: boolean;
  taskType?: TaskType;
}) {
  const isMockScorer = mock || score.scorerModel === "mock-heuristic";
  const maxes = taskType ? criterionMaxes(taskType) : {};
  const criteria = Object.entries(score.breakdown);

  return (
    <Card>
      <CardContent className="space-y-8 p-6 sm:p-8">
        <div>
          <span className="eyebrow">Your score</span>
          <div className="mt-3">
            <ScoreBand score={score.overall} size="lg" showScale />
          </div>
        </div>

        {isMockScorer && (
          <Alert variant="warning">
            <Info className="h-4 w-4" />
            <AlertDescription>
              Heuristic sample score, not a rubric grade. Unset SCORING_MOCK to score
              against the real rubric.
            </AlertDescription>
          </Alert>
        )}

        {criteria.length > 0 && (
          <div>
            <span className="eyebrow">Breakdown</span>
            <ul className="mt-4 space-y-3">
              {criteria.map(([key, value]) => {
                const max = maxes[key];
                return (
                  <li key={key} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1">
                    <span className="text-sm">{prettify(key)}</span>
                    <span className="font-mono tabular text-sm">
                      {value}
                      {max ? (
                        <span className="text-muted-foreground">/{max}</span>
                      ) : null}
                    </span>
                    {/* Normalised against this criterion's own maximum, so a
                        3/3 reads full and a 3/5 does not. */}
                    {max ? (
                      <div className="col-span-2 h-1 w-full overflow-hidden rounded-sm bg-band-track">
                        <div
                          className="h-full bg-band-fill"
                          style={{ width: `${Math.min(100, (value / max) * 100)}%` }}
                        />
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div>
          <span className="eyebrow">Feedback</span>
          <p className="mt-3 text-sm leading-relaxed">{score.feedback}</p>
        </div>

        {(score.strengths.length > 0 || score.improvements.length > 0) && (
          <div className="grid gap-6 sm:grid-cols-2">
            {score.strengths.length > 0 && (
              <div>
                <span className="eyebrow">What worked</span>
                <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                  {score.strengths.map((s, i) => (
                    <li key={i} className="border-l-2 border-border pl-3">
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {score.improvements.length > 0 && (
              <div>
                <span className="eyebrow">To improve</span>
                <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                  {score.improvements.map((s, i) => (
                    <li key={i} className="border-l-2 border-readout pl-3">
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {score.scorerModel && !isMockScorer && (
          <p className="font-mono text-[0.6875rem] text-muted-foreground">
            Scored by {score.scorerModel}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
