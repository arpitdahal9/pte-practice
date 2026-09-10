import type { Section, TaskType } from "@prisma/client";

/**
 * How the user responds to a task. Drives which player component renders
 * and how the response is scored.
 *  - AUDIO:      user records speech (Speaking tasks)
 *  - TEXT:       user writes free text (essays, summaries, dictation)
 *  - MCQ_SINGLE: pick one option
 *  - MCQ_MULTI:  pick several options
 *  - REORDER:    drag paragraphs into order
 *  - FILL_DRAG:  drag words from a bank into gaps
 *  - FILL_DROPDOWN: choose each gap's word from a dropdown
 *  - HIGHLIGHT:  click words/sentences to select them
 */
export type ResponseKind =
  | "AUDIO"
  | "TEXT"
  | "MCQ_SINGLE"
  | "MCQ_MULTI"
  | "REORDER"
  | "FILL_DRAG"
  | "FILL_DROPDOWN"
  | "HIGHLIGHT";

/** How a task is scored. */
export type ScoreKind =
  | "AI" // sent to Claude with a rubric (open-ended production)
  | "AI_SPEECH" // transcribe audio, then Claude scores fluency/content/pronunciation
  | "DETERMINISTIC"; // objective right/wrong, scored in code

export interface TaskTypeMeta {
  type: TaskType;
  section: Section;
  /** Short human label. */
  label: string;
  /** Compact PTE abbreviation for dense / mobile lists. */
  shortLabel: string;
  /** One-line description of what the user does. */
  blurb: string;
  responseKind: ResponseKind;
  scoreKind: ScoreKind;
  /** Prompt media the question carries, if any. */
  media?: "audio" | "image" | "video";
  /** Default seconds allotted in a timed mock (approx. real PTE). */
  defaultTimeSec: number;
}

export const TASK_TYPES: Record<TaskType, TaskTypeMeta> = {
  // ── Speaking ──────────────────────────────────────────────
  READ_ALOUD: {
    type: "READ_ALOUD",
    section: "SPEAKING",
    label: "Read Aloud",
    shortLabel: "RA",
    blurb: "Read a short text aloud. Scored on content, fluency & pronunciation.",
    responseKind: "AUDIO",
    scoreKind: "AI_SPEECH",
    defaultTimeSec: 40,
  },
  REPEAT_SENTENCE: {
    type: "REPEAT_SENTENCE",
    section: "SPEAKING",
    label: "Repeat Sentence",
    shortLabel: "RS",
    blurb: "Listen to a sentence and repeat it exactly.",
    responseKind: "AUDIO",
    scoreKind: "AI_SPEECH",
    media: "audio",
    defaultTimeSec: 15,
  },
  DESCRIBE_IMAGE: {
    type: "DESCRIBE_IMAGE",
    section: "SPEAKING",
    label: "Describe Image",
    shortLabel: "DI",
    blurb: "Describe an image in detail within 40 seconds.",
    responseKind: "AUDIO",
    scoreKind: "AI_SPEECH",
    media: "image",
    defaultTimeSec: 40,
  },
  RETELL_LECTURE: {
    type: "RETELL_LECTURE",
    section: "SPEAKING",
    label: "Re-tell Lecture",
    shortLabel: "RL",
    blurb: "Listen to a lecture and re-tell it in your own words.",
    responseKind: "AUDIO",
    scoreKind: "AI_SPEECH",
    media: "audio",
    defaultTimeSec: 40,
  },
  ANSWER_SHORT_QUESTION: {
    type: "ANSWER_SHORT_QUESTION",
    section: "SPEAKING",
    label: "Answer Short Question",
    shortLabel: "ASQ",
    blurb: "Answer a short question with a word or short phrase.",
    responseKind: "AUDIO",
    scoreKind: "AI_SPEECH",
    media: "audio",
    defaultTimeSec: 10,
  },

  // ── Writing ───────────────────────────────────────────────
  SUMMARIZE_WRITTEN_TEXT: {
    type: "SUMMARIZE_WRITTEN_TEXT",
    section: "WRITING",
    label: "Summarize Written Text",
    shortLabel: "SWT",
    blurb: "Summarize a passage in a single sentence (5–75 words).",
    responseKind: "TEXT",
    scoreKind: "AI",
    defaultTimeSec: 600,
  },
  WRITE_ESSAY: {
    type: "WRITE_ESSAY",
    section: "WRITING",
    label: "Write Essay",
    shortLabel: "WE",
    blurb: "Write a 200–300 word argumentative essay on the given topic.",
    responseKind: "TEXT",
    scoreKind: "AI",
    defaultTimeSec: 1200,
  },

  // ── Reading ───────────────────────────────────────────────
  RW_FILL_BLANKS: {
    type: "RW_FILL_BLANKS",
    section: "READING",
    label: "Reading & Writing: Fill in the Blanks",
    shortLabel: "RWFIB",
    blurb: "Drag the correct word from the bank into each gap.",
    responseKind: "FILL_DRAG",
    scoreKind: "DETERMINISTIC",
    defaultTimeSec: 120,
  },
  MCQ_SINGLE_R: {
    type: "MCQ_SINGLE_R",
    section: "READING",
    label: "Multiple Choice, Single Answer (Reading)",
    shortLabel: "MCS-R",
    blurb: "Read a passage and choose the single correct answer.",
    responseKind: "MCQ_SINGLE",
    scoreKind: "DETERMINISTIC",
    defaultTimeSec: 120,
  },
  MCQ_MULTI_R: {
    type: "MCQ_MULTI_R",
    section: "READING",
    label: "Multiple Choice, Multiple Answers (Reading)",
    shortLabel: "MCM-R",
    blurb: "Choose all correct answers. Wrong picks lose points.",
    responseKind: "MCQ_MULTI",
    scoreKind: "DETERMINISTIC",
    defaultTimeSec: 150,
  },
  REORDER_PARAGRAPHS: {
    type: "REORDER_PARAGRAPHS",
    section: "READING",
    label: "Re-order Paragraphs",
    shortLabel: "RO",
    blurb: "Drag the text boxes into the correct order.",
    responseKind: "REORDER",
    scoreKind: "DETERMINISTIC",
    defaultTimeSec: 150,
  },
  R_FILL_BLANKS: {
    type: "R_FILL_BLANKS",
    section: "READING",
    label: "Reading: Fill in the Blanks",
    shortLabel: "RFIB",
    blurb: "Select the correct word for each gap from a dropdown.",
    responseKind: "FILL_DROPDOWN",
    scoreKind: "DETERMINISTIC",
    defaultTimeSec: 120,
  },

  // ── Listening ─────────────────────────────────────────────
  SUMMARIZE_SPOKEN_TEXT: {
    type: "SUMMARIZE_SPOKEN_TEXT",
    section: "LISTENING",
    label: "Summarize Spoken Text",
    shortLabel: "SST",
    blurb: "Listen to a recording and summarize it in 50–70 words.",
    responseKind: "TEXT",
    scoreKind: "AI",
    media: "audio",
    defaultTimeSec: 600,
  },
  MCQ_MULTI_L: {
    type: "MCQ_MULTI_L",
    section: "LISTENING",
    label: "Multiple Choice, Multiple Answers (Listening)",
    shortLabel: "MCM-L",
    blurb: "Listen, then choose all correct answers.",
    responseKind: "MCQ_MULTI",
    scoreKind: "DETERMINISTIC",
    media: "audio",
    defaultTimeSec: 120,
  },
  L_FILL_BLANKS: {
    type: "L_FILL_BLANKS",
    section: "LISTENING",
    label: "Listening: Fill in the Blanks",
    shortLabel: "LFIB",
    blurb: "Type the missing words into the transcript while listening.",
    responseKind: "TEXT",
    scoreKind: "DETERMINISTIC",
    media: "audio",
    defaultTimeSec: 120,
  },
  HIGHLIGHT_SUMMARY: {
    type: "HIGHLIGHT_SUMMARY",
    section: "LISTENING",
    label: "Highlight Correct Summary",
    shortLabel: "HCS",
    blurb: "Choose the paragraph that best summarizes the recording.",
    responseKind: "MCQ_SINGLE",
    scoreKind: "DETERMINISTIC",
    media: "audio",
    defaultTimeSec: 120,
  },
  MCQ_SINGLE_L: {
    type: "MCQ_SINGLE_L",
    section: "LISTENING",
    label: "Multiple Choice, Single Answer (Listening)",
    shortLabel: "MCS-L",
    blurb: "Listen, then choose the single correct answer.",
    responseKind: "MCQ_SINGLE",
    scoreKind: "DETERMINISTIC",
    media: "audio",
    defaultTimeSec: 90,
  },
  SELECT_MISSING_WORD: {
    type: "SELECT_MISSING_WORD",
    section: "LISTENING",
    label: "Select Missing Word",
    shortLabel: "SMW",
    blurb: "The recording is bleeped at the end — choose the missing word.",
    responseKind: "MCQ_SINGLE",
    scoreKind: "DETERMINISTIC",
    media: "audio",
    defaultTimeSec: 60,
  },
  HIGHLIGHT_INCORRECT_WORDS: {
    type: "HIGHLIGHT_INCORRECT_WORDS",
    section: "LISTENING",
    label: "Highlight Incorrect Words",
    shortLabel: "HIW",
    blurb: "Click the words in the transcript that differ from the audio.",
    responseKind: "HIGHLIGHT",
    scoreKind: "DETERMINISTIC",
    media: "audio",
    defaultTimeSec: 90,
  },
  WRITE_FROM_DICTATION: {
    type: "WRITE_FROM_DICTATION",
    section: "LISTENING",
    label: "Write from Dictation",
    shortLabel: "WFD",
    blurb: "Type the sentence you hear, exactly.",
    responseKind: "TEXT",
    scoreKind: "DETERMINISTIC",
    media: "audio",
    defaultTimeSec: 60,
  },
};

export const ALL_TASK_TYPES = Object.values(TASK_TYPES);

export const SECTIONS: Section[] = ["SPEAKING", "WRITING", "READING", "LISTENING"];

export const SECTION_LABELS: Record<Section, string> = {
  SPEAKING: "Speaking",
  WRITING: "Writing",
  READING: "Reading",
  LISTENING: "Listening",
};

export function taskTypesForSection(section: Section): TaskTypeMeta[] {
  return ALL_TASK_TYPES.filter((t) => t.section === section);
}

export function taskMeta(type: TaskType): TaskTypeMeta {
  return TASK_TYPES[type];
}
