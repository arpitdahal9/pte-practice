import OpenAI from "openai";
import { toFile } from "openai/uploads";
import { env, hasWhisper } from "@/lib/env";

export interface TranscriptionResult {
  transcript: string;
  durationSec?: number;
  wordCount: number;
  wpm?: number;
  mock: boolean;
}

let openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!openai) openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  return openai;
}

function metrics(transcript: string, durationSec?: number) {
  const wordCount = transcript.split(/\s+/).filter(Boolean).length;
  const wpm =
    durationSec && durationSec > 0
      ? Math.round((wordCount / durationSec) * 60)
      : undefined;
  return { wordCount, wpm };
}

/**
 * Transcribe an audio recording with OpenAI Whisper. When no key is
 * configured (or SCORING_MOCK), returns a clearly-labeled placeholder so
 * Speaking tasks remain usable offline.
 */
export async function transcribeAudio(
  data: Buffer,
  filename = "recording.webm",
  durationSec?: number,
): Promise<TranscriptionResult> {
  if (!hasWhisper()) {
    const transcript =
      "[SAMPLE TRANSCRIPT — speech-to-text is not configured. Add OPENAI_API_KEY to .env for real transcription.]";
    return { transcript, durationSec, ...metrics("", durationSec), mock: true };
  }

  const file = await toFile(data, filename);
  const res = await getOpenAI().audio.transcriptions.create({
    file,
    model: env.STT_MODEL,
  });
  const transcript = (res.text ?? "").trim();
  return { transcript, durationSec, ...metrics(transcript, durationSec), mock: false };
}
