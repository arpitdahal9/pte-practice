// Provide the minimum env for @/lib/env to validate during tests, and force
// scoring into offline mock mode so no external APIs are called.
process.env.DATABASE_URL ||= "postgresql://test:test@localhost:5432/test?schema=public";
process.env.AUTH_SECRET ||= "test-secret-value-for-vitest-runs-only-0000";
process.env.SCORING_MOCK = "true";
process.env.ANTHROPIC_API_KEY = "";
process.env.OPENAI_API_KEY = "";
