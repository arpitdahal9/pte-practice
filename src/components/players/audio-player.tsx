"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square, Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatTime } from "@/lib/utils";
import type { PlayerProps } from "./types";

type Phase = "idle" | "recording" | "processing" | "done" | "error";

function pickMime(): string {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c)) return c;
  }
  return "";
}

export function AudioPlayer({ onChange, disabled }: PlayerProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [mock, setMock] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const startRef = useRef<number>(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      tickRef.current && clearInterval(tickRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function start() {
    setError(null);
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setPhase("error");
      setError("Audio recording isn't supported in this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const mime = pickMime();
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      rec.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      rec.onstop = () => void handleStop(mime);
      recorderRef.current = rec;
      rec.start();
      startRef.current = Date.now();
      setElapsed(0);
      setPhase("recording");
      tickRef.current = setInterval(
        () => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)),
        250,
      );
    } catch (err) {
      setPhase("error");
      const name = (err as DOMException)?.name;
      setError(
        name === "NotAllowedError"
          ? "Microphone permission was denied. Allow mic access in your browser and try again."
          : name === "NotFoundError"
            ? "No microphone was found. Connect one and try again."
            : "Could not start recording. Check your microphone and try again.",
      );
    }
  }

  function stop() {
    tickRef.current && clearInterval(tickRef.current);
    recorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }

  async function handleStop(mime: string) {
    setPhase("processing");
    const durationSec = Math.max(1, Math.round((Date.now() - startRef.current) / 1000));
    const blob = new Blob(chunksRef.current, { type: mime || "audio/webm" });
    if (blob.size === 0) {
      setPhase("error");
      setError("Recording was empty. Please try again.");
      return;
    }
    setAudioUrl(URL.createObjectURL(blob));

    try {
      const ext = (mime.split("/")[1] || "webm").split(";")[0];
      const form = new FormData();
      form.append("audio", blob, `recording.${ext}`);
      form.append("durationSec", String(durationSec));
      const res = await fetch("/api/transcribe", { method: "POST", body: form });
      if (!res.ok) throw new Error("transcribe failed");
      const data = await res.json();
      setTranscript(data.transcript ?? "");
      setMock(Boolean(data.mock));
      setPhase("done");
      onChange({
        responseData: { audioUrl: data.audioUrl, transcript: data.transcript },
        transcript: data.transcript,
        audioMeta: data.audioMeta,
      });
    } catch {
      setPhase("error");
      setError("Uploading/transcribing the recording failed. Please re-record.");
      onChange(null);
    }
  }

  function reset() {
    setPhase("idle");
    setElapsed(0);
    setError(null);
    setTranscript(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    onChange(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-3 rounded-lg border bg-muted/30 p-4 sm:p-6">
        {phase === "recording" ? (
          <>
            <div className="flex items-center gap-2 text-destructive">
              <span className="h-3 w-3 animate-pulse rounded-full bg-destructive" />
              <span className="font-medium tabular-nums">{formatTime(elapsed)}</span>
            </div>
            <Button
              type="button"
              variant="destructive"
              onClick={stop}
              disabled={disabled}
              className="h-12 w-full max-w-xs sm:h-10"
            >
              <Square className="h-4 w-4" /> Stop recording
            </Button>
          </>
        ) : phase === "processing" ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Processing recording…
          </div>
        ) : phase === "done" ? (
          <div className="w-full space-y-3">
            {audioUrl && <audio className="w-full" src={audioUrl} controls />}
            <Button
              type="button"
              variant="outline"
              onClick={reset}
              disabled={disabled}
              className="h-12 w-full sm:h-10 sm:w-auto"
            >
              <RefreshCw className="h-4 w-4" /> Re-record
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            onClick={start}
            disabled={disabled}
            className="h-12 w-full max-w-xs sm:h-10"
          >
            <Mic className="h-4 w-4" /> Start recording
          </Button>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {phase === "done" && transcript !== null && (
        <div className="rounded-lg border p-4 text-sm">
          <div className="mb-1 font-medium">Transcript {mock && <span className="text-amber-600">(sample — STT not configured)</span>}</div>
          <p className="text-muted-foreground">{transcript || "(no speech detected)"}</p>
        </div>
      )}
    </div>
  );
}
