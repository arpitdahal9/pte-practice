"use client";

import { TASK_TYPES } from "@/lib/pte/taskTypes";
import type { PlayerProps } from "./types";
import { AudioPlayer } from "./audio-player";
import { TextPlayer } from "./text-player";
import { TypedBlanksPlayer } from "./typed-blanks-player";
import { McqSinglePlayer, McqMultiPlayer } from "./mcq-player";
import { ReorderPlayer } from "./reorder-player";
import { FillDragPlayer } from "./fill-drag-player";
import { FillDropdownPlayer } from "./fill-dropdown-player";
import { HighlightPlayer } from "./highlight-player";

/** Renders the correct interactive input for a question's task type. */
export function PlayerRenderer(props: PlayerProps) {
  const kind = TASK_TYPES[props.question.taskType].responseKind;
  switch (kind) {
    case "AUDIO":
      return <AudioPlayer {...props} />;
    case "TEXT":
      return props.question.taskType === "L_FILL_BLANKS" ? (
        <TypedBlanksPlayer {...props} />
      ) : (
        <TextPlayer {...props} />
      );
    case "MCQ_SINGLE":
      return <McqSinglePlayer {...props} />;
    case "MCQ_MULTI":
      return <McqMultiPlayer {...props} />;
    case "REORDER":
      return <ReorderPlayer {...props} />;
    case "FILL_DRAG":
      return <FillDragPlayer {...props} />;
    case "FILL_DROPDOWN":
      return <FillDropdownPlayer {...props} />;
    case "HIGHLIGHT":
      return <HighlightPlayer {...props} />;
    default:
      return null;
  }
}
