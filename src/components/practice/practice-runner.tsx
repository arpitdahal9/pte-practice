"use client";

import { useCallback, useRef, useState } from "react";
import { Loader2, Send, RotateCcw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Timer } from "@/components/practice/timer";
import { QuestionStage } from "@/components/practice/question-stage";
import { ScoreCard, type AttemptScore } from "@/components/practice/score-card";
import { TASK_TYPES } from "@/lib/pte/taskTypes";
import type { ClientQuestion } from "@/lib/questions";
import type { ResponsePayload } from "@/components/players/types";

export function PracticeRunner({
  initialQuestion,
  poolSize,
}: {
  initialQuestion: ClientQuestion;
  poolSize: number;
}) {
  const [question, setQuestion] = useState(initialQuestion);
  const [response, setResponse] = useState<ResponsePayload | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: AttemptScore; mock: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timerKey, setTimerKey] = useState(0);
  const startRef = useRef<number>(Date.now());
  const responseRef = useRef<ResponsePayload | null>(null);

  // Every question served this session, so the next-question request can skip
  // them. Kept in a ref because it is read inside callbacks but never rendered.
  const servedRef = useRef<string[]>([initialQuestion.id]);
  const [servedCount, setServedCount] = useState(1);

  // Scoring failed: the attempt was saved, but has no score yet.
  const [failedAttemptId, setFailedAttemptId] = useState<string | null>(null);
  const [rescoring, setRescoring] = useState(false);

  const meta = TASK_TYPES[question.taskType];

  const onChange = useCallback((r: ResponsePayload | null) => {
    responseRef.current = r;
    setResponse(r);
  }, []);

  const submit = useCallback(async () => {
    const current = responseRef.current;
    if (!current || submitting || result || failedAttemptId) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: question.id,
          mode: "PRACTICE",
          responseData: current.responseData,
          transcript: current.transcript,
          audioMeta: current.audioMeta,
          durationSec: Math.round((Date.now() - startRef.current) / 1000),
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (data.scoringFailed) {
        // The response is saved; only the score is missing. Say so plainly
        // rather than showing a number that was never really computed.
        setFailedAttemptId(data.attempt.id as string);
        setError(
          data.scoringError ??
            "Scoring is unavailable right now. Your answer has been saved.",
        );
        return;
      }
      setResult({ score: data.attempt.score as AttemptScore, mock: data.mock });
    } catch {
      setError("Could not reach the server. Your answer was not saved — please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [question.id, submitting, result, failedAttemptId]);

  const retryScoring = useCallback(async () => {
    if (!failedAttemptId || rescoring) return;
    setRescoring(true);
    setError(null);
    try {
      const res = await fetch(`/api/attempts/${failedAttemptId}/rescore`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setResult({ score: data.score as AttemptScore, mock: false });
      setFailedAttemptId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scoring is still unavailable.");
    } finally {
      setRescoring(false);
    }
  }, [failedAttemptId, rescoring]);

  async function next() {
    try {
      const res = await fetch(
        `/api/questions/next?taskType=${question.taskType}` +
          `&exclude=${encodeURIComponent(servedRef.current.join(","))}`,
      );
      const data = await res.json();
      const q: ClientQuestion | undefined = data.questions?.[0];

      // Reset state for the next attempt.
      setResult(null);
      setResponse(null);
      responseRef.current = null;
      setError(null);
      setFailedAttemptId(null);
      startRef.current = Date.now();
      setTimerKey((k) => k + 1);

      if (q) {
        // Once the whole pool has been served, start a fresh cycle rather than
        // excluding everything and getting the same question back every time.
        if (servedRef.current.includes(q.id)) servedRef.current = [];
        servedRef.current.push(q.id);
        setServedCount(servedRef.current.length);
        setQuestion(q);
      }
    } catch {
      setError("Could not load the next question.");
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="eyebrow">
                {meta.shortLabel} · {meta.label}
              </p>
              <CardTitle className="mt-1 text-lg leading-snug sm:text-xl">
                {question.title}
              </CardTitle>
              {poolSize > 0 && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {servedCount} of {poolSize} in this set
                </p>
              )}
            </div>
            {!result && (
              <Timer
                key={timerKey}
                seconds={meta.defaultTimeSec}
                running={!submitting}
                onExpire={submit}
                className="self-start"
              />
            )}
          </div>
        </CardHeader>
        <CardContent>
          <QuestionStage question={question} onChange={onChange} disabled={!!result} />

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!result && !failedAttemptId && (
            <div className="mt-6 flex sm:justify-end">
              <Button
                onClick={submit}
                disabled={!response || submitting}
                className="h-12 w-full sm:h-10 sm:w-auto"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {submitting ? "Scoring…" : "Submit for scoring"}
              </Button>
            </div>
          )}

          {failedAttemptId && (
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
              <Button onClick={next} variant="ghost" className="h-12 w-full sm:h-10 sm:w-auto">
                Skip to next question
              </Button>
              <Button
                onClick={retryScoring}
                disabled={rescoring}
                className="h-12 w-full sm:h-10 sm:w-auto"
              >
                {rescoring ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4" />
                )}
                {rescoring ? "Retrying…" : "Retry scoring"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {result && (
        <>
          <ScoreCard score={result.score} mock={result.mock} taskType={question.taskType} />
          <div className="flex justify-center">
            <Button onClick={next} variant="secondary" className="h-12 w-full sm:h-10 sm:w-auto">
              <RotateCcw className="h-4 w-4" /> Practise another {meta.shortLabel}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
