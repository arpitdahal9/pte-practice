"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { TASK_TYPES } from "@/lib/pte/taskTypes";
import type { PlayerProps } from "./types";

/** Recommended word ranges per text task (for the live counter). */
const RANGES: Record<string, { min: number; max: number }> = {
  WRITE_ESSAY: { min: 200, max: 300 },
  SUMMARIZE_WRITTEN_TEXT: { min: 5, max: 75 },
  SUMMARIZE_SPOKEN_TEXT: { min: 50, max: 70 },
};

export function TextPlayer({ question, onChange, disabled }: PlayerProps) {
  const [value, setValue] = useState("");
  const range = RANGES[question.taskType];
  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;

  function update(v: string) {
    setValue(v);
    onChange(v.trim() ? { responseData: { text: v.trim() } } : null);
  }

  const inRange = !range || (wordCount >= range.min && wordCount <= range.max);

  return (
    <div className="space-y-2">
      <Textarea
        value={value}
        onChange={(e) => update(e.target.value)}
        disabled={disabled}
        rows={question.taskType === "WRITE_ESSAY" ? 12 : 6}
        placeholder="Type your response here…"
        className="resize-y"
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{TASK_TYPES[question.taskType].blurb}</span>
        <span className={inRange ? "" : "text-amber-600"}>
          {wordCount} words{range ? ` (aim ${range.min}–${range.max})` : ""}
        </span>
      </div>
    </div>
  );
}
