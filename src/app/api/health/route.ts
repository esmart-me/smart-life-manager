import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    const startTime = Date.now();
    // Test active database connectivity with a lightweight count
    const userCount = await prisma.user.count();
    const durationMs = Date.now() - startTime;

    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        latencyMs: durationMs,
        userCount,
      },
      environment: process.env.NODE_ENV,
    });
  } catch (error) {
    console.error("[Health Check Error]:", error);
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        database: {
          connected: false,
          error: error instanceof Error ? error.message : "Database connection failed",
        },
      },
      { status: 503 }
    );
  }
}
