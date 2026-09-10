"use client";

import { useRef, useState } from "react";
import { Play, Pause, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatTime } from "@/lib/utils";

/**
 * Plays a listening/speaking audio prompt. In real PTE, listening audio plays
 * once automatically; here we give the user an explicit play control (more
 * forgiving for practice) plus a progress bar.
 */
export function AudioPrompt({ src, label = "Audio prompt" }: { src: string; label?: string }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);

  function toggle() {
    const el = ref.current;
    if (!el) return;
    if (playing) el.pause();
    else void el.play();
  }

  return (
    <div className="rounded-lg border bg-muted/40 p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Volume2 className="h-4 w-4" />
        {label}
      </div>
      <div className="flex items-center gap-3">
        <Button type="button" size="icon" variant="secondary" onClick={toggle} aria-label={playing ? "Pause" : "Play"}>
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <div className="flex-1">
          <Progress value={progress} />
          <div className="mt-1 flex justify-between text-xs tabular-nums text-muted-foreground">
            <span>{formatTime(current)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>
      <audio
        ref={ref}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
        onTimeUpdate={(e) => {
          const el = e.currentTarget;
          setCurrent(el.currentTime);
          setProgress(el.duration ? (el.currentTime / el.duration) * 100 : 0);
        }}
      />
    </div>
  );
}
