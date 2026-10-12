import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

// Backup format version for future compatibility checks
const BACKUP_VERSION = "1.0.0";
const BACKUP_SCHEMA = "slm-backup";

/**
 * GET /api/user/export?format=json|csv&section=all|reminders|documents|vehicles|...
 *
 * Exports authenticated customer data. Scoped strictly to the authenticated user.
 * Never exposes passwords, tokens, secrets, or other users' data.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const format = (searchParams.get("format") || "json").toLowerCase();
    const section = (searchParams.get("section") || "all").toLowerCase();

    if (!["json", "csv"].includes(format)) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_FORMAT", message: "Format must be 'json' or 'csv'" } },
        { status: 400 }
      );
    }

    const uid = user.id;

    // ── Fetch all customer-owned data in parallel ──────────────────────────────
    const [
      profile,
      settings,
      reminders,
      documents,
      vehicles,
      payments,
      expenses,
      budgets,
      subscriptions,
      importantDates,
      familyMembers,
    ] = await Promise.all([
      prisma.profile.findUnique({ where: { userId: uid } }),
      prisma.userSetting.findUnique({ where: { userId: uid } }),
      prisma.reminder.findMany({ where: { userId: uid }, orderBy: { dueDate: "asc" } }),
      prisma.document.findMany({
        where: { userId: uid },
        orderBy: { createdAt: "desc" },
        include: { files: { select: { id: true, fileName: true, fileType: true, fileSize: true, createdAt: true } } },
      }),
      prisma.vehicle.findMany({ where: { userId: uid }, orderBy: { createdAt: "desc" } }),
      prisma.payment.findMany({ where: { userId: uid }, orderBy: { dueDate: "desc" } }),
      prisma.expense.findMany({ where: { userId: uid }, orderBy: { spentAt: "desc" } }),
      prisma.budget.findMany({ where: { userId: uid }, orderBy: { createdAt: "desc" } }),
      prisma.subscription.findMany({ where: { userId: uid }, orderBy: { nextBillingDate: "asc" } }),
      prisma.importantDate.findMany({ where: { userId: uid }, orderBy: { eventDate: "asc" } }),
      prisma.familyMember.findMany({ where: { userId: uid }, orderBy: { name: "asc" } }),
    ]);

    // ── CSV Export (section-specific) ──────────────────────────────────────────
    if (format === "csv") {
      const csvData = buildCSV(section, {
        reminders, documents, vehicles, payments, expenses,
        budgets, subscriptions, importantDates, familyMembers,
      });

      if (!csvData) {
        return NextResponse.json(
          { success: false, error: { code: "INVALID_SECTION", message: `Section '${section}' is not available as CSV` } },
          { status: 400 }
        );
      }

      const filename = `slm-${section}-export-${dateStamp()}.csv`;
      return new NextResponse(csvData, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    // ── JSON Full Backup ───────────────────────────────────────────────────────
    const backup = {
      _meta: {
        schema: BACKUP_SCHEMA,
        version: BACKUP_VERSION,
        exportedAt: new Date().toISOString(),
        userId: uid,           // embedded for ownership validation on restore
        userEmail: user.email, // used for restore identity check (not auth)
      },
      profile: profile
        ? {
            firstName: profile.firstName,
            lastName: profile.lastName,
            displayName: profile.displayName,
            phoneNumber: profile.phoneNumber,
            timezone: profile.timezone,
            country: profile.country,
            region: profile.region,
            currency: profile.currency,
            locale: profile.locale,
          }
        : null,
      settings: settings
        ? {
            theme: settings.theme,
            emailNotifications: settings.emailNotifications,
            pushNotifications: settings.pushNotifications,
            reminderDaysBefore: settings.reminderDaysBefore,
            weeklyDigest: settings.weeklyDigest,
            notificationsEnabled: settings.notificationsEnabled,
            notifyCritical: settings.notifyCritical,
            notifyHigh: settings.notifyHigh,
            notifyMedium: settings.notifyMedium,
            notifyLow: settings.notifyLow,
            notifyReminders: settings.notifyReminders,
            notifyPayments: settings.notifyPayments,
            notifyDocuments: settings.notifyDocuments,
            notifyVehicles: settings.notifyVehicles,
            notifySubscriptions: settings.notifySubscriptions,
            notifyImportantDates: settings.notifyImportantDates,
            quietHoursEnabled: settings.quietHoursEnabled,
            quietHoursStart: settings.quietHoursStart,
            quietHoursEnd: settings.quietHoursEnd,
            allowCriticalInQuietHours: settings.allowCriticalInQuietHours,
            soundEnabled: settings.soundEnabled,
          }
        : null,
      reminders: reminders.map((r) => ({
        title: r.title,
        description: r.description,
        dueDate: r.dueDate.toISOString(),
        priority: r.priority,
        status: r.status,
        category: r.category,
        isRecurring: r.isRecurring,
        recurrenceRule: r.recurrenceRule,
        reminderTiming: r.reminderTiming,
        customMinutesBefore: r.customMinutesBefore,
        timezone: r.timezone,
        completedAt: r.completedAt?.toISOString() ?? null,
        createdAt: r.createdAt.toISOString(),
      })),
      documents: documents.map((d) => ({
        title: d.title,
        category: d.category,
        documentNumber: d.documentNumber,
        issuedBy: d.issuedBy,
        issueDate: d.issueDate?.toISOString() ?? null,
        expiryDate: d.expiryDate?.toISOString() ?? null,
        hasExpiry: d.hasExpiry,
        notes: d.notes,
        tags: d.tags,
        fileCount: d.files.length,
        // Note: actual file binaries are NOT included (only metadata)
        files: d.files.map((f) => ({
          fileName: f.fileName,
          fileType: f.fileType,
          fileSize: f.fileSize,
          createdAt: f.createdAt.toISOString(),
        })),
        createdAt: d.createdAt.toISOString(),
      })),
      vehicles: vehicles.map((v) => ({
        name: v.name,
        make: v.make,
        model: v.model,
        year: v.year,
        licensePlate: v.licensePlate,
        vin: v.vin,
        registrationExpiry: v.registrationExpiry?.toISOString() ?? null,
        insuranceExpiry: v.insuranceExpiry?.toISOString() ?? null,
        inspectionExpiry: v.inspectionExpiry?.toISOString() ?? null,
        nextServiceDate: v.nextServiceDate?.toISOString() ?? null,
        mileage: v.mileage,
        nextServiceMileage: v.nextServiceMileage,
        notes: v.notes,
        createdAt: v.createdAt.toISOString(),
      })),
      payments: payments.map((p) => ({
        title: p.title,
        payee: p.payee,
        amount: p.amount,
        currency: p.currency,
        dueDate: p.dueDate.toISOString(),
        isPaid: p.isPaid,
        paidAt: p.paidAt?.toISOString() ?? null,
        category: p.category,
        isRecurring: p.isRecurring,
        frequency: p.frequency,
        notes: p.notes,
        createdAt: p.createdAt.toISOString(),
      })),
      expenses: expenses.map((e) => ({
        title: e.title,
        amount: e.amount,
        currency: e.currency,
        category: e.category,
        spentAt: e.spentAt.toISOString(),
        paymentMethod: e.paymentMethod,
        merchant: e.merchant,
        notes: e.notes,
        createdAt: e.createdAt.toISOString(),
      })),
      budgets: budgets.map((b) => ({
        category: b.category,
        limitAmount: b.limitAmount,
        currency: b.currency,
        period: b.period,
        startDate: b.startDate?.toISOString() ?? null,
        endDate: b.endDate?.toISOString() ?? null,
        alertThreshold: b.alertThreshold,
        createdAt: b.createdAt.toISOString(),
      })),
      subscriptions: subscriptions.map((s) => ({
        name: s.name,
        cost: s.cost,
        currency: s.currency,
        billingCycle: s.billingCycle,
        nextBillingDate: s.nextBillingDate.toISOString(),
        renewalStatus: s.renewalStatus,
        category: s.category,
        notes: s.notes,
        createdAt: s.createdAt.toISOString(),
      })),
      importantDates: importantDates.map((d) => ({
        title: d.title,
        eventDate: d.eventDate.toISOString(),
        category: d.category,
        recurrence: d.recurrence,
        reminderDaysBefore: d.reminderDaysBefore,
        notes: d.notes,
        createdAt: d.createdAt.toISOString(),
      })),
      familyMembers: familyMembers.map((f) => ({
        name: f.name,
        relationship: f.relationship,
        birthDate: f.birthDate?.toISOString() ?? null,
        bloodType: f.bloodType,
        emergencyContact: f.emergencyContact,
        phoneNumber: f.phoneNumber,
        email: f.email,
        notes: f.notes,
        createdAt: f.createdAt.toISOString(),
      })),
    };

    const filename = `slm-backup-${dateStamp()}.json`;
    const jsonStr = JSON.stringify(backup, null, 2);

    return new NextResponse(jsonStr, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("[Export GET Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "EXPORT_FAILED", message: "Failed to generate export" } },
      { status: 500 }
    );
  }
}

// ── CSV Builder ────────────────────────────────────────────────────────────────

interface DataMap {
  reminders: { title: string; description?: string | null; dueDate: Date; priority: string; status: string; category: string; isRecurring: boolean; recurrenceRule?: string | null; completedAt?: Date | null; createdAt: Date }[];
  documents: { title: string; category: string; documentNumber?: string | null; issuedBy?: string | null; issueDate?: Date | null; expiryDate?: Date | null; hasExpiry: boolean; notes?: string | null; tags?: string | null; files: { fileName: string; fileType: string; fileSize: number; createdAt: Date }[]; createdAt: Date }[];
  vehicles: { name: string; make?: string | null; model?: string | null; year?: number | null; licensePlate?: string | null; vin?: string | null; registrationExpiry?: Date | null; insuranceExpiry?: Date | null; inspectionExpiry?: Date | null; nextServiceDate?: Date | null; mileage?: number | null; notes?: string | null; createdAt: Date }[];
  payments: { title: string; payee?: string | null; amount: number; currency: string; dueDate: Date; isPaid: boolean; paidAt?: Date | null; category: string; isRecurring: boolean; frequency?: string | null; notes?: string | null; createdAt: Date }[];
  expenses: { title: string; amount: number; currency: string; category: string; spentAt: Date; paymentMethod?: string | null; merchant?: string | null; notes?: string | null; createdAt: Date }[];
  budgets: { category: string; limitAmount: number; currency: string; period: string; startDate?: Date | null; endDate?: Date | null; alertThreshold: number; createdAt: Date }[];
  subscriptions: { name: string; cost: number; currency: string; billingCycle: string; nextBillingDate: Date; renewalStatus: string; category: string; notes?: string | null; createdAt: Date }[];
  importantDates: { title: string; eventDate: Date; category: string; recurrence: string; reminderDaysBefore: number; notes?: string | null; createdAt: Date }[];
  familyMembers: { name: string; relationship: string; birthDate?: Date | null; bloodType?: string | null; emergencyContact: boolean; phoneNumber?: string | null; email?: string | null; notes?: string | null; createdAt: Date }[];
}

function buildCSV(section: string, data: DataMap): string | null {
  const escape = (v: unknown): string => {
    const s = v === null || v === undefined ? "" : String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const row = (cols: unknown[]) => cols.map(escape).join(",");

  switch (section) {
    case "reminders":
    case "all": {
      if (section === "reminders") {
        const header = ["Title","Description","Due Date","Priority","Status","Category","Recurring","Recurrence Rule","Completed At","Created At"];
        const rows = data.reminders.map((r) =>
          row([r.title, r.description, r.dueDate, r.priority, r.status, r.category, r.isRecurring, r.recurrenceRule, r.completedAt, r.createdAt])
        );
        return [header.join(","), ...rows].join("\n");
      }
      // For 'all', fall through to return null (all is JSON only)
      return null;
    }
    case "documents": {
      const header = ["Title","Category","Document Number","Issued By","Issue Date","Expiry Date","Has Expiry","Notes","Tags","File Count","Created At"];
      const rows = data.documents.map((d) =>
        row([d.title, d.category, d.documentNumber, d.issuedBy, d.issueDate, d.expiryDate, d.hasExpiry, d.notes, d.tags, d.files?.length ?? 0, d.createdAt])
      );
      return [header.join(","), ...rows].join("\n");
    }
    case "vehicles": {
      const header = ["Name","Make","Model","Year","License Plate","VIN","Registration Expiry","Insurance Expiry","Inspection Expiry","Next Service Date","Mileage","Notes","Created At"];
      const rows = data.vehicles.map((v) =>
        row([v.name, v.make, v.model, v.year, v.licensePlate, v.vin, v.registrationExpiry, v.insuranceExpiry, v.inspectionExpiry, v.nextServiceDate, v.mileage, v.notes, v.createdAt])
      );
      return [header.join(","), ...rows].join("\n");
    }
    case "payments": {
      const header = ["Title","Payee","Amount","Currency","Due Date","Paid","Paid At","Category","Recurring","Frequency","Notes","Created At"];
      const rows = data.payments.map((p) =>
        row([p.title, p.payee, p.amount, p.currency, p.dueDate, p.isPaid, p.paidAt, p.category, p.isRecurring, p.frequency, p.notes, p.createdAt])
      );
      return [header.join(","), ...rows].join("\n");
    }
    case "expenses": {
      const header = ["Title","Amount","Currency","Category","Spent At","Payment Method","Merchant","Notes","Created At"];
      const rows = data.expenses.map((e) =>
        row([e.title, e.amount, e.currency, e.category, e.spentAt, e.paymentMethod, e.merchant, e.notes, e.createdAt])
      );
      return [header.join(","), ...rows].join("\n");
    }
    case "subscriptions": {
      const header = ["Name","Cost","Currency","Billing Cycle","Next Billing Date","Status","Category","Notes","Created At"];
      const rows = data.subscriptions.map((s) =>
        row([s.name, s.cost, s.currency, s.billingCycle, s.nextBillingDate, s.renewalStatus, s.category, s.notes, s.createdAt])
      );
      return [header.join(","), ...rows].join("\n");
    }
    case "dates": {
      const header = ["Title","Event Date","Category","Recurrence","Reminder Days Before","Notes","Created At"];
      const rows = data.importantDates.map((d) =>
        row([d.title, d.eventDate, d.category, d.recurrence, d.reminderDaysBefore, d.notes, d.createdAt])
      );
      return [header.join(","), ...rows].join("\n");
    }
    case "family": {
      const header = ["Name","Relationship","Birth Date","Blood Type","Emergency Contact","Phone","Email","Notes","Created At"];
      const rows = data.familyMembers.map((f) =>
        row([f.name, f.relationship, f.birthDate, f.bloodType, f.emergencyContact, f.phoneNumber, f.email, f.notes, f.createdAt])
      );
      return [header.join(","), ...rows].join("\n");
    }
    default:
      return null;
  }
}

function dateStamp(): string {
  return new Date().toISOString().slice(0, 10);
}
