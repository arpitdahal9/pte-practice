import { NextResponse } from "next/server";

/** Auth endpoints disabled — app is open without accounts. */
export function GET() {
  return NextResponse.json({ error: "Authentication is disabled" }, { status: 410 });
}

export function POST() {
  return NextResponse.json({ error: "Authentication is disabled" }, { status: 410 });
}
