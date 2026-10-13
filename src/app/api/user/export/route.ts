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

    // ── Fetch all customer-owned data in parallel strictly scoped to uid ─────────
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
      plannerTasks,
      inventoryItems,
      familyEvents,
      familyTasks,
      familyShoppingItems,
      habits,
      wellnessLogs,
      trips,
      knowledgeCollections,
      knowledgeNotes,
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
      prisma.plannerTask.findMany({ where: { userId: uid }, orderBy: { date: "asc" } }),
      prisma.inventoryItem.findMany({
        where: { userId: uid },
        orderBy: { createdAt: "desc" },
        include: { serviceLogs: { orderBy: { serviceDate: "desc" } } },
      }),
      prisma.familyEvent.findMany({ where: { userId: uid }, orderBy: { eventDate: "asc" } }),
      prisma.familyTask.findMany({ where: { userId: uid }, orderBy: { dueDate: "asc" } }),
      prisma.familyShoppingItem.findMany({ where: { userId: uid }, orderBy: { createdAt: "desc" } }),
      prisma.habit.findMany({
        where: { userId: uid },
        orderBy: { createdAt: "asc" },
        include: { logs: { orderBy: { date: "desc" } } },
      }),
      prisma.wellnessLog.findMany({ where: { userId: uid }, orderBy: { date: "desc" } }),
      prisma.trip.findMany({
        where: { userId: uid },
        orderBy: { startDate: "asc" },
        include: {
          itineraries: { orderBy: { dayDate: "asc" } },
          packingItems: { orderBy: { createdAt: "asc" } },
        },
      }),
      prisma.knowledgeCollection.findMany({ where: { userId: uid }, orderBy: { name: "asc" } }),
      prisma.knowledgeNote.findMany({ where: { userId: uid }, orderBy: { updatedAt: "desc" } }),
    ]);

    // ── CSV Export (section-specific) ──────────────────────────────────────────
    if (format === "csv") {
      const csvData = buildCSV(section, {
        reminders,
        documents,
        vehicles,
        payments,
        expenses,
        budgets,
        subscriptions,
        importantDates,
        familyMembers,
        plannerTasks,
        inventoryItems,
        familyEvents,
        familyTasks,
        familyShoppingItems,
        habits,
        wellnessLogs,
        trips,
        knowledgeNotes,
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
        startDate: s.startDate?.toISOString() ?? null,
        trialEndDate: s.trialEndDate?.toISOString() ?? null,
        websiteUrl: s.websiteUrl,
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
      plannerTasks: plannerTasks.map((t) => ({
        title: t.title,
        description: t.description,
        itemType: t.itemType,
        date: t.date.toISOString(),
        startTime: t.startTime,
        endTime: t.endTime,
        location: t.location,
        priority: t.priority,
        category: t.category,
        isCompleted: t.isCompleted,
        completedAt: t.completedAt?.toISOString() ?? null,
        notes: t.notes,
        createdAt: t.createdAt.toISOString(),
      })),
      inventoryItems: inventoryItems.map((item) => ({
        name: item.name,
        category: item.category,
        brand: item.brand,
        modelNumber: item.modelNumber,
        serialNumber: item.serialNumber,
        purchaseDate: item.purchaseDate?.toISOString() ?? null,
        purchasePrice: item.purchasePrice,
        currency: item.currency,
        retailer: item.retailer,
        location: item.location,
        warrantyStart: item.warrantyStart?.toISOString() ?? null,
        warrantyExpiry: item.warrantyExpiry?.toISOString() ?? null,
        warrantyNotes: item.warrantyNotes,
        notes: item.notes,
        isArchived: item.isArchived,
        createdAt: item.createdAt.toISOString(),
        serviceLogs: item.serviceLogs.map((s) => ({
          serviceDate: s.serviceDate.toISOString(),
          description: s.description,
          provider: s.provider,
          cost: s.cost,
          currency: s.currency,
          nextServiceDate: s.nextServiceDate?.toISOString() ?? null,
          notes: s.notes,
          createdAt: s.createdAt.toISOString(),
        })),
      })),
      familyEvents: familyEvents.map((fe) => ({
        title: fe.title,
        description: fe.description,
        eventDate: fe.eventDate.toISOString(),
        endDate: fe.endDate?.toISOString() ?? null,
        startTime: fe.startTime,
        endTime: fe.endTime,
        location: fe.location,
        category: fe.category,
        isAllDay: fe.isAllDay,
        notes: fe.notes,
        createdAt: fe.createdAt.toISOString(),
      })),
      familyTasks: familyTasks.map((ft) => ({
        title: ft.title,
        description: ft.description,
        assignedMemberName: ft.assignedMemberName,
        dueDate: ft.dueDate?.toISOString() ?? null,
        priority: ft.priority,
        status: ft.status,
        category: ft.category,
        isCompleted: ft.isCompleted,
        completedAt: ft.completedAt?.toISOString() ?? null,
        createdAt: ft.createdAt.toISOString(),
      })),
      familyShoppingItems: familyShoppingItems.map((si) => ({
        item: si.item,
        quantity: si.quantity,
        category: si.category,
        isPurchased: si.isPurchased,
        estimatedCost: si.estimatedCost,
        assignedMemberName: si.assignedMemberName,
        notes: si.notes,
        createdAt: si.createdAt.toISOString(),
      })),
      habits: habits.map((h) => ({
        title: h.title,
        description: h.description,
        category: h.category,
        frequency: h.frequency,
        targetDaysPerWeek: h.targetDaysPerWeek,
        currentStreak: h.currentStreak,
        bestStreak: h.bestStreak,
        color: h.color,
        reminderTime: h.reminderTime,
        isArchived: h.isArchived,
        createdAt: h.createdAt.toISOString(),
        logs: h.logs.map((l) => ({
          date: l.date.toISOString(),
          completed: l.completed,
          notes: l.notes,
        })),
      })),
      wellnessLogs: wellnessLogs.map((wl) => ({
        date: wl.date.toISOString(),
        sleepHours: wl.sleepHours,
        waterGlasses: wl.waterGlasses,
        exerciseMinutes: wl.exerciseMinutes,
        mood: wl.mood,
        notes: wl.notes,
        createdAt: wl.createdAt.toISOString(),
      })),
      trips: trips.map((tr) => ({
        title: tr.title,
        destination: tr.destination,
        startDate: tr.startDate.toISOString(),
        endDate: tr.endDate.toISOString(),
        status: tr.status,
        estimatedBudget: tr.estimatedBudget,
        actualCost: tr.actualCost,
        currency: tr.currency,
        notes: tr.notes,
        createdAt: tr.createdAt.toISOString(),
        itineraries: tr.itineraries.map((it) => ({
          dayDate: it.dayDate.toISOString(),
          timeSlot: it.timeSlot,
          activity: it.activity,
          location: it.location,
          bookingRef: it.bookingRef,
          confirmationDetails: it.confirmationDetails,
          cost: it.cost,
          category: it.category,
          notes: it.notes,
          createdAt: it.createdAt.toISOString(),
        })),
        packingItems: tr.packingItems.map((pk) => ({
          item: pk.item,
          category: pk.category,
          isPacked: pk.isPacked,
          quantity: pk.quantity,
          createdAt: pk.createdAt.toISOString(),
        })),
      })),
      knowledgeCollections: knowledgeCollections.map((kc) => ({
        name: kc.name,
        description: kc.description,
        color: kc.color,
        icon: kc.icon,
        createdAt: kc.createdAt.toISOString(),
      })),
      knowledgeNotes: knowledgeNotes.map((kn) => ({
        title: kn.title,
        content: kn.content,
        tags: kn.tags,
        isPinned: kn.isPinned,
        isFavorite: kn.isFavorite,
        isArchived: kn.isArchived,
        sourceUrl: kn.sourceUrl,
        attachmentName: kn.attachmentName,
        createdAt: kn.createdAt.toISOString(),
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
  reminders: any[];
  documents: any[];
  vehicles: any[];
  payments: any[];
  expenses: any[];
  budgets: any[];
  subscriptions: any[];
  importantDates: any[];
  familyMembers: any[];
  plannerTasks: any[];
  inventoryItems: any[];
  familyEvents: any[];
  familyTasks: any[];
  familyShoppingItems: any[];
  habits: any[];
  wellnessLogs: any[];
  trips: any[];
  knowledgeNotes: any[];
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
    case "reminders": {
      const header = ["Title","Description","Due Date","Priority","Status","Category","Recurring","Recurrence Rule","Completed At","Created At"];
      const rows = data.reminders.map((r) =>
        row([r.title, r.description, r.dueDate, r.priority, r.status, r.category, r.isRecurring, r.recurrenceRule, r.completedAt, r.createdAt])
      );
      return [header.join(","), ...rows].join("\n");
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
    case "planner": {
      const header = ["Title","Type","Date","Start Time","End Time","Location","Priority","Category","Completed","Created At"];
      const rows = data.plannerTasks.map((t) =>
        row([t.title, t.itemType, t.date, t.startTime, t.endTime, t.location, t.priority, t.category, t.isCompleted, t.createdAt])
      );
      return [header.join(","), ...rows].join("\n");
    }
    case "inventory": {
      const header = ["Name","Category","Brand","Model","Location","Purchase Price","Currency","Warranty Expiry","Archived","Created At"];
      const rows = data.inventoryItems.map((i) =>
        row([i.name, i.category, i.brand, i.modelNumber, i.location, i.purchasePrice, i.currency, i.warrantyExpiry, i.isArchived, i.createdAt])
      );
      return [header.join(","), ...rows].join("\n");
    }
    case "wellness": {
      const header = ["Habit","Category","Frequency","Streak","Best Streak","Archived","Created At"];
      const rows = data.habits.map((h) =>
        row([h.title, h.category, h.frequency, h.currentStreak, h.bestStreak, h.isArchived, h.createdAt])
      );
      return [header.join(","), ...rows].join("\n");
    }
    case "travel": {
      const header = ["Trip","Destination","Start Date","End Date","Status","Budget","Actual Cost","Currency","Created At"];
      const rows = data.trips.map((tr) =>
        row([tr.title, tr.destination, tr.startDate, tr.endDate, tr.status, tr.estimatedBudget, tr.actualCost, tr.currency, tr.createdAt])
      );
      return [header.join(","), ...rows].join("\n");
    }
    case "knowledge": {
      const header = ["Title","Tags","Pinned","Favorite","Archived","Created At","Content Preview"];
      const rows = data.knowledgeNotes.map((kn) =>
        row([kn.title, kn.tags, kn.isPinned, kn.isFavorite, kn.isArchived, kn.createdAt, kn.content ? kn.content.slice(0, 100) : ""])
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
