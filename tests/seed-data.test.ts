import { describe, it, expect } from "vitest";
import { SEED } from "../prisma/seed-data";
import { SEED_EXTRA } from "../prisma/seed-data-extra";
import { payloadSchemaFor } from "@/lib/pte/schemas";
import { parseBlanks } from "@/lib/pte/blanks";
import { TaskType } from "@prisma/client";

const ALL = [...SEED, ...SEED_EXTRA];

/**
 * Hand-authored seed content is exactly where an off-by-one in a word index or
 * a mistyped option id hides — it looks fine on the page and only breaks when a
 * learner is graded against it. These checks run over every seeded item.
 */

const AUDIO_TASKS = new Set<TaskType>([
  "REPEAT_SENTENCE", "RETELL_LECTURE", "ANSWER_SHORT_QUESTION", "SUMMARIZE_SPOKEN_TEXT",
  "MCQ_MULTI_L", "L_FILL_BLANKS", "HIGHLIGHT_SUMMARY", "MCQ_SINGLE_L",
  "SELECT_MISSING_WORD", "HIGHLIGHT_INCORRECT_WORDS", "WRITE_FROM_DICTATION",
]);

describe("seed payloads", () => {
  it("every item validates against its task's payload schema", () => {
    const failures = ALL.flatMap((item) => {
      const parsed = payloadSchemaFor(item.taskType).safeParse(item.payload);
      return parsed.success
        ? []
        : [`${item.title}: ${parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`];
    });
    expect(failures).toEqual([]);
  });

  it("titles are unique (import dedups on title)", () => {
    const seen = new Map<string, number>();
    for (const i of ALL) seen.set(i.title, (seen.get(i.title) ?? 0) + 1);
    expect([...seen.entries()].filter(([, n]) => n > 1).map(([t]) => t)).toEqual([]);
  });

  it("every audio-prompt task has a spoken script", () => {
    const missing = ALL.filter((i) => AUDIO_TASKS.has(i.taskType) && !i.spoken?.trim());
    expect(missing.map((i) => i.title)).toEqual([]);
  });
});

describe("answer keys are internally consistent", () => {
  it("single-answer options contain their correct id", () => {
    const bad = ALL.flatMap((item) => {
      const p = item.payload as { options?: { id: string }[]; correctOptionId?: string };
      if (!p?.correctOptionId) return [];
      return p.options?.some((o) => o.id === p.correctOptionId) ? [] : [item.title];
    });
    expect(bad).toEqual([]);
  });

  it("multi-answer options contain every correct id", () => {
    const bad = ALL.flatMap((item) => {
      const p = item.payload as { options?: { id: string }[]; correctOptionIds?: string[] };
      if (!p?.correctOptionIds) return [];
      const ids = (p.options ?? []).map((o) => o.id);
      return p.correctOptionIds.every((c) => ids.includes(c)) ? [] : [item.title];
    });
    expect(bad).toEqual([]);
  });

  it("re-order correctOrder is a permutation of the item ids", () => {
    const bad = ALL.flatMap((item) => {
      if (item.taskType !== "REORDER_PARAGRAPHS") return [];
      const p = item.payload as { items: { id: string }[]; correctOrder: string[] };
      const a = p.items.map((i) => i.id).sort();
      const b = [...p.correctOrder].sort();
      return JSON.stringify(a) === JSON.stringify(b) ? [] : [item.title];
    });
    expect(bad).toEqual([]);
  });

  it("gap-fill tokens and declared blanks agree", () => {
    const bad = ALL.flatMap((item) => {
      const p = item.payload as { text?: string; blanks?: { id: string }[] };
      if (!p?.text || !p.blanks) return [];
      const inText = parseBlanks(p.text)
        .filter((s): s is { type: "blank"; id: string } => s.type === "blank")
        .map((s) => s.id)
        .sort();
      const declared = p.blanks.map((b) => b.id).sort();
      return JSON.stringify(inText) === JSON.stringify(declared) ? [] : [item.title];
    });
    expect(bad).toEqual([]);
  });

  it("drag-fill word banks contain every correct answer", () => {
    const bad = ALL.flatMap((item) => {
      if (item.taskType !== "RW_FILL_BLANKS") return [];
      const p = item.payload as { blanks: { answer: string }[]; wordBank: string[] };
      return p.blanks.every((b) => p.wordBank.includes(b.answer)) ? [] : [item.title];
    });
    expect(bad).toEqual([]);
  });

  it("dropdown gaps list their own answer as an option", () => {
    const bad = ALL.flatMap((item) => {
      if (item.taskType !== "R_FILL_BLANKS") return [];
      const p = item.payload as { blanks: { answer: string; options: string[] }[] };
      return p.blanks.every((b) => b.options.includes(b.answer)) ? [] : [item.title];
    });
    expect(bad).toEqual([]);
  });
});

describe("highlight-incorrect-words items", () => {
  const items = ALL.filter((i) => i.taskType === "HIGHLIGHT_INCORRECT_WORDS");

  it("marks indices that exist and actually differ from the spoken text", () => {
    const problems: string[] = [];
    for (const item of items) {
      const p = item.payload as { transcriptWords: string[]; incorrectIndices: number[] };
      const spokenWords = (item.spoken ?? "").split(/\s+/).filter(Boolean);

      for (const i of p.incorrectIndices) {
        if (i < 0 || i >= p.transcriptWords.length) {
          problems.push(`${item.title}: index ${i} out of range`);
          continue;
        }
        // The marked word must genuinely differ from what is read aloud,
        // otherwise the "correct" answer is unmarkable.
        if (spokenWords[i] && spokenWords[i] === p.transcriptWords[i]) {
          problems.push(`${item.title}: index ${i} ("${p.transcriptWords[i]}") matches the spoken word`);
        }
      }

      // Conversely, any position that differs must be marked.
      if (spokenWords.length === p.transcriptWords.length) {
        for (let i = 0; i < spokenWords.length; i++) {
          if (spokenWords[i] !== p.transcriptWords[i] && !p.incorrectIndices.includes(i)) {
            problems.push(
              `${item.title}: index ${i} differs ("${spokenWords[i]}" vs "${p.transcriptWords[i]}") but is not marked`,
            );
          }
        }
      }
    }
    expect(problems).toEqual([]);
  });
});

describe("bank size", () => {
  it("reports how many questions exist per task type", () => {
    const counts = new Map<TaskType, number>();
    for (const i of ALL) counts.set(i.taskType, (counts.get(i.taskType) ?? 0) + 1);

    // Every task type must be usable at all.
    for (const t of Object.values(TaskType)) {
      expect(counts.get(t) ?? 0, `no seeded questions for ${t}`).toBeGreaterThan(0);
    }
    expect(ALL.length).toBeGreaterThanOrEqual(180);
  });
});
