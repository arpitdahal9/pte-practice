import { describe, it, expect } from "vitest";
import { scoreResponse } from "@/lib/scoring";
import { responseSchemaFor, payloadSchemaFor } from "@/lib/pte/schemas";
import { parseBlanks } from "@/lib/pte/blanks";

describe("scoreResponse routing", () => {
  it("routes deterministic tasks and returns a 0–90 score", async () => {
    const r = await scoreResponse(
      "MCQ_SINGLE_R",
      { selectedOptionId: "b" },
      { payload: { options: [{ id: "a", text: "A" }, { id: "b", text: "B" }], correctOptionId: "b" } },
    );
    expect(r.overall).toBe(90);
    expect(r.scorerModel).toBe("deterministic");
    expect(r.mock).toBeFalsy();
  });

  it("returns a clearly labeled heuristic only when SCORING_MOCK is set", async () => {
    const r = await scoreResponse(
      "WRITE_ESSAY",
      { text: "This is a short essay ".repeat(20) },
      { payload: { prompt: "Discuss." } },
    );
    expect(r.mock).toBe(true);
    expect(r.overall).toBeGreaterThanOrEqual(0);
    expect(r.overall).toBeLessThanOrEqual(90);
    expect(Object.keys(r.breakdown).length).toBeGreaterThan(0);
    expect(r.feedback).toContain("SAMPLE SCORE");
  });
});

describe("response schema validation", () => {
  it("accepts a valid MCQ multi response", () => {
    const ok = responseSchemaFor("MCQ_MULTI_R").safeParse({ selectedOptionIds: ["a"] });
    expect(ok.success).toBe(true);
  });
  it("rejects a malformed response", () => {
    const bad = responseSchemaFor("MCQ_MULTI_R").safeParse({ selectedOptionIds: "a" });
    expect(bad.success).toBe(false);
  });
  it("maps L_FILL_BLANKS to the answers-map schema", () => {
    const ok = responseSchemaFor("L_FILL_BLANKS").safeParse({ answers: { b1: "x" } });
    expect(ok.success).toBe(true);
  });
});

describe("payload schema validation", () => {
  it("validates a reorder payload", () => {
    const ok = payloadSchemaFor("REORDER_PARAGRAPHS").safeParse({
      items: [{ id: "s1", text: "1" }, { id: "s2", text: "2" }],
      correctOrder: ["s1", "s2"],
    });
    expect(ok.success).toBe(true);
  });
  it("rejects an MCQ payload missing the correct answer", () => {
    const bad = payloadSchemaFor("MCQ_SINGLE_R").safeParse({
      options: [{ id: "a", text: "A" }, { id: "b", text: "B" }],
    });
    expect(bad.success).toBe(false);
  });
});

describe("parseBlanks", () => {
  it("splits text into text and blank segments in order", () => {
    const segs = parseBlanks("The {{b1}} sat on the {{b2}}.");
    expect(segs).toEqual([
      { type: "text", value: "The " },
      { type: "blank", id: "b1" },
      { type: "text", value: " sat on the " },
      { type: "blank", id: "b2" },
      { type: "text", value: "." },
    ]);
  });
});
