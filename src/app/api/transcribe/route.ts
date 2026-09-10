import { handler, ok, requireUser, ApiError } from "@/lib/api";
import { getStorage, buildKey } from "@/lib/storage";
import { transcribeAudio } from "@/lib/stt";

export const runtime = "nodejs";
// Speaking recordings can be a few MB.
export const maxDuration = 60;

/**
 * POST /api/transcribe  (multipart/form-data)
 *   audio: File (webm/mp3/wav)
 *   durationSec: string (optional)
 *
 * Stores the recording and returns its URL plus a Whisper transcript and
 * basic speech metrics used by the speaking scorers.
 */
export const POST = handler(async (req) => {
  const user = await requireUser();

  const form = await req.formData().catch(() => null);
  if (!form) throw new ApiError("Expected multipart/form-data", 400);

  const file = form.get("audio");
  if (!(file instanceof File)) throw new ApiError("Missing 'audio' file", 400);

  const durationSec = form.get("durationSec")
    ? Number(form.get("durationSec"))
    : undefined;

  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.length === 0) throw new ApiError("Empty audio file", 400);
  if (bytes.length > 15 * 1024 * 1024) throw new ApiError("Audio too large (max 15MB)", 413);

  const ext = (file.name.split(".").pop() || "webm").toLowerCase();
  const key = buildKey("audio", user.id, ext);
  const stored = await getStorage().save(key, bytes, file.type || "audio/webm");

  const stt = await transcribeAudio(bytes, file.name || `recording.${ext}`, durationSec);

  return ok({
    audioUrl: stored.url,
    transcript: stt.transcript,
    audioMeta: {
      durationSec: stt.durationSec,
      wordCount: stt.wordCount,
      wpm: stt.wpm,
    },
    mock: stt.mock,
  });
});
