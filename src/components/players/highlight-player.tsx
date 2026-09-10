"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { PlayerProps } from "./types";

/** HIGHLIGHT_INCORRECT_WORDS — click each word that differs from the audio. */
export function HighlightPlayer({ question, onChange, disabled }: PlayerProps) {
  const words = (question.payload.transcriptWords as string[]) ?? [];
  const [selected, setSelected] = useState<Set<number>>(new Set());

  function toggle(i: number) {
    const next = new Set(selected);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    setSelected(next);
    onChange({ responseData: { selectedIndices: [...next] } });
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Click the words that are different from what you hear.
      </p>
      <p className="leading-loose text-[15px]">
        {words.map((w, i) => (
          <span key={i}>
            <button
              type="button"
              onClick={() => toggle(i)}
              disabled={disabled}
              className={cn(
                "rounded px-0.5 transition-colors",
                selected.has(i)
                  ? "bg-amber-300 text-amber-950 dark:bg-amber-500/70 dark:text-amber-50"
                  : "hover:bg-accent",
              )}
            >
              {w}
            </button>{" "}
          </span>
        ))}
      </p>
    </div>
  );
}
