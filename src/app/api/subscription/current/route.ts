// src/app/api/subscription/current/route.ts
// Authoritative current subscription & entitlement endpoint.
// Central Supabase is strictly authoritative.

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getUserPlanSummary, getUserSubscription } from "@/lib/plans/plan-service";
import { getAuthoritativeEntitlement } from "@/lib/entitlement/entitlement-service";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  try {
    const [entitlement, summary, subscription, transactions] = await Promise.all([
      getAuthoritativeEntitlement(user.id),
      getUserPlanSummary(user.id),
      getUserSubscription(user.id),
      prisma.billingTransaction.findMany({
        where: { userId: user.id },
        orderBy: { paymentDate: "desc" },
        take: 10,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        summary,
        subscription,
        transactions,
        entitlement,
      },
    });
  } catch (error) {
    console.error("[Subscription Current GET Error]:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "SERVER_ERROR", message: "Failed to fetch subscription status" },
      },
      { status: 500 }
    );
  }
}
