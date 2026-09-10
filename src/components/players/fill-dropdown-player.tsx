"use client";

import { useState } from "react";
import { parseBlanks } from "@/lib/pte/blanks";
import type { PlayerProps } from "./types";

/** R_FILL_BLANKS — a dropdown of choices for each gap. */
export function FillDropdownPlayer({ question, onChange, disabled }: PlayerProps) {
  const text = String(question.payload.text ?? "");
  const blanks = (question.payload.blanks as { id: string; options: string[] }[]) ?? [];
  const optionsById = Object.fromEntries(blanks.map((b) => [b.id, b.options]));
  const segments = parseBlanks(text);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  function set(id: string, value: string) {
    const next = { ...answers, [id]: value };
    if (!value) delete next[id];
    setAnswers(next);
    const complete = blanks.every((b) => next[b.id]);
    onChange(complete ? { responseData: { answers: next } } : null);
  }

  return (
    <p className="leading-loose text-[15px]">
      {segments.map((s, i) =>
        s.type === "text" ? (
          <span key={i}>{s.value}</span>
        ) : (
          <select
            key={i}
            value={answers[s.id] ?? ""}
            onChange={(e) => set(s.id, e.target.value)}
            disabled={disabled}
            className="mx-1 inline-block rounded-md border border-input bg-background px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">— select —</option>
            {(optionsById[s.id] ?? []).map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        ),
      )}
    </p>
  );
}
