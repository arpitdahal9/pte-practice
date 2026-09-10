import { describe, it, expect, vi, beforeEach } from "vitest";

// Force the AI path even though tests/setup.ts sets SCORING_MOCK=true, so we
// can assert on what happens when the scorer fails.
vi.mock("@/lib/env", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/env")>();
  return { ...actual, scoringMode: () => "ai" as const };
});

vi.mock("@/lib/scoring/claude", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/scoring/claude")>();
  return { ...actual, callClaudeJson: vi.fn() };
});

const { callClaudeJson, ScoringUnavailableError } = await import("@/lib/scoring/claude");
const { scoreResponse } = await import("@/lib/scoring");

const mockCall = vi.mocked(callClaudeJson);

const ESSAY_CTX = {
  payload: { prompt: "Discuss whether remote work benefits society." },
} as const;

describe("AI scoring never silently fabricates a score", () => {
  // Block body, not a concise arrow: mockReset() returns the mock itself, and
  // Vitest treats a function returned from beforeEach as a teardown hook —
  // which would invoke the mock (and throw) after every test.
  beforeEach(() => {
    mockCall.mockReset();
  });

  it("propagates the failure instead of returning a heuristic score", async () => {
    mockCall.mockImplementation(async () => {
      throw new ScoringUnavailableError("Claude rejected the credentials.", {
        isAuthError: true,
      });
    });

    let caught: unknown;
    try {
      await scoreResponse("WRITE_ESSAY", { text: "word ".repeat(250) }, ESSAY_CTX);
    } catch (e) {
      caught = e;
    }

    expect(caught).toBeInstanceOf(ScoringUnavailableError);
    expect((caught as InstanceType<typeof ScoringUnavailableError>).isAuthError).toBe(true);
  });

  it("does not retry-and-swallow into a mock result", async () => {
    mockCall.mockImplementation(async () => {
      throw new ScoringUnavailableError("upstream down");
    });

    const result = await scoreResponse(
      "WRITE_ESSAY",
      { text: "word ".repeat(250) },
      ESSAY_CTX,
    ).catch((e) => e);

    // The old behaviour returned a ScoreResult with mock:true here.
    expect(result).toBeInstanceOf(ScoringUnavailableError);
    expect(result).not.toHaveProperty("overall");
  });
});

describe("AI scoring reflects the model's actual judgement", () => {
  // Block body, not a concise arrow: mockReset() returns the mock itself, and
  // Vitest treats a function returned from beforeEach as a teardown hook —
  // which would invoke the mock (and throw) after every test.
  beforeEach(() => {
    mockCall.mockReset();
  });

  function reply(scores: Record<string, number>, feedback: string) {
    return {
      data: { scores, feedback, strengths: ["s"], improvements: ["i"] },
      rawText: "{}",
      model: "claude-opus-5",
    };
  }

  it("maps a strong and a weak response to clearly different scores", async () => {
    mockCall.mockResolvedValueOnce(
      reply(
        { content: 3, development: 2, form: 2, grammar: 2, vocabulary: 2, linguistic: 2, spelling: 2 },
        "Well argued throughout.",
      ),
    );
    const strong = await scoreResponse("WRITE_ESSAY", { text: "good" }, ESSAY_CTX);

    mockCall.mockResolvedValueOnce(
      reply(
        { content: 1, development: 0, form: 1, grammar: 1, vocabulary: 0, linguistic: 1, spelling: 1 },
        "Underdeveloped and off-topic in places.",
      ),
    );
    const weak = await scoreResponse("WRITE_ESSAY", { text: "bad" }, ESSAY_CTX);

    expect(strong.overall).toBeGreaterThan(weak.overall);
    expect(strong.feedback).not.toBe(weak.feedback);
    expect(strong.mock).toBe(false);
    expect(strong.scorerModel).toBe("claude-opus-5");
  });

  it("clamps an out-of-range criterion to its rubric maximum", async () => {
    mockCall.mockResolvedValueOnce(
      reply(
        // `content` maxes at 3 and the model returned 99; structured outputs
        // cannot express numeric bounds, so clamping is enforced in code.
        { content: 99, development: 2, form: 2, grammar: 2, vocabulary: 2, linguistic: 2, spelling: 2 },
        "ok",
      ),
    );
    const r = await scoreResponse("WRITE_ESSAY", { text: "x" }, ESSAY_CTX);

    expect(r.breakdown.content).toBe(3);
    expect(r.overall).toBeLessThanOrEqual(90);
  });
});

describe("API errors become readable messages", () => {
  beforeEach(() => {
    mockCall.mockReset();
  });

  it("does not leak a raw JSON body into the user-facing message", async () => {
    // What the real SDK produced: err.message was the whole serialised body,
    // so the UI showed `Claude API error 400: 400 {"type":"error",...}`.
    const { describeForTest } = await import("@/lib/scoring/claude");
    const fake = Object.assign(
      Object.create((await import("@anthropic-ai/sdk")).default.APIError.prototype),
      {
        status: 400,
        message: '400 {"type":"error","error":{"type":"invalid_request_error","message":"Your credit balance is too low to access the Anthropic API."}}',
        error: {
          type: "error",
          error: {
            type: "invalid_request_error",
            message: "Your credit balance is too low to access the Anthropic API.",
          },
        },
      },
    );

    const text = describeForTest(fake);
    expect(text).toBe(
      "Claude API error 400: Your credit balance is too low to access the Anthropic API.",
    );
    expect(text).not.toContain("{");
    expect(text).not.toContain("400: 400");
  });
});
