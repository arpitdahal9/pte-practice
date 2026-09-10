import type { ClientQuestion } from "@/lib/questions";

/** What a player emits when the user's answer changes. */
export interface ResponsePayload {
  /** Validated against the task's response schema server-side. */
  responseData: unknown;
  /** Speaking tasks: STT transcript. */
  transcript?: string;
  /** Speaking tasks: audio metrics for the scorer. */
  audioMeta?: { durationSec?: number; wordCount?: number; wpm?: number };
}

export interface PlayerProps {
  question: ClientQuestion;
  /** Called with the current response, or null when incomplete. */
  onChange: (payload: ResponsePayload | null) => void;
  /** Locked after submission. */
  disabled?: boolean;
}
