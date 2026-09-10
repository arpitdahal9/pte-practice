"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, ArrowRight, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Timer } from "@/components/practice/timer";
import { QuestionStage } from "@/components/practice/question-stage";
import { TASK_TYPES, SECTION_LABELS } from "@/lib/pte/taskTypes";
import type { ClientQuestion } from "@/lib/questions";
import type { ResponsePayload } from "@/components/players/types";
import type { Section } from "@prisma/client";

type Phase = "intro" | "running" | "saving" | "done";

export function MockRunner({
  mockTestId,
  title,
  questions,
}: {
  mockTestId: string;
  title: string;
  questions: ClientQuestion[];
}) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<{
    sectionScores: Record<string, number>;
    overallScore: number;
  } | null>(null);
  const mockAttemptId = useRef<string | null>(null);
  const responseRef = useRef<ResponsePayload | null>(null);
  const startRef = useRef<number>(Date.now());
  const [timerKey, setTimerKey] = useState(0);

  const current = questions[index];
  const meta = current ? TASK_TYPES[current.taskType] : null;

  const onChange = useCallback((r: ResponsePayload | null) => {
    responseRef.current = r;
  }, []);

  async function start() {
    setPhase("saving");
    try {
      const res = await fetch("/api/mock-attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mockTestId }),
      });
      const data = await res.json();
      mockAttemptId.current = data.mockAttemptId;
      startRef.current = Date.now();
      setPhase("running");
    } catch {
      setPhase("intro");
    }
  }

  const advance = useCallback(async () => {
    if (phase !== "running") return;
    setPhase("saving");
    const current = responseRef.current;

    // Submit this question's response (if any) as a MOCK attempt.
    if (current && mockAttemptId.current) {
      try {
        await fetch("/api/attempts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            questionId: questions[index].id,
            mode: "MOCK",
            mockAttemptId: mockAttemptId.current,
            responseData: current.responseData,
            transcript: current.transcript,
            audioMeta: current.audioMeta,
            durationSec: Math.round((Date.now() - startRef.current) / 1000),
          }),
        });
      } catch {
        /* keep going — a failed submit just means that question is unscored */
      }
    }

    responseRef.current = null;
    if (index + 1 < questions.length) {
      setIndex((i) => i + 1);
      startRef.current = Date.now();
      setTimerKey((k) => k + 1);
      setPhase("running");
    } else {
      // Complete the mock and fetch aggregate scores.
      try {
        const res = await fetch(`/api/mock-attempts/${mockAttemptId.current}/complete`, {
          method: "POST",
        });
        setResults(await res.json());
      } catch {
        setResults({ sectionScores: {}, overallScore: 0 });
      }
      setPhase("done");
    }
  }, [phase, index, questions]);

  // ── Intro ──
  if (phase === "intro") {
    return (
      <Card className="mx-auto max-w-xl">
        <CardHeader>
          <CardTitle className="text-xl leading-snug">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {questions.length} questions. Each task is timed like the real exam — when
            the timer runs out, it auto-advances. Speaking tasks require microphone access.
            You can’t go back to a previous question.
          </p>
          <Button onClick={start} className="h-12 w-full sm:h-10 sm:w-auto">
            <Flag className="h-4 w-4" /> Begin mock test
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ── Done ──
  if (phase === "done" && results) {
    return (
      <div className="mx-auto max-w-xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl leading-snug">Mock complete — {title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <div className="font-mono text-4xl font-bold tabular text-readout sm:text-5xl">
                {results.overallScore}
              </div>
              <div className="text-sm text-muted-foreground">predicted overall / 90</div>
            </div>
            <div className="space-y-2">
              {Object.entries(results.sectionScores).map(([section, score]) => (
                <div key={section} className="flex items-center gap-3 text-sm">
                  <span className="w-24 shrink-0 text-muted-foreground">
                    {SECTION_LABELS[section as Section]}
                  </span>
                  <Progress value={score} />
                  <span className="w-8 text-right font-mono tabular">{score}</span>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-center">
              <Link href="/history" className="sm:contents">
                <Button variant="outline" className="h-12 w-full sm:h-10 sm:w-auto">
                  Review attempts
                </Button>
              </Link>
              <Link href="/mock" className="sm:contents">
                <Button className="h-12 w-full sm:h-10 sm:w-auto">More mocks</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Running / saving ──
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center justify-between gap-2 text-sm">
            <span className="font-medium">
              Question {index + 1} of {questions.length}
            </span>
            {meta && (
              <Badge variant="secondary" className="max-w-[55%] truncate font-mono sm:max-w-none">
                {meta.shortLabel}
              </Badge>
            )}
          </div>
          <Progress value={(index / questions.length) * 100} />
        </div>
        {meta && phase === "running" && (
          <Timer
            key={timerKey}
            seconds={meta.defaultTimeSec}
            onExpire={advance}
            className="self-start"
          />
        )}
      </div>

      {current && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg leading-snug sm:text-xl">{current.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <QuestionStage
              key={current.id}
              question={current}
              onChange={onChange}
              disabled={phase === "saving"}
            />
            <div className="mt-6 flex sm:justify-end">
              <Button
                onClick={advance}
                disabled={phase === "saving"}
                className="h-12 w-full sm:h-10 sm:w-auto"
              >
                {phase === "saving" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
                {index + 1 < questions.length ? "Next" : "Finish"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
