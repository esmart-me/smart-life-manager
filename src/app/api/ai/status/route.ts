// src/app/api/ai/status/route.ts
// Returns public-safe AI Assistant operational status.
// NEVER returns API keys or sensitive credentials.

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getAiConfigStatus } from "@/lib/ai/gemini-service";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const status = getAiConfigStatus();

  return NextResponse.json({
    success: true,
    data: status,
  });
}
