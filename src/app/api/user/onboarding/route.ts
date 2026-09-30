import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  try {
    const setting = await prisma.userSetting.findUnique({
      where: { userId: user.id },
      select: {
        onboardingCompleted: true,
        onboardingStep: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        onboardingCompleted: setting?.onboardingCompleted ?? false,
        onboardingStep: setting?.onboardingStep ?? 1,
      },
    });
  } catch (error: unknown) {
    console.error("[Onboarding API GET Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to retrieve onboarding state" } },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { step, completed } = body;

    const dataToUpdate: { onboardingCompleted?: boolean; onboardingStep?: number } = {};

    if (completed !== undefined) {
      dataToUpdate.onboardingCompleted = Boolean(completed);
    }

    if (step !== undefined) {
      const stepNum = Number(step);
      if (!isNaN(stepNum) && stepNum >= 1 && stepNum <= 10) {
        dataToUpdate.onboardingStep = Math.floor(stepNum);
      }
    }

    const updated = await prisma.userSetting.upsert({
      where: { userId: user.id },
      update: dataToUpdate,
      create: {
        userId: user.id,
        onboardingCompleted: dataToUpdate.onboardingCompleted ?? false,
        onboardingStep: dataToUpdate.onboardingStep ?? 1,
      },
      select: {
        onboardingCompleted: true,
        onboardingStep: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        onboardingCompleted: updated.onboardingCompleted,
        onboardingStep: updated.onboardingStep,
      },
    });
  } catch (error: unknown) {
    console.error("[Onboarding API POST Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to update onboarding state" } },
      { status: 500 }
    );
  }
}
