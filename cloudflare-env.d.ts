/** Minimal D1 binding shape for PrismaD1 (avoids pulling Workers globals into DOM tsc). */
interface D1Database {
  prepare(query: string): unknown;
  batch?(statements: unknown[]): Promise<unknown[]>;
  exec?(query: string): Promise<unknown>;
}

/** Cloudflare Worker bindings used by this app (OpenNext + D1). */
interface CloudflareEnv {
  DB: D1Database;
}
