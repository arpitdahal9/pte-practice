import { callClaudeJson } from "./claude";
import type { RubricSpec } from "./rubrics";
import type { ScoreContext, ScoreResult } from "./types";
import { SCORER_VERSION } from "./types";
import { toPteScore, words } from "./scale";
import { clamp } from "@/lib/utils";

interface ModelScore {
  scores: Record<string, number>;
  feedback: string;
  strengths?: string[];
  improvements?: string[];
}

function maxTotal(spec: RubricSpec): number {
  return spec.criteria.reduce((s, c) => s + c.max, 0);
}

function buildSystem(spec: RubricSpec): string {
  const criteriaList = spec.criteria
    .map((c) => `- ${c.key} (0–${c.max}): ${c.label}. ${c.description}`)
    .join("\n");
  return `${spec.persona}

This is style-alike practice content — not an official PTE exam. Score fairly and consistently.

Award integer points for EACH criterion, from 0 up to that criterion's maximum:
${criteriaList}

Judge only what the candidate actually produced. Base every criterion on
specific evidence in their response, and make the feedback refer to that
response concretely — quote or paraphrase what they wrote rather than giving
generic advice that would fit any answer.`;
}

/**
 * JSON schema constraining the model's reply. Numeric bounds are deliberately
 * absent — structured outputs reject `minimum`/`maximum`, so per-criterion
 * ceilings are enforced by clamping below.
 */
function buildSchema(spec: RubricSpec): Record<string, unknown> {
  const scoreProps: Record<string, unknown> = {};
  for (const c of spec.criteria) {
    scoreProps[c.key] = { type: "integer", description: `${c.label} (0–${c.max})` };
  }
  return {
    type: "object",
    properties: {
      scores: {
        type: "object",
        properties: scoreProps,
        required: spec.criteria.map((c) => c.key),
        additionalProperties: false,
      },
      feedback: {
        type: "string",
        description: "2–4 sentences of specific, actionable feedback on this response.",
      },
      strengths: { type: "array", items: { type: "string" } },
      improvements: { type: "array", items: { type: "string" } },
    },
    required: ["scores", "feedback", "strengths", "improvements"],
    additionalProperties: false,
  };
}

/** Score an open-ended task with Claude against its rubric. */
export async function aiScore(ctx: ScoreContext, spec: RubricSpec): Promise<ScoreResult> {
  const system = buildSystem(spec);
  const user = `Evaluate the following.\n\n${spec.buildReference(ctx)}`;

  const { data, rawText, model } = await callClaudeJson<ModelScore>(
    system,
    user,
    buildSchema(spec),
  );

  const breakdown: Record<string, number> = {};
  let earned = 0;
  for (const c of spec.criteria) {
    const raw = Number(data?.scores?.[c.key] ?? 0);
    const val = clamp(Math.round(isNaN(raw) ? 0 : raw), 0, c.max);
    breakdown[c.key] = val;
    earned += val;
  }

  return {
    overall: toPteScore(earned / maxTotal(spec)),
    breakdown,
    feedback: data?.feedback?.trim() || "Scored.",
    strengths: (data?.strengths ?? []).slice(0, 5),
    improvements: (data?.improvements ?? []).slice(0, 5),
    raw: { model: rawText },
    scorerModel: model,
    scorerVersion: SCORER_VERSION,
    mock: false,
  };
}

const MOCK_PREFIX =
  "[SAMPLE SCORE — SCORING_MOCK is enabled, so this is a length/variety heuristic, not a rubric-based grade. Unset SCORING_MOCK in .env for real scoring.] ";

/**
 * Deterministic, clearly-labeled heuristic used ONLY when SCORING_MOCK=true is
 * set explicitly, so the app can run offline and tests stay hermetic.
 *
 * This is never used as a fallback for a failed AI call. Silently substituting
 * it for a real score is what made every response look similarly graded.
 */
export function mockScore(ctx: ScoreContext, spec: RubricSpec): ScoreResult {
  const text = spec.speech
    ? ctx.transcript ?? ""
    : (ctx.response as { text?: string })?.text ?? "";
  const ws = words(text);
  const wordCount = ws.length;
  const uniqueRatio = wordCount ? new Set(ws).size / wordCount : 0;

  // Length adequacy vs the expected range (or a sensible default for speech).
  const range = spec.expectedWords ?? { min: 20, max: 120 };
  let lengthFactor: number;
  if (wordCount === 0) lengthFactor = 0;
  else if (wordCount < range.min) lengthFactor = wordCount / range.min;
  else if (wordCount > range.max) lengthFactor = Math.max(0.6, range.max / wordCount);
  else lengthFactor = 1;

  const quality = clamp(0.45 + 0.35 * lengthFactor + 0.2 * uniqueRatio, 0, 0.9);

  const breakdown: Record<string, number> = {};
  for (const c of spec.criteria) {
    breakdown[c.key] = Math.round(c.max * quality);
  }
  const earned = spec.criteria.reduce((s, c) => s + breakdown[c.key], 0);
  const max = maxTotal(spec);

  return {
    overall: toPteScore(earned / max),
    breakdown,
    feedback:
      MOCK_PREFIX +
      (wordCount === 0
        ? "No response detected."
        : `Estimated from length (${wordCount} words) and lexical variety. Configure AI scoring for detailed rubric feedback.`),
    strengths: wordCount >= range.min ? ["Adequate length"] : [],
    improvements:
      wordCount < range.min
        ? [`Aim for at least ${range.min} words.`]
        : wordCount > range.max
          ? [`Keep it under ${range.max} words.`]
          : ["Configure AI scoring for targeted feedback."],
    raw: { heuristic: { wordCount, uniqueRatio } },
    scorerModel: "mock-heuristic",
    scorerVersion: SCORER_VERSION,
    mock: true,
  };
}
