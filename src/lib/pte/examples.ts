import type { TaskType } from "@prisma/client";

/** Example payload shapes shown in the admin editor per task type. */
export const PAYLOAD_TEMPLATES: Record<TaskType, unknown> = {
  READ_ALOUD: { text: "The text the candidate must read aloud." },
  REPEAT_SENTENCE: { sentence: "Reference sentence the candidate repeats." },
  DESCRIBE_IMAGE: { keyPoints: ["trend goes up", "peak in 2020", "then declines"] },
  RETELL_LECTURE: { transcript: "Reference transcript of the lecture.", keyPoints: ["point 1", "point 2"] },
  ANSWER_SHORT_QUESTION: { question: "What do we call frozen water?", acceptedAnswers: ["ice"] },
  SUMMARIZE_WRITTEN_TEXT: { passage: "The passage to summarize in one sentence." },
  WRITE_ESSAY: { prompt: "Do the advantages of X outweigh the disadvantages? Discuss." },
  RW_FILL_BLANKS: {
    text: "Coffee is one of the most {{b1}} beverages, {{b2}} worldwide.",
    blanks: [{ id: "b1", answer: "popular" }, { id: "b2", answer: "consumed" }],
    wordBank: ["popular", "consumed", "rare", "avoided"],
  },
  MCQ_SINGLE_R: {
    options: [{ id: "a", text: "Option A" }, { id: "b", text: "Option B" }],
    correctOptionId: "a",
  },
  MCQ_MULTI_R: {
    options: [{ id: "a", text: "A" }, { id: "b", text: "B" }, { id: "c", text: "C" }],
    correctOptionIds: ["a", "c"],
  },
  REORDER_PARAGRAPHS: {
    items: [{ id: "s1", text: "First sentence." }, { id: "s2", text: "Second." }, { id: "s3", text: "Third." }],
    correctOrder: ["s1", "s2", "s3"],
  },
  R_FILL_BLANKS: {
    text: "The experiment was {{b1}} under controlled {{b2}}.",
    blanks: [
      { id: "b1", answer: "conducted", options: ["conducted", "avoided", "ignored"] },
      { id: "b2", answer: "conditions", options: ["conditions", "chances", "reasons"] },
    ],
  },
  SUMMARIZE_SPOKEN_TEXT: { transcript: "Reference transcript.", keyPoints: ["idea 1", "idea 2"] },
  MCQ_MULTI_L: {
    options: [{ id: "a", text: "A" }, { id: "b", text: "B" }, { id: "c", text: "C" }],
    correctOptionIds: ["b"],
  },
  L_FILL_BLANKS: {
    text: "Scientists have {{b1}} a new {{b2}} of coral.",
    blanks: [{ id: "b1", answer: "discovered" }, { id: "b2", answer: "species" }],
  },
  HIGHLIGHT_SUMMARY: {
    options: [{ id: "a", text: "Correct summary paragraph." }, { id: "b", text: "Wrong summary." }],
    correctOptionId: "a",
  },
  MCQ_SINGLE_L: {
    options: [{ id: "a", text: "A" }, { id: "b", text: "B" }],
    correctOptionId: "b",
  },
  SELECT_MISSING_WORD: {
    options: [{ id: "a", text: "environment" }, { id: "b", text: "economy" }],
    correctOptionId: "a",
  },
  HIGHLIGHT_INCORRECT_WORDS: {
    transcriptWords: ["The", "quick", "brown", "fox", "jumps"],
    incorrectIndices: [2],
  },
  WRITE_FROM_DICTATION: { referenceText: "The lecture will begin promptly at noon." },
};
