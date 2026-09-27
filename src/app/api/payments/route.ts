import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { calculatePaymentStatus } from "@/lib/finance/calculations";
import { PAYMENT_CATEGORIES } from "@/lib/finance/constants";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const statusFilter = (searchParams.get("status") || "all").trim().toLowerCase();
  const categoryFilter = (searchParams.get("category") || "all").trim();
  const searchQuery = (searchParams.get("q") || "").trim().toLowerCase();

  try {
    const rawPayments = await prisma.payment.findMany({
      where: {
        userId: user.id,
        ...(categoryFilter !== "all" && categoryFilter !== "" ? { category: categoryFilter } : {}),
      },
      orderBy: { dueDate: "asc" },
    });

    const now = new Date();

    const paymentsWithStatus = rawPayments.map((p) => {
      const status = calculatePaymentStatus(p.dueDate, p.isPaid, now);
      return {
        ...p,
        status,
      };
    });

    const filtered = paymentsWithStatus.filter((p) => {
      // Status filter
      if (statusFilter !== "all" && statusFilter !== "") {
        const normalized = p.status.toLowerCase().replace(/\s+/g, "_");
        const target = statusFilter.replace(/[-\s]+/g, "_");
        if (normalized !== target) {
          return false;
        }
      }

      // Search query filter
      if (searchQuery) {
        const matchTitle = p.title.toLowerCase().includes(searchQuery);
        const matchPayee = p.payee?.toLowerCase().includes(searchQuery) || false;
        const matchNotes = p.notes?.toLowerCase().includes(searchQuery) || false;
        const matchCategory = p.category.toLowerCase().includes(searchQuery);
        if (!matchTitle && !matchPayee && !matchNotes && !matchCategory) {
          return false;
        }
      }

      return true;
    });

    return NextResponse.json({
      success: true,
      data: {
        payments: filtered,
        total: filtered.length,
      },
    });
  } catch (error) {
    console.error("[Payments GET Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to fetch payments" } },
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
    const { title, payee, amount, currency, dueDate, category, frequency, isRecurring, notes, isPaid } = body;

    if (!title || typeof title !== "string" || title.trim() === "") {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_TITLE", message: "Payment title is required" } },
        { status: 400 }
      );
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_AMOUNT", message: "A valid positive payment amount is required" } },
        { status: 400 }
      );
    }

    if (!dueDate) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_DUE_DATE", message: "Due date is required" } },
        { status: 400 }
      );
    }

    const cleanDueDate = new Date(dueDate);
    if (isNaN(cleanDueDate.getTime())) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_DUE_DATE", message: "Invalid due date format" } },
        { status: 400 }
      );
    }

    const recurring = Boolean(isRecurring) || (Boolean(frequency) && frequency !== "none");
    const cleanFrequency = recurring ? (frequency || "monthly") : null;

    const payment = await prisma.payment.create({
      data: {
        userId: user.id,
        title: title.trim(),
        payee: payee ? String(payee).trim() : null,
        amount: numAmount,
        currency: currency || "USD",
        dueDate: cleanDueDate,
        category: category || "Other",
        isRecurring: recurring,
        frequency: cleanFrequency,
        notes: notes ? String(notes).trim() : null,
        isPaid: Boolean(isPaid),
        paidAt: isPaid ? new Date() : null,
      },
    });

    const status = calculatePaymentStatus(payment.dueDate, payment.isPaid);

    return NextResponse.json(
      {
        success: true,
        message: "Payment created successfully",
        data: { payment: { ...payment, status } },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[Payments POST Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "CREATE_FAILED", message: "Failed to create payment" } },
      { status: 500 }
    );
  }
}
