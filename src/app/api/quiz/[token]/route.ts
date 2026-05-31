import { NextResponse } from "next/server";

export const runtime = "nodejs";

export function GET(): Response {
  return NextResponse.json(
    { error: { code: "NOT_IMPLEMENTED", message: "Not implemented." } },
    { status: 501 }
  );
}
