"use client";

import { useState } from "react";
import { parseBlanks } from "@/lib/pte/blanks";
import type { PlayerProps } from "./types";

/** L_FILL_BLANKS — type the missing word into each gap while listening. */
export function TypedBlanksPlayer({ question, onChange, disabled }: PlayerProps) {
  const text = String(question.payload.text ?? "");
  const blanks = (question.payload.blanks as { id: string }[]) ?? [];
  const segments = parseBlanks(text);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  function set(id: string, value: string) {
    const next = { ...answers, [id]: value };
    setAnswers(next);
    const anyFilled = blanks.some((b) => next[b.id]?.trim());
    onChange(anyFilled ? { responseData: { answers: next } } : null);
  }

  return (
    <p className="leading-loose text-[15px]">
      {segments.map((s, i) =>
        s.type === "text" ? (
          <span key={i}>{s.value}</span>
        ) : (
          <input
            key={i}
            type="text"
            value={answers[s.id] ?? ""}
            onChange={(e) => set(s.id, e.target.value)}
            disabled={disabled}
            autoComplete="off"
            spellCheck={false}
            className="mx-1 inline-block w-28 rounded-md border-b-2 border-input bg-transparent px-1 text-center text-sm focus-visible:border-primary focus-visible:outline-none"
          />
        ),
      )}
    </p>
  );
}
