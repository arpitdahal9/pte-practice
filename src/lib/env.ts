import { z } from "zod";

/**
 * Centralized, validated environment access.
 * Import `env` anywhere on the server instead of reading process.env directly.
 *
 * Optional integrations (OpenAI, S3, Google) are allowed to be empty.
 *
 * Anthropic credentials are deliberately NOT validated here: the SDK resolves
 * them from several sources in priority order (ANTHROPIC_API_KEY →
 * ANTHROPIC_AUTH_TOKEN → an `ant auth login` OAuth profile on disk → workload
 * identity federation). An unset ANTHROPIC_API_KEY does not mean "no
 * credentials", so we never gate scoring on its presence — we attempt the call
 * and surface a real error if authentication fails. See scoringMode() below.
 */

const bool = (def = false) =>
  z
    .string()
    .optional()
    .transform((v) => (v == null ? def : v.toLowerCase() === "true"));

const schema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  AUTH_SECRET: z.string().optional().default("dev-only-auth-disabled"),
  NEXTAUTH_URL: z.string().url().optional().default("http://localhost:3000"),

  AUTH_GOOGLE_ID: z.string().optional().default(""),
  AUTH_GOOGLE_SECRET: z.string().optional().default(""),

  ANTHROPIC_API_KEY: z.string().optional().default(""),
  ANTHROPIC_MODEL: z.string().default("claude-opus-5"),
  /** Thinking depth / token spend for scoring calls. */
  ANTHROPIC_EFFORT: z.enum(["low", "medium", "high", "xhigh", "max"]).default("medium"),

  OPENAI_API_KEY: z.string().optional().default(""),
  STT_MODEL: z.string().default("whisper-1"),

  SCORING_MOCK: bool(false),

  STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  S3_ENDPOINT: z.string().optional().default(""),
  S3_REGION: z.string().default("us-east-1"),
  S3_BUCKET: z.string().optional().default(""),
  S3_ACCESS_KEY_ID: z.string().optional().default(""),
  S3_SECRET_ACCESS_KEY: z.string().optional().default(""),
  S3_PUBLIC_URL: z.string().optional().default(""),
  S3_FORCE_PATH_STYLE: bool(true),

  ADMIN_EMAILS: z.string().optional().default(""),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
    .join("\n");
  throw new Error(
    `Invalid environment variables:\n${issues}\n\nDid you copy .env.example to .env?`,
  );
}

export const env = parsed.data;

/**
 * How open-ended responses get scored.
 *
 *  - "mock": SCORING_MOCK=true was set explicitly. Returns a clearly-labeled
 *    heuristic estimate. Intended for offline development and tests only.
 *  - "ai":   the default. Calls Claude against the task's rubric. If no usable
 *    credential is resolvable the call fails loudly rather than silently
 *    degrading to a fake score.
 *
 * There is deliberately no third "AI configured?" state — the SDK's credential
 * chain (see the note at the top of this file) cannot be probed synchronously,
 * and guessing produced the silent-fallback bug this replaced.
 */
export const scoringMode = (): "mock" | "ai" => (env.SCORING_MOCK ? "mock" : "ai");

/**
 * An explicit API key, or undefined to let the SDK resolve a credential
 * itself. Returning undefined matters: passing `apiKey: ""` would occupy the
 * highest-priority credential slot and authenticate with an empty key,
 * shadowing any OAuth profile from `ant auth login`.
 */
export const anthropicApiKey = (): string | undefined =>
  env.ANTHROPIC_API_KEY.length > 0 ? env.ANTHROPIC_API_KEY : undefined;

/** True when Whisper transcription can actually run. */
export const hasWhisper = () =>
  !env.SCORING_MOCK && env.OPENAI_API_KEY.length > 0;

/** True when Google OAuth is configured. */
export const hasGoogleOAuth = () =>
  env.AUTH_GOOGLE_ID.length > 0 && env.AUTH_GOOGLE_SECRET.length > 0;

export const adminEmails = () =>
  env.ADMIN_EMAILS.split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
