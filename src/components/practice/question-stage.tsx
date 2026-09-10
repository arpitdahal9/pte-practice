"use client";

/* eslint-disable @next/next/no-img-element */
import type { ClientQuestion } from "@/lib/questions";
import { AudioPrompt } from "@/components/media/audio-prompt";
import { PlayerRenderer } from "@/components/players/player-renderer";
import type { ResponsePayload } from "@/components/players/types";

/** Extract the passage/prompt to display above the interactive input. */
function contextText(q: ClientQuestion): string | null {
  if (q.promptText) return q.promptText;
  const p = q.payload;
  if (typeof p.passage === "string") return p.passage;
  if (typeof p.prompt === "string") return p.prompt;
  if (q.taskType === "READ_ALOUD" && typeof p.text === "string") return p.text;
  return null;
}

export function QuestionStage({
  question,
  onChange,
  disabled,
}: {
  question: ClientQuestion;
  onChange: (payload: ResponsePayload | null) => void;
  disabled?: boolean;
}) {
  const ctx = contextText(question);
  const isReadAloud = question.taskType === "READ_ALOUD";

  return (
    <div className="space-y-4">
      {question.instructions && (
        <p className="text-sm text-muted-foreground">{question.instructions}</p>
      )}

      {question.mediaType === "image" && question.mediaUrl && (
        <img
          src={question.mediaUrl}
          alt="Prompt"
          className="mx-auto max-h-80 rounded-lg border object-contain"
        />
      )}

      {question.mediaType === "audio" && question.mediaUrl && (
        <AudioPrompt src={question.mediaUrl} />
      )}

      {ctx && (
        <div
          className={
            isReadAloud
              ? "rounded-lg border bg-muted/40 p-4 text-lg leading-relaxed"
              : "rounded-lg border bg-card p-4 text-[15px] leading-relaxed whitespace-pre-wrap"
          }
        >
          {ctx}
        </div>
      )}

      <PlayerRenderer question={question} onChange={onChange} disabled={disabled} />
    </div>
  );
}
