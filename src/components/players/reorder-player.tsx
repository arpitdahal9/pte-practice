"use client";

import { useEffect, useState } from "react";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlayerProps } from "./types";
import type { Option } from "@/lib/pte/schemas";

function SortableItem({ item, index, disabled }: { item: Option; index: number; disabled?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id, disabled });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-start gap-3 rounded-lg border bg-card p-3 text-sm",
        isDragging && "z-10 shadow-lg",
      )}
    >
      <button
        type="button"
        className="mt-0.5 min-h-11 min-w-11 cursor-grab touch-none text-muted-foreground active:cursor-grabbing sm:min-h-0 sm:min-w-0"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
        disabled={disabled}
      >
        <GripVertical className="h-5 w-5 sm:h-4 sm:w-4" />
      </button>
      <span className="mt-0.5 font-mono text-xs text-muted-foreground">{index + 1}</span>
      <span>{item.text}</span>
    </li>
  );
}

export function ReorderPlayer({ question, onChange, disabled }: PlayerProps) {
  const initial = (question.payload.items as Option[]) ?? [];
  const [items, setItems] = useState<Option[]>(initial);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    onChange({ responseData: { order: items.map((i) => i.id) } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setItems((prev) => {
      const oldIndex = prev.findIndex((i) => i.id === active.id);
      const newIndex = prev.findIndex((i) => i.id === over.id);
      return arrayMove(prev, oldIndex, newIndex);
    });
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <ol className="space-y-2">
          {items.map((item, index) => (
            <SortableItem key={item.id} item={item} index={index} disabled={disabled} />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  );
}
