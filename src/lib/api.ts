import { NextResponse } from "next/server";
import { z } from "zod";
import { getAppUser } from "@/lib/guest";

export function ok<T>(data: T, init?: number | ResponseInit) {
  return NextResponse.json(
    data,
    typeof init === "number" ? { status: init } : init,
  );
}

export function fail(message: string, status = 400, extra?: unknown) {
  return NextResponse.json({ error: message, ...(extra ? { details: extra } : {}) }, { status });
}

/** Parse+validate a JSON body; throws ApiError on failure. */
export async function parseBody<T extends z.ZodTypeAny>(
  req: Request,
  schema: T,
): Promise<z.infer<T>> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    throw new ApiError("Invalid JSON body", 400);
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    throw new ApiError("Validation failed", 422, parsed.error.flatten());
  }
  return parsed.data;
}

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(message: string, status = 400, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

/** Wrap a route handler with consistent error handling. */
export function handler(
  fn: (req: Request, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>,
) {
  return async (req: Request, ctx: { params: Promise<Record<string, string>> }) => {
    try {
      return await fn(req, ctx);
    } catch (err) {
      if (err instanceof ApiError) {
        return fail(err.message, err.status, err.details);
      }
      console.error("[api] Unhandled error:", err);
      return fail("Internal server error", 500);
    }
  };
}

/** Auth removed — always the shared guest user. */
export async function requireUser() {
  return getAppUser();
}

/** Admin restriction removed — same as requireUser. */
export async function requireAdmin() {
  return getAppUser();
}
