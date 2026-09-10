import { describe, it, expect } from "vitest";
import { GEN_SPECS } from "@/lib/content/generation";
import { TaskType } from "@prisma/client";

/**
 * These guard the generator's own validation. A model can produce fluent,
 * plausible-looking content that is structurally unusable — a gap with no
 * answer, an answer absent from its dropdown, a "correct" option that isn't
 * among the options. Those items must never reach the question bank.
 */

describe("every task type has a generation spec", () => {
  it("covers all 20 task types", () => {
    for (const t of Object.values(TaskType)) {
      expect(GEN_SPECS[t], `missing spec for ${t}`).toBeDefined();
      expect(GEN_SPECS[t].guidance.length).toBeGreaterThan(20);
    }
  });
});

describe("blank/token consistency", () => {
  const validate = GEN_SPECS.RW_FILL_BLANKS.validate!;

  it("accepts matching tokens, blanks and word bank", () => {
    expect(
      validate({
        text: "The {{b1}} rose while the {{b2}} fell.",
        blanks: [
          { id: "b1", answer: "index" },
          { id: "b2", answer: "yield" },
        ],
        wordBank: ["index", "yield", "margin", "surplus"],
      }),
    ).toBeNull();
  });

  it("rejects a token with no declared blank", () => {
    expect(
      validate({
        text: "The {{b1}} rose while the {{b2}} fell.",
        blanks: [{ id: "b1", answer: "index" }],
        wordBank: ["index"],
      }),
    ).toMatch(/b2/);
  });

  it("rejects a blank that never appears in the text", () => {
    expect(
      validate({
        text: "The {{b1}} rose.",
        blanks: [
          { id: "b1", answer: "index" },
          { id: "b9", answer: "orphan" },
        ],
        wordBank: ["index", "orphan"],
      }),
    ).toMatch(/b9/);
  });

  it("rejects a word bank missing a correct answer", () => {
    expect(
      validate({
        text: "The {{b1}} rose.",
        blanks: [{ id: "b1", answer: "index" }],
        wordBank: ["margin", "surplus"],
      }),
    ).toMatch(/missing answers/);
  });
});

describe("dropdown gaps must contain their own answer", () => {
  const validate = GEN_SPECS.R_FILL_BLANKS.validate!;

  it("rejects options that omit the answer", () => {
    expect(
      validate({
        text: "Research {{b1}} slowly.",
        blanks: [{ id: "b1", answer: "progresses", options: ["halts", "reverses", "stalls"] }],
      }),
    ).toMatch(/omit the answer/);
  });
});

describe("multiple-choice answer keys", () => {
  const single = GEN_SPECS.MCQ_SINGLE_R.validate!;
  const multi = GEN_SPECS.MCQ_MULTI_R.validate!;
  const options = [
    { id: "a", text: "A" },
    { id: "b", text: "B" },
    { id: "c", text: "C" },
  ];

  it("rejects a correct id that is not an option", () => {
    expect(single({ options, correctOptionId: "z" })).toMatch(/not one of the options/);
  });

  it("accepts a valid single answer", () => {
    expect(single({ options, correctOptionId: "b" })).toBeNull();
  });

  it("rejects a multi-answer question where everything is correct", () => {
    expect(multi({ options, correctOptionIds: ["a", "b", "c"] })).toMatch(/every option/);
  });
});

describe("re-order paragraphs", () => {
  const validate = GEN_SPECS.REORDER_PARAGRAPHS.validate!;

  it("requires correctOrder to be a permutation of the item ids", () => {
    const items = [
      { id: "s1", text: "One" },
      { id: "s2", text: "Two" },
    ];
    expect(validate({ items, correctOrder: ["s2", "s1"] })).toBeNull();
    expect(validate({ items, correctOrder: ["s1", "s3"] })).toMatch(/does not contain/);
  });
});

describe("highlight incorrect words", () => {
  const validate = GEN_SPECS.HIGHLIGHT_INCORRECT_WORDS.validate!;

  it("rejects indices past the end of the transcript", () => {
    expect(
      validate({ transcriptWords: ["a", "b", "c"], incorrectIndices: [1, 7] }),
    ).toMatch(/out of range/);
  });

  it("rejects an item with nothing marked incorrect", () => {
    expect(validate({ transcriptWords: ["a", "b"], incorrectIndices: [] })).toMatch(/no incorrect/);
  });
});
