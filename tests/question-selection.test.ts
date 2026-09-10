import { describe, it, expect } from "vitest";
import { selectCandidateIds } from "@/lib/questions";

const POOL = ["q1", "q2", "q3", "q4", "q5"];

describe("selectCandidateIds", () => {
  it("prefers questions that are neither served nor attempted", () => {
    expect(selectCandidateIds(POOL, ["q1"], ["q2", "q3"])).toEqual(["q4", "q5"]);
  });

  it("never re-serves a question from the current session while others remain", () => {
    // Every question has been attempted before, so tier 1 is empty. Tier 2
    // must still exclude what this session already showed.
    const candidates = selectCandidateIds(POOL, ["q1", "q2"], POOL);
    expect(candidates).toEqual(["q3", "q4", "q5"]);
    expect(candidates).not.toContain("q1");
  });

  it("falls back to the full pool only once the session has seen everything", () => {
    expect(selectCandidateIds(POOL, POOL, POOL)).toEqual(POOL);
  });

  it("always returns something for a non-empty pool", () => {
    // This is the property that stopped the repeat loop: an empty return here
    // previously sent the caller to an unfiltered random pick.
    expect(selectCandidateIds(POOL, POOL, POOL).length).toBeGreaterThan(0);
  });

  it("returns nothing for an empty pool", () => {
    expect(selectCandidateIds([], ["q1"], ["q2"])).toEqual([]);
  });

  it("walking the pool serves each question exactly once before repeating", () => {
    const served: string[] = [];
    for (let i = 0; i < POOL.length; i++) {
      const next = selectCandidateIds(POOL, served, [])[0];
      served.push(next);
    }
    expect(new Set(served).size).toBe(POOL.length);
  });
});
