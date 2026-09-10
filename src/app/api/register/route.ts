import { NextResponse } from "next/server";

/** Registration disabled — app runs without accounts. */
export function POST() {
  return NextResponse.json({ error: "Registration is disabled" }, { status: 410 });
}
