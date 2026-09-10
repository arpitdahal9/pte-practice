"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { PlayerProps } from "./types";
import type { Option } from "@/lib/pte/schemas";

export function McqSinglePlayer({ question, onChange, disabled }: PlayerProps) {
  const options = ((question.payload.options as Option[]) ?? []);
  const stem = question.payload.question as string | undefined;
  const [selected, setSelected] = useState<string | null>(null);

  function pick(id: string) {
    setSelected(id);
    onChange({ responseData: { selectedOptionId: id } });
  }

  return (
    <div className="space-y-2">
      {stem && <p className="font-medium">{stem}</p>}
      {options.map((o) => (
        <label
          key={o.id}
          className={cn(
            "flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition-colors",
            selected === o.id ? "border-primary bg-primary/5" : "hover:bg-accent",
            disabled && "cursor-not-allowed opacity-70",
          )}
        >
          <input
            type="radio"
            name="mcq-single"
            className="mt-0.5"
            checked={selected === o.id}
            onChange={() => pick(o.id)}
            disabled={disabled}
          />
          <span>{o.text}</span>
        </label>
      ))}
    </div>
  );
}

export function McqMultiPlayer({ question, onChange, disabled }: PlayerProps) {
  const options = ((question.payload.options as Option[]) ?? []);
  const stem = question.payload.question as string | undefined;
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
    onChange(next.size ? { responseData: { selectedOptionIds: [...next] } } : null);
  }

  return (
    <div className="space-y-2">
      {stem && <p className="font-medium">{stem}</p>}
      <p className="text-xs text-muted-foreground">
        Select all that apply. Incorrect selections reduce your score.
      </p>
      {options.map((o) => (
        <label
          key={o.id}
          className={cn(
            "flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition-colors",
            selected.has(o.id) ? "border-primary bg-primary/5" : "hover:bg-accent",
            disabled && "cursor-not-allowed opacity-70",
          )}
        >
          <input
            type="checkbox"
            className="mt-0.5"
            checked={selected.has(o.id)}
            onChange={() => toggle(o.id)}
            disabled={disabled}
          />
          <span>{o.text}</span>
        </label>
      ))}
    </div>
  );
}
