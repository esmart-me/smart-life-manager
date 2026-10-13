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
    const plannerTasks = validateArray(backup.plannerTasks, "plannerTasks");
    const inventoryItems = validateArray(backup.inventoryItems, "inventoryItems");
    const familyEvents = validateArray(backup.familyEvents, "familyEvents");
    const familyTasks = validateArray(backup.familyTasks, "familyTasks");
    const familyShoppingItems = validateArray(backup.familyShoppingItems, "familyShoppingItems");
    const habits = validateArray(backup.habits, "habits");
    const wellnessLogs = validateArray(backup.wellnessLogs, "wellnessLogs");
    const trips = validateArray(backup.trips, "trips");
    const knowledgeCollections = validateArray(backup.knowledgeCollections, "knowledgeCollections");
    const knowledgeNotes = validateArray(backup.knowledgeNotes, "knowledgeNotes");

    const profileData = backup.profile as Record<string, unknown> | null | undefined;
    const settingsData = backup.settings as Record<string, unknown> | null | undefined;

    const uid = user.id;
    const now = new Date();

    // ── Atomic restore transaction ──────────────────────────────────────────────
    // Clears the user's existing application data and writes backup data.
    // Authentication records (User, Session, PasswordResetToken) are NEVER touched.
    const result = await prisma.$transaction(async (tx) => {
      // Clear existing user content safely
      await tx.tripPackingItem.deleteMany({ where: { userId: uid } });
      await tx.tripItinerary.deleteMany({ where: { userId: uid } });
      await tx.trip.deleteMany({ where: { userId: uid } });
      await tx.habitLog.deleteMany({ where: { userId: uid } });
      await tx.habit.deleteMany({ where: { userId: uid } });
      await tx.wellnessLog.deleteMany({ where: { userId: uid } });
      await tx.familyShoppingItem.deleteMany({ where: { userId: uid } });
      await tx.familyTask.deleteMany({ where: { userId: uid } });
      await tx.familyEvent.deleteMany({ where: { userId: uid } });
      await tx.knowledgeNote.deleteMany({ where: { userId: uid } });
      await tx.knowledgeCollection.deleteMany({ where: { userId: uid } });
      await tx.inventoryServiceLog.deleteMany({ where: { userId: uid } });
      await tx.inventoryItem.deleteMany({ where: { userId: uid } });
      await tx.plannerTask.deleteMany({ where: { userId: uid } });

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
        if (!safeStr(item.title) || !safeDate(item.dueDate)) continue;
        await tx.reminder.create({
          data: {
            userId: uid,
            title: safeStr(item.title)!,
            description: safeStr(item.description) || null,
            dueDate: safeDate(item.dueDate)!,
            priority: safeStr(item.priority) || "medium",
            status: safeStr(item.status) || "pending",
            category: safeStr(item.category) || "general",
            isRecurring: safeBool(item.isRecurring, false),
            recurrenceRule: safeStr(item.recurrenceRule) || null,
            reminderTiming: safeStr(item.reminderTiming) || "days_before",
            customMinutesBefore: safeInt(item.customMinutesBefore),
            timezone: safeStr(item.timezone) || "UTC",
            completedAt: safeDate(item.completedAt) || null,
            createdAt: safeDate(item.createdAt) || now,
          },
        });
        restoredReminders++;
      }

      // Restore documents
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
        if (!safeStr(item.title) || !safeDate(item.dueDate)) continue;
        await tx.payment.create({
          data: {
            userId: uid,
            title: safeStr(item.title)!,
            payee: safeStr(item.payee) || null,
            amount: safeFloat(item.amount, 0),
            currency: safeStr(item.currency) || "USD",
            dueDate: safeDate(item.dueDate)!,
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
        if (!safeStr(item.title) || !safeDate(item.spentAt)) continue;
        await tx.expense.create({
          data: {
            userId: uid,
            title: safeStr(item.title)!,
            amount: safeFloat(item.amount, 0),
            currency: safeStr(item.currency) || "USD",
            category: safeStr(item.category) || "general",
            spentAt: safeDate(item.spentAt)!,
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
            alertThreshold: safeFloat(item.alertThreshold, 80),
            createdAt: safeDate(item.createdAt) || now,
          },
        });
        restoredBudgets++;
      }

      // Restore subscriptions
      let restoredSubscriptions = 0;
      for (const s of subscriptions) {
        const item = s as Record<string, unknown>;
        if (!safeStr(item.name) || !safeDate(item.nextBillingDate)) continue;
        await tx.subscription.create({
          data: {
            userId: uid,
            name: safeStr(item.name)!,
            cost: safeFloat(item.cost, 0),
            currency: safeStr(item.currency) || "USD",
            billingCycle: safeStr(item.billingCycle) || "monthly",
            nextBillingDate: safeDate(item.nextBillingDate)!,
            renewalStatus: safeStr(item.renewalStatus) || "active",
            category: safeStr(item.category) || "entertainment",
            startDate: safeDate(item.startDate) || null,
            trialEndDate: safeDate(item.trialEndDate) || null,
            websiteUrl: safeStr(item.websiteUrl) || null,
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
        if (!safeStr(item.title) || !safeDate(item.eventDate)) continue;
        await tx.importantDate.create({
          data: {
            userId: uid,
            title: safeStr(item.title)!,
            eventDate: safeDate(item.eventDate)!,
            category: safeStr(item.category) || "birthday",
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

      // Restore planner tasks
      let restoredPlanner = 0;
      for (const t of plannerTasks) {
        const item = t as Record<string, unknown>;
        if (!safeStr(item.title) || !safeDate(item.date)) continue;
        await tx.plannerTask.create({
          data: {
            userId: uid,
            title: safeStr(item.title)!,
            description: safeStr(item.description) || null,
            itemType: safeStr(item.itemType) || "task",
            date: safeDate(item.date)!,
            startTime: safeStr(item.startTime) || null,
            endTime: safeStr(item.endTime) || null,
            location: safeStr(item.location) || null,
            priority: safeStr(item.priority) || "medium",
            category: safeStr(item.category) || "personal",
            isCompleted: safeBool(item.isCompleted, false),
            completedAt: safeDate(item.completedAt) || null,
            notes: safeStr(item.notes) || null,
            createdAt: safeDate(item.createdAt) || now,
          },
        });
        restoredPlanner++;
      }

      // Restore inventory items
      let restoredInventory = 0;
      for (const i of inventoryItems) {
        const item = i as Record<string, unknown>;
        if (!safeStr(item.name)) continue;
        const createdItem = await tx.inventoryItem.create({
          data: {
            userId: uid,
            name: safeStr(item.name)!,
            category: safeStr(item.category) || "electronics",
            brand: safeStr(item.brand) || null,
            modelNumber: safeStr(item.modelNumber) || null,
            serialNumber: safeStr(item.serialNumber) || null,
            purchaseDate: safeDate(item.purchaseDate) || null,
            purchasePrice: safeFloat(item.purchasePrice, 0),
            currency: safeStr(item.currency) || "USD",
            retailer: safeStr(item.retailer) || null,
            location: safeStr(item.location) || null,
            warrantyStart: safeDate(item.warrantyStart) || null,
            warrantyExpiry: safeDate(item.warrantyExpiry) || null,
            warrantyNotes: safeStr(item.warrantyNotes) || null,
            notes: safeStr(item.notes) || null,
            isArchived: safeBool(item.isArchived, false),
            createdAt: safeDate(item.createdAt) || now,
          },
        });

        // Restore nested service logs if present
        const serviceLogs = validateArray(item.serviceLogs, "serviceLogs");
        for (const s of serviceLogs) {
          const sLog = s as Record<string, unknown>;
          if (!safeStr(sLog.description) || !safeDate(sLog.serviceDate)) continue;
          await tx.inventoryServiceLog.create({
            data: {
              inventoryItemId: createdItem.id,
              userId: uid,
              serviceDate: safeDate(sLog.serviceDate)!,
              description: safeStr(sLog.description)!,
              provider: safeStr(sLog.provider) || null,
              cost: safeFloat(sLog.cost, 0),
              currency: safeStr(sLog.currency) || "USD",
              nextServiceDate: safeDate(sLog.nextServiceDate) || null,
              notes: safeStr(sLog.notes) || null,
              createdAt: safeDate(sLog.createdAt) || now,
            },
          });
        }
        restoredInventory++;
      }

      // Restore family events
      let restoredFamilyEvents = 0;
      for (const fe of familyEvents) {
        const item = fe as Record<string, unknown>;
        if (!safeStr(item.title) || !safeDate(item.eventDate)) continue;
        await tx.familyEvent.create({
          data: {
            userId: uid,
            title: safeStr(item.title)!,
            description: safeStr(item.description) || null,
            eventDate: safeDate(item.eventDate)!,
            endDate: safeDate(item.endDate) || null,
            startTime: safeStr(item.startTime) || null,
            endTime: safeStr(item.endTime) || null,
            location: safeStr(item.location) || null,
            category: safeStr(item.category) || "general",
            isAllDay: safeBool(item.isAllDay, false),
            notes: safeStr(item.notes) || null,
            createdAt: safeDate(item.createdAt) || now,
          },
        });
        restoredFamilyEvents++;
      }

      // Restore family tasks
      let restoredFamilyTasks = 0;
      for (const ft of familyTasks) {
        const item = ft as Record<string, unknown>;
        if (!safeStr(item.title)) continue;
        await tx.familyTask.create({
          data: {
            userId: uid,
            title: safeStr(item.title)!,
            description: safeStr(item.description) || null,
            assignedMemberName: safeStr(item.assignedMemberName) || null,
            dueDate: safeDate(item.dueDate) || null,
            priority: safeStr(item.priority) || "medium",
            status: safeStr(item.status) || "pending",
            category: safeStr(item.category) || "household",
            isCompleted: safeBool(item.isCompleted, false),
            completedAt: safeDate(item.completedAt) || null,
            createdAt: safeDate(item.createdAt) || now,
          },
        });
        restoredFamilyTasks++;
      }

      // Restore family shopping items
      let restoredShopping = 0;
      for (const si of familyShoppingItems) {
        const item = si as Record<string, unknown>;
        if (!safeStr(item.item)) continue;
        await tx.familyShoppingItem.create({
          data: {
            userId: uid,
            item: safeStr(item.item)!,
            quantity: safeStr(item.quantity) || null,
            category: safeStr(item.category) || "groceries",
            isPurchased: safeBool(item.isPurchased, false),
            estimatedCost: safeFloat(item.estimatedCost, 0),
            assignedMemberName: safeStr(item.assignedMemberName) || null,
            notes: safeStr(item.notes) || null,
            createdAt: safeDate(item.createdAt) || now,
          },
        });
        restoredShopping++;
      }

      // Restore habits
      let restoredHabits = 0;
      for (const h of habits) {
        const item = h as Record<string, unknown>;
        if (!safeStr(item.title)) continue;
        const createdHabit = await tx.habit.create({
          data: {
            userId: uid,
            title: safeStr(item.title)!,
            description: safeStr(item.description) || null,
            category: safeStr(item.category) || "health",
            frequency: safeStr(item.frequency) || "daily",
            targetDaysPerWeek: safeIntRequired(item.targetDaysPerWeek, 7),
            currentStreak: safeIntRequired(item.currentStreak, 0),
            bestStreak: safeIntRequired(item.bestStreak, 0),
            color: safeStr(item.color) || "emerald",
            reminderTime: safeStr(item.reminderTime) || null,
            isArchived: safeBool(item.isArchived, false),
            createdAt: safeDate(item.createdAt) || now,
          },
        });

        const logs = validateArray(item.logs, "logs");
        for (const l of logs) {
          const lItem = l as Record<string, unknown>;
          if (!safeDate(lItem.date)) continue;
          await tx.habitLog.create({
            data: {
              habitId: createdHabit.id,
              userId: uid,
              date: safeDate(lItem.date)!,
              completed: safeBool(lItem.completed, true),
              notes: safeStr(lItem.notes) || null,
            },
          });
        }
        restoredHabits++;
      }

      // Restore wellness logs
      let restoredWellnessLogs = 0;
      for (const wl of wellnessLogs) {
        const item = wl as Record<string, unknown>;
        if (!safeDate(item.date)) continue;
        await tx.wellnessLog.create({
          data: {
            userId: uid,
            date: safeDate(item.date)!,
            sleepHours: safeFloat(item.sleepHours, 0),
            waterGlasses: safeInt(item.waterGlasses),
            exerciseMinutes: safeInt(item.exerciseMinutes),
            mood: safeStr(item.mood) || null,
            notes: safeStr(item.notes) || null,
            createdAt: safeDate(item.createdAt) || now,
          },
        });
        restoredWellnessLogs++;
      }

      // Restore trips
      let restoredTrips = 0;
      for (const tr of trips) {
        const item = tr as Record<string, unknown>;
        if (!safeStr(item.title) || !safeDate(item.startDate) || !safeDate(item.endDate)) continue;
        const createdTrip = await tx.trip.create({
          data: {
            userId: uid,
            title: safeStr(item.title)!,
            destination: safeStr(item.destination) || "Destination",
            startDate: safeDate(item.startDate)!,
            endDate: safeDate(item.endDate)!,
            status: safeStr(item.status) || "planned",
            estimatedBudget: safeFloat(item.estimatedBudget, 0),
            actualCost: safeFloat(item.actualCost, 0),
            currency: safeStr(item.currency) || "USD",
            notes: safeStr(item.notes) || null,
            createdAt: safeDate(item.createdAt) || now,
          },
        });

        const itineraries = validateArray(item.itineraries, "itineraries");
        for (const it of itineraries) {
          const itItem = it as Record<string, unknown>;
          if (!safeStr(itItem.activity) || !safeDate(itItem.dayDate)) continue;
          await tx.tripItinerary.create({
            data: {
              tripId: createdTrip.id,
              userId: uid,
              dayDate: safeDate(itItem.dayDate)!,
              timeSlot: safeStr(itItem.timeSlot) || null,
              activity: safeStr(itItem.activity)!,
              location: safeStr(itItem.location) || null,
              bookingRef: safeStr(itItem.bookingRef) || null,
              confirmationDetails: safeStr(itItem.confirmationDetails) || null,
              cost: safeFloat(itItem.cost, 0),
              category: safeStr(itItem.category) || "activity",
              notes: safeStr(itItem.notes) || null,
              createdAt: safeDate(itItem.createdAt) || now,
            },
          });
        }

        const packingItems = validateArray(item.packingItems, "packingItems");
        for (const pk of packingItems) {
          const pkItem = pk as Record<string, unknown>;
          if (!safeStr(pkItem.item)) continue;
          await tx.tripPackingItem.create({
            data: {
              tripId: createdTrip.id,
              userId: uid,
              item: safeStr(pkItem.item)!,
              category: safeStr(pkItem.category) || "essentials",
              isPacked: safeBool(pkItem.isPacked, false),
              quantity: safeIntRequired(pkItem.quantity, 1),
              createdAt: safeDate(pkItem.createdAt) || now,
            },
          });
        }
        restoredTrips++;
      }

      // Restore knowledge collections & notes
      const collectionMap: Record<string, string> = {};
      for (const kc of knowledgeCollections) {
        const item = kc as Record<string, unknown>;
        if (!safeStr(item.name)) continue;
        const createdCollection = await tx.knowledgeCollection.create({
          data: {
            userId: uid,
            name: safeStr(item.name)!,
            description: safeStr(item.description) || null,
            color: safeStr(item.color) || "indigo",
            icon: safeStr(item.icon) || null,
            createdAt: safeDate(item.createdAt) || now,
          },
        });
        collectionMap[String(item.name)] = createdCollection.id;
      }

      let restoredKnowledge = 0;
      for (const kn of knowledgeNotes) {
        const item = kn as Record<string, unknown>;
        if (!safeStr(item.title) || !safeStr(item.content)) continue;
        await tx.knowledgeNote.create({
          data: {
            userId: uid,
            title: safeStr(item.title)!,
            content: safeStr(item.content)!,
            tags: safeStr(item.tags) || null,
            isPinned: safeBool(item.isPinned, false),
            isFavorite: safeBool(item.isFavorite, false),
            isArchived: safeBool(item.isArchived, false),
            sourceUrl: safeStr(item.sourceUrl) || null,
            attachmentName: safeStr(item.attachmentName) || null,
            createdAt: safeDate(item.createdAt) || now,
          },
        });
        restoredKnowledge++;
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
        plannerTasks: restoredPlanner,
        inventoryItems: restoredInventory,
        familyEvents: restoredFamilyEvents,
        familyTasks: restoredFamilyTasks,
        familyShoppingItems: restoredShopping,
        habits: restoredHabits,
        wellnessLogs: restoredWellnessLogs,
        trips: restoredTrips,
        knowledgeNotes: restoredKnowledge,
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
    const year = d.getFullYear();
    if (year < 1900 || year > 2200) return null;
    return d;
  } catch {
    return null;
  }
}
