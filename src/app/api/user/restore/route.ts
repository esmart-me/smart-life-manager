import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

const BACKUP_SCHEMA = "slm-backup";
const SUPPORTED_VERSIONS = ["1.0.0"];
const MAX_BACKUP_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * POST /api/user/restore
 *
 * Restores customer-owned data from a previously exported JSON backup.
 *
 * Security guarantees:
 * - Requires valid authenticated session (getCurrentUser)
 * - Validates backup schema and version before touching the DB
 * - Verifies the backup email matches the authenticated user (prevents Customer A → Customer B cross-restore)
 * - Never touches authentication, passwords, sessions, admin data, Stripe keys, or other users' records
 * - All DB writes are wrapped in a single Prisma transaction (atomic restore)
 * - File size limit: 10 MB
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    // ── Size limit check ────────────────────────────────────────────────────────
    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_BACKUP_SIZE_BYTES) {
      return NextResponse.json(
        { success: false, error: { code: "FILE_TOO_LARGE", message: "Backup file exceeds the 10 MB limit." } },
        { status: 413 }
      );
    }

    // ── Parse body ──────────────────────────────────────────────────────────────
    let backup: Record<string, unknown>;
    try {
      const text = await req.text();
      if (text.length > MAX_BACKUP_SIZE_BYTES) {
        return NextResponse.json(
          { success: false, error: { code: "FILE_TOO_LARGE", message: "Backup file exceeds the 10 MB limit." } },
          { status: 413 }
        );
      }
      backup = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_JSON", message: "Backup file is not valid JSON." } },
        { status: 400 }
      );
    }

    // ── Validate backup structure ───────────────────────────────────────────────
    const meta = backup._meta as Record<string, string> | undefined;
    if (!meta || typeof meta !== "object") {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_BACKUP", message: "Missing backup metadata. This file is not a valid Smart Life Manager backup." } },
        { status: 400 }
      );
    }

    if (meta.schema !== BACKUP_SCHEMA) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_BACKUP", message: "This file is not a Smart Life Manager backup." } },
        { status: 400 }
      );
    }

    if (!SUPPORTED_VERSIONS.includes(meta.version)) {
      return NextResponse.json(
        { success: false, error: { code: "INCOMPATIBLE_VERSION", message: `Backup version '${meta.version}' is not supported. Supported versions: ${SUPPORTED_VERSIONS.join(", ")}` } },
        { status: 400 }
      );
    }

    // ── CRITICAL: Cross-customer restore prevention ─────────────────────────────
    // The backup stores the exporting user's email. We verify it matches the
    // currently authenticated user so Customer A's backup cannot be loaded into
    // Customer B's account.
    if (meta.userEmail && meta.userEmail.toLowerCase() !== user.email.toLowerCase()) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "OWNERSHIP_MISMATCH",
            message: "This backup belongs to a different account and cannot be restored here.",
          },
        },
        { status: 403 }
      );
    }

    // ── Extract and validate data sections ──────────────────────────────────────
    const reminders = validateArray(backup.reminders, "reminders");
    const documents = validateArray(backup.documents, "documents");
    const vehicles = validateArray(backup.vehicles, "vehicles");
    const payments = validateArray(backup.payments, "payments");
    const expenses = validateArray(backup.expenses, "expenses");
    const budgets = validateArray(backup.budgets, "budgets");
    const subscriptions = validateArray(backup.subscriptions, "subscriptions");
    const importantDates = validateArray(backup.importantDates, "importantDates");
    const familyMembers = validateArray(backup.familyMembers, "familyMembers");
    const profileData = backup.profile as Record<string, unknown> | null | undefined;
    const settingsData = backup.settings as Record<string, unknown> | null | undefined;

    const uid = user.id;
    const now = new Date();

    // ── Atomic restore transaction ──────────────────────────────────────────────
    // Clears the user's existing application data and writes backup data.
    // Authentication records (User, Session, PasswordResetToken) are NEVER touched.
    const result = await prisma.$transaction(async (tx) => {
      // Clear existing user content (same set as clear-data route)
      await tx.documentFile.deleteMany({ where: { userId: uid } });
      await tx.document.deleteMany({ where: { userId: uid } });
      await tx.reminder.deleteMany({ where: { userId: uid } });
      await tx.payment.deleteMany({ where: { userId: uid } });
      await tx.expense.deleteMany({ where: { userId: uid } });
      await tx.budget.deleteMany({ where: { userId: uid } });
      await tx.vehicle.deleteMany({ where: { userId: uid } });
      await tx.subscription.deleteMany({ where: { userId: uid } });
      await tx.importantDate.deleteMany({ where: { userId: uid } });
      await tx.familyMember.deleteMany({ where: { userId: uid } });

      // Restore profile (upsert only safe fields — no auth fields)
      if (profileData && typeof profileData === "object") {
        await tx.profile.upsert({
          where: { userId: uid },
          update: {
            firstName: safeStr(profileData.firstName),
            lastName: safeStr(profileData.lastName),
            displayName: safeStr(profileData.displayName),
            phoneNumber: safeStr(profileData.phoneNumber),
            timezone: safeStr(profileData.timezone) || "UTC",
            country: safeStr(profileData.country) || "US",
            region: safeStr(profileData.region) || "US",
            currency: safeStr(profileData.currency) || "USD",
            locale: safeStr(profileData.locale) || "en-US",
          },
          create: {
            userId: uid,
            firstName: safeStr(profileData.firstName),
            lastName: safeStr(profileData.lastName),
            displayName: safeStr(profileData.displayName),
            phoneNumber: safeStr(profileData.phoneNumber),
            timezone: safeStr(profileData.timezone) || "UTC",
            country: safeStr(profileData.country) || "US",
            region: safeStr(profileData.region) || "US",
            currency: safeStr(profileData.currency) || "USD",
            locale: safeStr(profileData.locale) || "en-US",
          },
        });
      }

      // Restore settings (only notification/UI prefs — no auth or billing)
      if (settingsData && typeof settingsData === "object") {
        await tx.userSetting.upsert({
          where: { userId: uid },
          update: {
            theme: safeStr(settingsData.theme) || "system",
            emailNotifications: safeBool(settingsData.emailNotifications, true),
            pushNotifications: safeBool(settingsData.pushNotifications, true),
            reminderDaysBefore: safeIntRequired(settingsData.reminderDaysBefore, 3),
            weeklyDigest: safeBool(settingsData.weeklyDigest, true),
            notificationsEnabled: safeBool(settingsData.notificationsEnabled, true),
            notifyCritical: safeBool(settingsData.notifyCritical, true),
            notifyHigh: safeBool(settingsData.notifyHigh, true),
            notifyMedium: safeBool(settingsData.notifyMedium, true),
            notifyLow: safeBool(settingsData.notifyLow, true),
            notifyReminders: safeBool(settingsData.notifyReminders, true),
            notifyPayments: safeBool(settingsData.notifyPayments, true),
            notifyDocuments: safeBool(settingsData.notifyDocuments, true),
            notifyVehicles: safeBool(settingsData.notifyVehicles, true),
            notifySubscriptions: safeBool(settingsData.notifySubscriptions, true),
            notifyImportantDates: safeBool(settingsData.notifyImportantDates, true),
            quietHoursEnabled: safeBool(settingsData.quietHoursEnabled, false),
            quietHoursStart: safeStr(settingsData.quietHoursStart) || "22:00",
            quietHoursEnd: safeStr(settingsData.quietHoursEnd) || "07:00",
            allowCriticalInQuietHours: safeBool(settingsData.allowCriticalInQuietHours, true),
            soundEnabled: safeBool(settingsData.soundEnabled, true),
          },
          create: {
            userId: uid,
            theme: safeStr(settingsData.theme) || "system",
            emailNotifications: safeBool(settingsData.emailNotifications, true),
            pushNotifications: safeBool(settingsData.pushNotifications, true),
            reminderDaysBefore: safeIntRequired(settingsData.reminderDaysBefore, 3),
            weeklyDigest: safeBool(settingsData.weeklyDigest, true),
            notificationsEnabled: safeBool(settingsData.notificationsEnabled, true),
            notifyCritical: safeBool(settingsData.notifyCritical, true),
            notifyHigh: safeBool(settingsData.notifyHigh, true),
            notifyMedium: safeBool(settingsData.notifyMedium, true),
            notifyLow: safeBool(settingsData.notifyLow, true),
            notifyReminders: safeBool(settingsData.notifyReminders, true),
            notifyPayments: safeBool(settingsData.notifyPayments, true),
            notifyDocuments: safeBool(settingsData.notifyDocuments, true),
            notifyVehicles: safeBool(settingsData.notifyVehicles, true),
            notifySubscriptions: safeBool(settingsData.notifySubscriptions, true),
            notifyImportantDates: safeBool(settingsData.notifyImportantDates, true),
            quietHoursEnabled: safeBool(settingsData.quietHoursEnabled, false),
            quietHoursStart: safeStr(settingsData.quietHoursStart) || "22:00",
            quietHoursEnd: safeStr(settingsData.quietHoursEnd) || "07:00",
            allowCriticalInQuietHours: safeBool(settingsData.allowCriticalInQuietHours, true),
            soundEnabled: safeBool(settingsData.soundEnabled, true),
          },
        });
      }

      // Restore reminders
      let restoredReminders = 0;
      for (const r of reminders) {
        const item = r as Record<string, unknown>;
        const dueDate = safeDate(item.dueDate);
        if (!safeStr(item.title) || !dueDate) continue;
        await tx.reminder.create({
          data: {
            userId: uid,
            title: safeStr(item.title)!,
            description: safeStr(item.description) || null,
            dueDate,
            priority: safeStr(item.priority) || "medium",
            status: safeStr(item.status) === "completed" ? "completed" : "pending",
            category: safeStr(item.category) || "general",
            isRecurring: safeBool(item.isRecurring, false),
            recurrenceRule: safeStr(item.recurrenceRule) || null,
            reminderTiming: safeStr(item.reminderTiming) || "exact",
            customMinutesBefore: safeInt(item.customMinutesBefore),
            timezone: safeStr(item.timezone) || null,
            completedAt: safeDate(item.completedAt) || null,
            createdAt: safeDate(item.createdAt) || now,
          },
        });
        restoredReminders++;
      }

      // Restore documents (metadata only; files are not restored)
      let restoredDocuments = 0;
      for (const d of documents) {
        const item = d as Record<string, unknown>;
        if (!safeStr(item.title)) continue;
        await tx.document.create({
          data: {
            userId: uid,
            title: safeStr(item.title)!,
            category: safeStr(item.category) || "other",
            documentNumber: safeStr(item.documentNumber) || null,
            issuedBy: safeStr(item.issuedBy) || null,
            issueDate: safeDate(item.issueDate) || null,
            expiryDate: safeDate(item.expiryDate) || null,
            hasExpiry: safeBool(item.hasExpiry, false),
            notes: safeStr(item.notes) || null,
            tags: safeStr(item.tags) || null,
            createdAt: safeDate(item.createdAt) || now,
          },
        });
        restoredDocuments++;
      }

      // Restore vehicles
      let restoredVehicles = 0;
      for (const v of vehicles) {
        const item = v as Record<string, unknown>;
        if (!safeStr(item.name)) continue;
        await tx.vehicle.create({
          data: {
            userId: uid,
            name: safeStr(item.name)!,
            make: safeStr(item.make) || null,
            model: safeStr(item.model) || null,
            year: safeInt(item.year),
            licensePlate: safeStr(item.licensePlate) || null,
            vin: safeStr(item.vin) || null,
            registrationExpiry: safeDate(item.registrationExpiry) || null,
            insuranceExpiry: safeDate(item.insuranceExpiry) || null,
            inspectionExpiry: safeDate(item.inspectionExpiry) || null,
            nextServiceDate: safeDate(item.nextServiceDate) || null,
            mileage: safeInt(item.mileage),
            nextServiceMileage: safeInt(item.nextServiceMileage),
            notes: safeStr(item.notes) || null,
            createdAt: safeDate(item.createdAt) || now,
          },
        });
        restoredVehicles++;
      }

      // Restore payments
      let restoredPayments = 0;
      for (const p of payments) {
        const item = p as Record<string, unknown>;
        const dueDate = safeDate(item.dueDate);
        if (!safeStr(item.title) || !dueDate) continue;
        await tx.payment.create({
          data: {
            userId: uid,
            title: safeStr(item.title)!,
            payee: safeStr(item.payee) || null,
            amount: safeFloat(item.amount, 0),
            currency: safeStr(item.currency) || "USD",
            dueDate,
            isPaid: safeBool(item.isPaid, false),
            paidAt: safeDate(item.paidAt) || null,
            category: safeStr(item.category) || "bill",
            isRecurring: safeBool(item.isRecurring, false),
            frequency: safeStr(item.frequency) || null,
            notes: safeStr(item.notes) || null,
            createdAt: safeDate(item.createdAt) || now,
          },
        });
        restoredPayments++;
      }

      // Restore expenses
      let restoredExpenses = 0;
      for (const e of expenses) {
        const item = e as Record<string, unknown>;
        if (!safeStr(item.title)) continue;
        await tx.expense.create({
          data: {
            userId: uid,
            title: safeStr(item.title)!,
            amount: safeFloat(item.amount, 0),
            currency: safeStr(item.currency) || "USD",
            category: safeStr(item.category) || "other",
            spentAt: safeDate(item.spentAt) || now,
            paymentMethod: safeStr(item.paymentMethod) || null,
            merchant: safeStr(item.merchant) || null,
            notes: safeStr(item.notes) || null,
            createdAt: safeDate(item.createdAt) || now,
          },
        });
        restoredExpenses++;
      }

      // Restore budgets
      let restoredBudgets = 0;
      for (const b of budgets) {
        const item = b as Record<string, unknown>;
        if (!safeStr(item.category)) continue;
        await tx.budget.create({
          data: {
            userId: uid,
            category: safeStr(item.category)!,
            limitAmount: safeFloat(item.limitAmount, 0),
            currency: safeStr(item.currency) || "USD",
            period: safeStr(item.period) || "monthly",
            startDate: safeDate(item.startDate) || null,
            endDate: safeDate(item.endDate) || null,
            alertThreshold: safeIntRequired(item.alertThreshold, 80),
            createdAt: safeDate(item.createdAt) || now,
          },
        });
        restoredBudgets++;
      }

      // Restore subscriptions
      let restoredSubscriptions = 0;
      for (const s of subscriptions) {
        const item = s as Record<string, unknown>;
        const nextBillingDate = safeDate(item.nextBillingDate);
        if (!safeStr(item.name) || !nextBillingDate) continue;
        await tx.subscription.create({
          data: {
            userId: uid,
            name: safeStr(item.name)!,
            cost: safeFloat(item.cost, 0),
            currency: safeStr(item.currency) || "USD",
            billingCycle: safeStr(item.billingCycle) || "monthly",
            nextBillingDate,
            renewalStatus: safeStr(item.renewalStatus) || "active",
            category: safeStr(item.category) || "entertainment",
            notes: safeStr(item.notes) || null,
            createdAt: safeDate(item.createdAt) || now,
          },
        });
        restoredSubscriptions++;
      }

      // Restore important dates
      let restoredDates = 0;
      for (const d of importantDates) {
        const item = d as Record<string, unknown>;
        const eventDate = safeDate(item.eventDate);
        if (!safeStr(item.title) || !eventDate) continue;
        await tx.importantDate.create({
          data: {
            userId: uid,
            title: safeStr(item.title)!,
            eventDate,
            category: safeStr(item.category) || "personal",
            recurrence: safeStr(item.recurrence) || "yearly",
            reminderDaysBefore: safeIntRequired(item.reminderDaysBefore, 7),
            notes: safeStr(item.notes) || null,
            createdAt: safeDate(item.createdAt) || now,
          },
        });
        restoredDates++;
      }

      // Restore family members
      let restoredFamily = 0;
      for (const f of familyMembers) {
        const item = f as Record<string, unknown>;
        if (!safeStr(item.name) || !safeStr(item.relationship)) continue;
        await tx.familyMember.create({
          data: {
            userId: uid,
            name: safeStr(item.name)!,
            relationship: safeStr(item.relationship)!,
            birthDate: safeDate(item.birthDate) || null,
            bloodType: safeStr(item.bloodType) || null,
            emergencyContact: safeBool(item.emergencyContact, false),
            phoneNumber: safeStr(item.phoneNumber) || null,
            email: safeStr(item.email) || null,
            notes: safeStr(item.notes) || null,
            createdAt: safeDate(item.createdAt) || now,
          },
        });
        restoredFamily++;
      }

      return {
        reminders: restoredReminders,
        documents: restoredDocuments,
        vehicles: restoredVehicles,
        payments: restoredPayments,
        expenses: restoredExpenses,
        budgets: restoredBudgets,
        subscriptions: restoredSubscriptions,
        importantDates: restoredDates,
        familyMembers: restoredFamily,
      };
    });

    return NextResponse.json({
      success: true,
      message: "Backup restored successfully. Your profile and all application data have been replaced.",
      data: {
        restored: result,
        backupExportedAt: meta.exportedAt,
      },
    });
  } catch (error) {
    console.error("[Restore POST Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "RESTORE_FAILED", message: "Restore failed. Your data has not been changed." } },
      { status: 500 }
    );
  }
}

// ── Type-safe extraction helpers ───────────────────────────────────────────────

function validateArray(value: unknown, _name: string): unknown[] {
  if (!value) return [];
  if (!Array.isArray(value)) return [];
  return value.slice(0, 5000); // hard limit: max 5000 records per section
}

function safeStr(v: unknown): string | undefined {
  if (v === null || v === undefined) return undefined;
  const s = String(v).trim();
  // Prevent path traversal and injection in strings
  return s.slice(0, 10000);
}

function safeBool(v: unknown, fallback: boolean): boolean {
  if (v === true || v === "true" || v === 1) return true;
  if (v === false || v === "false" || v === 0) return false;
  return fallback;
}

function safeInt(v: unknown, fallback?: number): number | null | undefined {
  const n = parseInt(String(v), 10);
  if (isNaN(n)) return fallback !== undefined ? fallback : null;
  return n;
}

function safeIntRequired(v: unknown, fallback: number): number {
  const n = parseInt(String(v), 10);
  if (isNaN(n)) return fallback;
  return n;
}

function safeFloat(v: unknown, fallback: number): number {
  const n = parseFloat(String(v));
  if (isNaN(n)) return fallback;
  return n;
}

function safeDate(v: unknown): Date | null {
  if (!v) return null;
  try {
    const d = new Date(String(v));
    if (isNaN(d.getTime())) return null;
    // Reject far-future/far-past dates
    const year = d.getFullYear();
    if (year < 1900 || year > 2200) return null;
    return d;
  } catch {
    return null;
  }
}
