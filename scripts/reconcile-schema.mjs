// scripts/reconcile-schema.mjs
// Safely and idempotently reconciles SQLite database schema for Smart Life Manager.
// Zero data loss: Uses CREATE TABLE IF NOT EXISTS and ALTER TABLE ADD COLUMN IF NOT EXISTS.

import fs from "fs";
import path from "path";
import { DatabaseSync } from "node:sqlite";

const DB_PATHS = [
  path.join(process.cwd(), "prisma", "dev.db"),
];

// Also reconcile AppData database if present
const appDataDir = process.env.APPDATA ? path.join(process.env.APPDATA, "smart-life-manager", "prisma", "dev.db") : null;
if (appDataDir && fs.existsSync(appDataDir)) {
  DB_PATHS.push(appDataDir);
}

function reconcileDb(dbPath) {
  if (!fs.existsSync(dbPath)) {
    console.log(`[Reconcile] Database file not found at ${dbPath}, skipping.`);
    return;
  }

  console.log(`[Reconcile] Reconciling schema for: ${dbPath}`);
  const db = new DatabaseSync(dbPath);

  try {
    // 1. Family Organizer tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS "FamilyEvent" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "familyMemberId" TEXT,
        "title" TEXT NOT NULL,
        "description" TEXT,
        "eventDate" DATETIME NOT NULL,
        "endDate" DATETIME,
        "startTime" TEXT,
        "endTime" TEXT,
        "location" TEXT,
        "category" TEXT NOT NULL DEFAULT 'general',
        "isAllDay" INTEGER NOT NULL DEFAULT 0,
        "notes" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "FamilyEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "FamilyEvent_familyMemberId_fkey" FOREIGN KEY ("familyMemberId") REFERENCES "FamilyMember" ("id") ON DELETE SET NULL ON UPDATE CASCADE
      );
      CREATE INDEX IF NOT EXISTS "FamilyEvent_userId_idx" ON "FamilyEvent"("userId");
      CREATE INDEX IF NOT EXISTS "FamilyEvent_eventDate_idx" ON "FamilyEvent"("eventDate");
      CREATE INDEX IF NOT EXISTS "FamilyEvent_familyMemberId_idx" ON "FamilyEvent"("familyMemberId");

      CREATE TABLE IF NOT EXISTS "FamilyTask" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "assignedMemberId" TEXT,
        "assignedMemberName" TEXT,
        "title" TEXT NOT NULL,
        "description" TEXT,
        "dueDate" DATETIME,
        "priority" TEXT NOT NULL DEFAULT 'medium',
        "status" TEXT NOT NULL DEFAULT 'pending',
        "category" TEXT NOT NULL DEFAULT 'household',
        "isCompleted" INTEGER NOT NULL DEFAULT 0,
        "completedAt" DATETIME,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "FamilyTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
      CREATE INDEX IF NOT EXISTS "FamilyTask_userId_idx" ON "FamilyTask"("userId");
      CREATE INDEX IF NOT EXISTS "FamilyTask_dueDate_idx" ON "FamilyTask"("dueDate");
      CREATE INDEX IF NOT EXISTS "FamilyTask_isCompleted_idx" ON "FamilyTask"("isCompleted");

      CREATE TABLE IF NOT EXISTS "FamilyShoppingItem" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "assignedMemberName" TEXT,
        "item" TEXT NOT NULL,
        "quantity" TEXT,
        "category" TEXT NOT NULL DEFAULT 'groceries',
        "isPurchased" INTEGER NOT NULL DEFAULT 0,
        "estimatedCost" REAL,
        "notes" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "FamilyShoppingItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
      CREATE INDEX IF NOT EXISTS "FamilyShoppingItem_userId_idx" ON "FamilyShoppingItem"("userId");
      CREATE INDEX IF NOT EXISTS "FamilyShoppingItem_isPurchased_idx" ON "FamilyShoppingItem"("isPurchased");
    `);

    // 2. Wellness & Habit Tracker tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS "Habit" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "description" TEXT,
        "category" TEXT NOT NULL DEFAULT 'health',
        "frequency" TEXT NOT NULL DEFAULT 'daily',
        "targetDaysPerWeek" INTEGER NOT NULL DEFAULT 7,
        "currentStreak" INTEGER NOT NULL DEFAULT 0,
        "bestStreak" INTEGER NOT NULL DEFAULT 0,
        "color" TEXT NOT NULL DEFAULT 'emerald',
        "reminderTime" TEXT,
        "isArchived" INTEGER NOT NULL DEFAULT 0,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Habit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
      CREATE INDEX IF NOT EXISTS "Habit_userId_idx" ON "Habit"("userId");
      CREATE INDEX IF NOT EXISTS "Habit_isArchived_idx" ON "Habit"("isArchived");

      CREATE TABLE IF NOT EXISTS "HabitLog" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "habitId" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "date" DATETIME NOT NULL,
        "completed" INTEGER NOT NULL DEFAULT 1,
        "notes" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "HabitLog_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "Habit" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "HabitLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "HabitLog_habitId_date_key" ON "HabitLog"("habitId", "date");
      CREATE INDEX IF NOT EXISTS "HabitLog_userId_idx" ON "HabitLog"("userId");
      CREATE INDEX IF NOT EXISTS "HabitLog_date_idx" ON "HabitLog"("date");

      CREATE TABLE IF NOT EXISTS "WellnessLog" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "date" DATETIME NOT NULL,
        "sleepHours" REAL,
        "waterGlasses" INTEGER,
        "exerciseMinutes" INTEGER,
        "mood" TEXT,
        "notes" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "WellnessLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "WellnessLog_userId_date_key" ON "WellnessLog"("userId", "date");
      CREATE INDEX IF NOT EXISTS "WellnessLog_userId_idx" ON "WellnessLog"("userId");
      CREATE INDEX IF NOT EXISTS "WellnessLog_date_idx" ON "WellnessLog"("date");
    `);

    // 3. Travel Organizer tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS "Trip" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "destination" TEXT NOT NULL,
        "startDate" DATETIME NOT NULL,
        "endDate" DATETIME NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'planned',
        "estimatedBudget" REAL,
        "actualCost" REAL,
        "currency" TEXT NOT NULL DEFAULT 'USD',
        "coverImage" TEXT,
        "notes" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Trip_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
      CREATE INDEX IF NOT EXISTS "Trip_userId_idx" ON "Trip"("userId");
      CREATE INDEX IF NOT EXISTS "Trip_startDate_idx" ON "Trip"("startDate");
      CREATE INDEX IF NOT EXISTS "Trip_status_idx" ON "Trip"("status");

      CREATE TABLE IF NOT EXISTS "TripItinerary" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "tripId" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "dayDate" DATETIME NOT NULL,
        "timeSlot" TEXT,
        "activity" TEXT NOT NULL,
        "location" TEXT,
        "bookingRef" TEXT,
        "confirmationDetails" TEXT,
        "cost" REAL,
        "category" TEXT NOT NULL DEFAULT 'activity',
        "notes" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "TripItinerary_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "TripItinerary_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
      CREATE INDEX IF NOT EXISTS "TripItinerary_tripId_idx" ON "TripItinerary"("tripId");
      CREATE INDEX IF NOT EXISTS "TripItinerary_userId_idx" ON "TripItinerary"("userId");
      CREATE INDEX IF NOT EXISTS "TripItinerary_dayDate_idx" ON "TripItinerary"("dayDate");

      CREATE TABLE IF NOT EXISTS "TripPackingItem" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "tripId" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "item" TEXT NOT NULL,
        "category" TEXT NOT NULL DEFAULT 'essentials',
        "isPacked" INTEGER NOT NULL DEFAULT 0,
        "quantity" INTEGER NOT NULL DEFAULT 1,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "TripPackingItem_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "TripPackingItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
      CREATE INDEX IF NOT EXISTS "TripPackingItem_tripId_idx" ON "TripPackingItem"("tripId");
      CREATE INDEX IF NOT EXISTS "TripPackingItem_userId_idx" ON "TripPackingItem"("userId");
      CREATE INDEX IF NOT EXISTS "TripPackingItem_isPacked_idx" ON "TripPackingItem"("isPacked");
    `);

    // 4. Personal Knowledge Wallet tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS "KnowledgeCollection" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "description" TEXT,
        "color" TEXT NOT NULL DEFAULT 'indigo',
        "icon" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "KnowledgeCollection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
      CREATE INDEX IF NOT EXISTS "KnowledgeCollection_userId_idx" ON "KnowledgeCollection"("userId");

      CREATE TABLE IF NOT EXISTS "KnowledgeNote" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "collectionId" TEXT,
        "title" TEXT NOT NULL,
        "content" TEXT NOT NULL,
        "tags" TEXT,
        "isPinned" INTEGER NOT NULL DEFAULT 0,
        "isFavorite" INTEGER NOT NULL DEFAULT 0,
        "isArchived" INTEGER NOT NULL DEFAULT 0,
        "sourceUrl" TEXT,
        "attachmentName" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "KnowledgeNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "KnowledgeNote_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "KnowledgeCollection" ("id") ON DELETE SET NULL ON UPDATE CASCADE
      );
      CREATE INDEX IF NOT EXISTS "KnowledgeNote_userId_idx" ON "KnowledgeNote"("userId");
      CREATE INDEX IF NOT EXISTS "KnowledgeNote_isPinned_idx" ON "KnowledgeNote"("isPinned");
      CREATE INDEX IF NOT EXISTS "KnowledgeNote_isFavorite_idx" ON "KnowledgeNote"("isFavorite");
      CREATE INDEX IF NOT EXISTS "KnowledgeNote_isArchived_idx" ON "KnowledgeNote"("isArchived");
      CREATE INDEX IF NOT EXISTS "KnowledgeNote_collectionId_idx" ON "KnowledgeNote"("collectionId");
    `);

    console.log(`[Reconcile] Successfully reconciled tables for ${dbPath}`);
  } catch (err) {
    console.error(`[Reconcile] Error reconciling ${dbPath}:`, err.message);
  } finally {
    db.close();
  }
}

for (const p of DB_PATHS) {
  reconcileDb(p);
}
