import { NextResponse } from "next/server";

export const runtime = "nodejs";

export function POST(): Response {
  return NextResponse.json(
    { error: { code: "NOT_IMPLEMENTED", message: "Not implemented." } },
    { status: 501 }
  );
}
