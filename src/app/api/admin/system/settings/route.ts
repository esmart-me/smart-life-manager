// src/app/api/admin/system/settings/route.ts
// Admin API for managing system services (Gemini AI and Google OAuth)
// Strictly restricted to authorized Master Administrators.

import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/session";
import {
  getSystemConfig,
  updatePersistentEnv,
  testGeminiConnection,
} from "@/lib/config/system-config-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "Administrator access denied." } },
      { status: 403 }
    );
  }

  const config = getSystemConfig();
  return NextResponse.json({
    success: true,
    data: config,
  });
}

export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "Administrator access denied." } },
      { status: 403 }
    );
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "BAD_REQUEST", message: "Invalid JSON payload" } },
      { status: 400 }
    );
  }

  const action = body?.action;

  // 1. Test Gemini connection
  if (action === "test_gemini") {
    const keyToTest = typeof body?.apiKey === "string" ? body.apiKey.trim() : undefined;
    const testResult = await testGeminiConnection(keyToTest);
    return NextResponse.json({
      success: testResult.success,
      message: testResult.message,
      model: testResult.model,
    });
  }

  // 2. Save / Update Gemini API key
  if (action === "save_gemini_key") {
    const apiKey = typeof body?.apiKey === "string" ? body.apiKey.trim() : "";
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "Gemini API key cannot be empty" } },
        { status: 400 }
      );
    }

    // Optional test before saving
    if (body?.testFirst) {
      const testResult = await testGeminiConnection(apiKey);
      if (!testResult.success) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "GEMINI_TEST_FAILED",
              message: `Validation failed: ${testResult.message}`,
            },
          },
          { status: 400 }
        );
      }
    }

    updatePersistentEnv({
      GEMINI_API_KEY: apiKey,
    });

    const updatedConfig = getSystemConfig();
    return NextResponse.json({
      success: true,
      message: "Gemini API key saved and activated successfully.",
      data: updatedConfig,
    });
  }

  // 3. Clear Gemini API key
  if (action === "clear_gemini_key") {
    updatePersistentEnv({
      GEMINI_API_KEY: null,
      AI_API_KEY: null,
    });

    const updatedConfig = getSystemConfig();
    return NextResponse.json({
      success: true,
      message: "Gemini API key cleared successfully.",
      data: updatedConfig,
    });
  }

  // 4. Save Google OAuth credentials (Desktop & Web)
  if (action === "save_google_oauth") {
    const entries: Record<string, string | null> = {};

    if (typeof body?.googleDesktopClientId === "string") {
      entries.GOOGLE_DESKTOP_CLIENT_ID = body.googleDesktopClientId.trim() || null;
    }
    if (typeof body?.googleDesktopClientSecret === "string") {
      entries.GOOGLE_DESKTOP_CLIENT_SECRET = body.googleDesktopClientSecret.trim() || null;
    }
    if (typeof body?.googleClientId === "string") {
      entries.GOOGLE_CLIENT_ID = body.googleClientId.trim() || null;
    }
    if (typeof body?.googleClientSecret === "string") {
      entries.GOOGLE_CLIENT_SECRET = body.googleClientSecret.trim() || null;
    }

    updatePersistentEnv(entries);

    const updatedConfig = getSystemConfig();
    return NextResponse.json({
      success: true,
      message: "Google OAuth credentials updated successfully.",
      data: updatedConfig,
    });
  }

  return NextResponse.json(
    { success: false, error: { code: "UNKNOWN_ACTION", message: `Unrecognized action: ${action}` } },
    { status: 400 }
  );
}
