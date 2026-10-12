import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { saveCachedEntitlement } from "@/lib/entitlement/entitlement-service";
import { mutateCentralSubscription } from "@/lib/supabase/server";
import { isSupabaseServerAdminConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "You must be signed in to activate a subscription." } },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { plan = "premium", planName, billingInterval = "monthly", amount = 9.99, currency = "USD", sessionId } = body;

    const validatedPlan = plan === "family" ? "family" : "premium";
    const validatedPlanName =
      planName || (validatedPlan === "family" ? "Family Circle Plus" : "Life Pro Premium");
    const interval = billingInterval === "yearly" ? "yearly" : "monthly";

    const startDate = new Date();
    const periodEnd = new Date(startDate);
    if (interval === "yearly") {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setDate(periodEnd.getDate() + 30);
    }

    const numAmount = typeof amount === "number" ? amount : parseFloat(amount) || (validatedPlan === "family" ? 19.99 : 9.99);
    const curr = typeof currency === "string" ? currency.toUpperCase() : "USD";
    const paymentTxId = sessionId || `pi_sandbox_${Date.now()}`;

    // Atomically upsert user subscription and ledger transaction
    const sub = await prisma.$transaction(async (tx) => {
      const updatedSub = await tx.userSubscription.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          plan: validatedPlan,
          planName: validatedPlanName,
          status: "active",
          billingInterval: interval,
          billingCycle: interval,
          amount: numAmount,
          currency: curr,
          provider: "stripe",
          providerCustomerId: `cus_sandbox_${user.id.slice(-6)}`,
          providerSubscriptionId: `sub_sandbox_${Date.now()}`,
          providerPaymentId: paymentTxId,
          startedAt: startDate,
          currentPeriodStart: startDate,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: false,
        },
        update: {
          plan: validatedPlan,
          planName: validatedPlanName,
          status: "active",
          billingInterval: interval,
          billingCycle: interval,
          amount: numAmount,
          currency: curr,
          provider: "stripe",
          providerPaymentId: paymentTxId,
          currentPeriodStart: startDate,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: false,
          cancelledAt: null,
        },
      });

      const existingTx = await tx.billingTransaction.findUnique({
        where: { transactionId: paymentTxId },
      });

      if (!existingTx) {
        await tx.billingTransaction.create({
          data: {
            userId: user.id,
            subscriptionId: updatedSub.id,
            plan: validatedPlan,
            amount: numAmount,
            currency: curr,
            status: "paid",
            paymentProvider: "stripe",
            transactionId: paymentTxId,
            billingCycle: interval,
            paymentDate: startDate,
            notes: `Sandbox test checkout completed for ${validatedPlanName} (${interval})`,
          },
        });
      }

      return updatedSub;
    });

    const expiresAtIso = periodEnd.toISOString();
    const daysRemaining = interval === "yearly" ? 365 : 30;

    // Update authoritative entitlement cache
    saveCachedEntitlement(user.id, {
      plan: "premium",
      status: "active",
      startsAt: startDate.toISOString(),
      expiresAt: expiresAtIso,
      premiumEnabled: true,
      accountStatus: "active",
      appAccessAllowed: true,
      lastVerifiedAt: startDate.toISOString(),
      serverTime: startDate.toISOString(),
      daysRemaining,
    });

    // Synchronize to Central Supabase if configured
    if (isSupabaseServerAdminConfigured()) {
      await mutateCentralSubscription({
        customerId: user.id,
        plan: "premium",
        status: "active",
        expiresAt: expiresAtIso,
        adminEmail: user.email,
        reason: `Sandbox test activation for ${validatedPlanName}`,
      }).catch((err) => console.warn("[Sandbox Activate] Central sync warning:", err));
    }

    return NextResponse.json({
      success: true,
      received: true,
      message: `Successfully activated ${validatedPlanName}.`,
      data: {
        plan: validatedPlan,
        status: "active",
        currentPeriodEnd: expiresAtIso,
      },
    });
  } catch (error: any) {
    console.error("[Sandbox Activate Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message || "Failed to activate test subscription" } },
      { status: 500 }
    );
  }
}
