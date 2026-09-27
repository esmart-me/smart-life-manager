import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { calculateBudgetAnalytics } from "@/lib/finance/calculations";
import { BUDGET_KEYS } from "@/lib/finance/constants";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const monthParam = searchParams.get("month"); // e.g. "2026-09"

  let referenceDate = new Date();
  if (monthParam) {
    const parts = monthParam.split("-");
    if (parts.length === 2) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      if (!isNaN(year) && !isNaN(month)) {
        referenceDate = new Date(year, month, 1);
      }
    }
  }

  try {
    const [budgets, expenses, profile] = await Promise.all([
      prisma.budget.findMany({
        where: { userId: user.id },
      }),
      prisma.expense.findMany({
        where: { userId: user.id },
        select: { category: true, amount: true, spentAt: true },
      }),
      prisma.profile.findUnique({
        where: { userId: user.id },
        select: { currency: true },
      }),
    ]);

    const currency = profile?.currency || "USD";
    const analytics = calculateBudgetAnalytics(budgets, expenses, referenceDate);

    return NextResponse.json({
      success: true,
      data: {
        budgets,
        analytics,
        currency,
      },
    });
  } catch (error) {
    console.error("[Budget GET Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to fetch budget data" } },
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
    const body = await request.json();
    const {
      monthlyIncome,
      monthlyBudget,
      savingsTarget,
      categoryBudgets,
      currency = "USD",
    } = body;

    const upsertBudget = async (categoryKey: string, amount: number) => {
      const existing = await prisma.budget.findFirst({
        where: { userId: user.id, category: categoryKey },
      });

      if (existing) {
        return prisma.budget.update({
          where: { id: existing.id },
          data: {
            limitAmount: Math.max(0, amount),
            currency,
            period: "monthly",
          },
        });
      } else {
        return prisma.budget.create({
          data: {
            userId: user.id,
            category: categoryKey,
            limitAmount: Math.max(0, amount),
            currency,
            period: "monthly",
          },
        });
      }
    };

    // 1. Update Monthly Income if provided
    if (monthlyIncome !== undefined) {
      await upsertBudget(BUDGET_KEYS.INCOME, Number(monthlyIncome) || 0);
    }

    // 2. Update Monthly Budget if provided
    if (monthlyBudget !== undefined) {
      await upsertBudget(BUDGET_KEYS.TOTAL, Number(monthlyBudget) || 0);
    }

    // 3. Update Savings Target if provided
    if (savingsTarget !== undefined) {
      await upsertBudget(BUDGET_KEYS.SAVINGS_TARGET, Number(savingsTarget) || 0);
    }

    // 4. Update Category Budgets if provided
    if (Array.isArray(categoryBudgets)) {
      for (const cat of categoryBudgets) {
        if (cat.category && typeof cat.category === "string") {
          const catName = cat.category.trim();
          const limitAmount = Number(cat.limitAmount) || 0;
          await upsertBudget(catName, limitAmount);
        }
      }
    } else if (categoryBudgets && typeof categoryBudgets === "object") {
      for (const [catName, amount] of Object.entries(categoryBudgets)) {
        await upsertBudget(catName.trim(), Number(amount) || 0);
      }
    }

    // Fetch updated data and return analytics
    const [allBudgets, expenses] = await Promise.all([
      prisma.budget.findMany({ where: { userId: user.id } }),
      prisma.expense.findMany({
        where: { userId: user.id },
        select: { category: true, amount: true, spentAt: true },
      }),
    ]);

    const analytics = calculateBudgetAnalytics(allBudgets, expenses);

    return NextResponse.json({
      success: true,
      message: "Budget settings saved successfully",
      data: {
        budgets: allBudgets,
        analytics,
      },
    });
  } catch (error) {
    console.error("[Budget POST Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SAVE_FAILED", message: "Failed to save budget settings" } },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");

  try {
    if (category) {
      await prisma.budget.deleteMany({
        where: { userId: user.id, category },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Budget entry deleted successfully",
    });
  } catch (error) {
    console.error("[Budget DELETE Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "DELETE_FAILED", message: "Failed to delete budget entry" } },
      { status: 500 }
    );
  }
}
