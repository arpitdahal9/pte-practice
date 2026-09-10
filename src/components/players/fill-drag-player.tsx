"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { parseBlanks } from "@/lib/pte/blanks";
import { cn } from "@/lib/utils";
import type { PlayerProps } from "./types";

interface WordItem {
  id: string;
  text: string;
  placedIn: string | null; // blank id
}

function Chip({ id, text, disabled }: { id: string; text: string; disabled?: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id, disabled });
  return (
    <button
      ref={setNodeRef}
      type="button"
      {...listeners}
      {...attributes}
      className={cn(
        "cursor-grab rounded-md border bg-background px-3 py-2.5 text-sm shadow-sm touch-manipulation active:cursor-grabbing sm:py-1.5",
        isDragging && "opacity-40",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      {text}
    </button>
  );
}

function BlankSlot({
  blankId,
  word,
  onClear,
  disabled,
}: {
  blankId: string;
  word?: WordItem;
  onClear: () => void;
  disabled?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `blank:${blankId}` });
  return (
    <span
      ref={setNodeRef}
      className={cn(
        "mx-1 inline-flex min-w-24 items-center justify-center rounded-md border-2 border-dashed px-2 py-1 align-middle text-sm",
        isOver ? "border-primary bg-primary/10" : "border-input",
        word && "border-solid bg-secondary",
      )}
    >
      {word ? (
        <button
          type="button"
          onClick={onClear}
          disabled={disabled}
          className="font-medium"
          title="Click to remove"
        >
          {word.text}
        </button>
      ) : (
        <span className="text-muted-foreground">&nbsp;</span>
      )}
    </span>
  );
}

export function FillDragPlayer({ question, onChange, disabled }: PlayerProps) {
  const text = String(question.payload.text ?? "");
  const wordBank = (question.payload.wordBank as string[]) ?? [];
  const blanks = (question.payload.blanks as { id: string }[]) ?? [];
  const segments = useMemo(() => parseBlanks(text), [text]);

  const [items, setItems] = useState<WordItem[]>(() =>
    wordBank.map((w, i) => ({ id: `w${i}`, text: w, placedIn: null })),
  );
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 6 } }),
  );

  function emit(next: WordItem[]) {
    const answers: Record<string, string> = {};
    for (const it of next) if (it.placedIn) answers[it.placedIn] = it.text;
    const complete = blanks.every((b) => answers[b.id]);
    onChange(complete ? { responseData: { answers } } : null);
  }

  function place(wordId: string, blankId: string | null) {
    setItems((prev) => {
      const next = prev.map((it) => ({ ...it }));
      const word = next.find((it) => it.id === wordId);
      if (!word) return prev;
      if (blankId) {
        // Evict any word already in that blank.
        const occupant = next.find((it) => it.placedIn === blankId);
        if (occupant) occupant.placedIn = null;
      }
      word.placedIn = blankId;
      emit(next);
      return next;
    });
  }

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }
  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const wordId = String(e.active.id);
    const over = e.over ? String(e.over.id) : null;
    if (over && over.startsWith("blank:")) place(wordId, over.slice("blank:".length));
    else place(wordId, null); // dropped outside → back to bank
  }

  const bankWords = items.filter((it) => !it.placedIn);
  const active = items.find((it) => it.id === activeId);

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <p className="leading-loose text-[15px]">
        {segments.map((s, i) =>
          s.type === "text" ? (
            <span key={i}>{s.value}</span>
          ) : (
            <BlankSlot
              key={i}
              blankId={s.id}
              word={items.find((it) => it.placedIn === s.id)}
              onClear={() => {
                const w = items.find((it) => it.placedIn === s.id);
                if (w) place(w.id, null);
              }}
              disabled={disabled}
            />
          ),
        )}
      </p>

      <div className="mt-4 rounded-lg border bg-muted/30 p-3">
        <div className="mb-2 text-xs text-muted-foreground">
          Drag words into the gaps (tap a placed word to remove it):
        </div>
        <div className="flex flex-wrap gap-2">
          {bankWords.length === 0 && (
            <span className="text-sm text-muted-foreground">All words placed.</span>
          )}
          {bankWords.map((w) => (
            <Chip key={w.id} id={w.id} text={w.text} disabled={disabled} />
          ))}
        </div>
      </div>

      <DragOverlay>
        {active ? (
          <div className="rounded-md border bg-background px-3 py-1.5 text-sm shadow-md">
            {active.text}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
