import Anthropic from "@anthropic-ai/sdk";
import { env, anthropicApiKey } from "@/lib/env";

/**
 * Thrown when a rubric score could not be obtained from Claude. Callers must
 * surface this to the user — never substitute a fabricated score.
 */
export class ScoringUnavailableError extends Error {
  /** True when the cause is credentials rather than a transient fault. */
  readonly isAuthError: boolean;
  readonly cause?: unknown;

  constructor(message: string, opts: { isAuthError?: boolean; cause?: unknown } = {}) {
    super(message);
    this.name = "ScoringUnavailableError";
    this.isAuthError = opts.isAuthError ?? false;
    this.cause = opts.cause;
  }
}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) {
    const apiKey = anthropicApiKey();
    // Passing `apiKey: undefined` lets the SDK walk its own credential chain
    // (ANTHROPIC_AUTH_TOKEN, then an `ant auth login` profile, then WIF).
    // Passing an empty string instead would authenticate with an empty key.
    client = apiKey ? new Anthropic({ apiKey }) : new Anthropic();
  }
  return client;
}

/** Reset the memoized client. Used by tests. */
export function resetClaudeClient() {
  client = null;
}

/** 401/403 are credential problems; retrying cannot fix them. */
function isAuthFailure(err: unknown): boolean {
  return err instanceof Anthropic.APIError && (err.status === 401 || err.status === 403);
}

/**
 * Retry only faults that a retry can plausibly fix: rate limits, server
 * errors, and connection failures. A malformed request (400/422) or a bad
 * credential (401/403) fails immediately.
 */
function isRetryable(err: unknown): boolean {
  if (err instanceof Anthropic.APIConnectionError) return true;
  if (err instanceof Anthropic.APIError) {
    return err.status === 408 || err.status === 429 || (err.status ?? 0) >= 500;
  }
  return false;
}

/**
 * The human-readable sentence from an API error.
 *
 * `err.message` on an APIError is often the whole serialised response body, so
 * using it directly leaks a JSON blob into the UI and duplicates the status
 * code. The parsed body carries just the sentence.
 */
function apiMessage(err: InstanceType<typeof Anthropic.APIError>): string {
  const body = err.error as { error?: { message?: string } } | undefined;
  return body?.error?.message ?? err.message;
}

/**
 * An exhausted credit balance arrives as a 400, which is otherwise a
 * "your request was malformed" status. It is worth its own message: nothing
 * about the request or the credentials is wrong, and the fix is billing.
 */
function isBillingFailure(err: unknown): boolean {
  return (
    err instanceof Anthropic.APIError &&
    err.status === 400 &&
    /credit balance is too low/i.test(apiMessage(err))
  );
}

function describe(err: unknown): string {
  if (err instanceof Anthropic.APIError) {
    return `Claude API error ${err.status ?? "?"}: ${apiMessage(err)}`;
  }
  return err instanceof Error ? err.message : String(err);
}

/** Exposed for tests; not part of the module's intended surface. */
export const describeForTest = describe;

export interface ClaudeJsonResult<T> {
  data: T;
  rawText: string;
  model: string;
}

/**
 * Call Claude and return a JSON object matching `schema`.
 *
 * Uses structured outputs (`output_config.format`), so the model is
 * constrained to emit exactly this shape — no prose, no code fences, and no
 * need to hunt for a JSON object in free text.
 *
 * Throws ScoringUnavailableError on failure. It never returns a fabricated
 * result; deciding what the user sees is the caller's job.
 */
export async function callClaudeJson<T = unknown>(
  system: string,
  user: string,
  schema: Record<string, unknown>,
  { maxTokens = 4096, retries = 2 }: { maxTokens?: number; retries?: number } = {},
): Promise<ClaudeJsonResult<T>> {
  const model = env.ANTHROPIC_MODEL;
  let lastErr: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const msg = await getClient().messages.create({
        model,
        // Thinking is on by default on current models and its tokens count
        // against max_tokens, so this needs real headroom — a tight budget
        // truncates the JSON body mid-object.
        max_tokens: maxTokens,
        output_config: {
          effort: env.ANTHROPIC_EFFORT,
          format: { type: "json_schema", schema },
        },
        system,
        messages: [{ role: "user", content: user }],
      });

      if (msg.stop_reason === "refusal") {
        throw new ScoringUnavailableError(
          "Claude declined to score this response.",
        );
      }
      if (msg.stop_reason === "max_tokens") {
        throw new Error("Response truncated before the score was complete");
      }

      const text = msg.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("");

      if (!text.trim()) throw new Error("Empty response from model");

      return { data: JSON.parse(text) as T, rawText: text, model };
    } catch (err) {
      // A refusal is a decision, not a fault — do not burn retries on it.
      if (err instanceof ScoringUnavailableError) throw err;

      lastErr = err;

      if (isAuthFailure(err)) {
        throw new ScoringUnavailableError(
          "Claude rejected the credentials. Set ANTHROPIC_API_KEY in .env, or run `ant auth login` to create an OAuth profile.",
          { isAuthError: true, cause: err },
        );
      }

      if (isBillingFailure(err)) {
        throw new ScoringUnavailableError(
          "This Anthropic account is out of API credits, so responses cannot be scored. " +
            "Add credits at https://console.anthropic.com/settings/billing, then use Retry scoring. " +
            "Note that a Claude.ai subscription is billed separately from API credits.",
          { cause: err },
        );
      }

      if (attempt < retries && isRetryable(err)) {
        await new Promise((r) => setTimeout(r, 400 * 2 ** attempt));
        continue;
      }
      break;
    }
  }

  throw new ScoringUnavailableError(
    `Scoring failed: ${describe(lastErr)}`,
    { cause: lastErr },
  );
}
