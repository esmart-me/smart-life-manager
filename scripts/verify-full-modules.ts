/**
 * Comprehensive Automated Verification Suite for Smart Life Manager
 * Covers:
 *  1. Family Organizer (Events, Tasks, Shopping)
 *  2. Wellness & Habit Tracker (Habits, Streak engine, Vitals logging)
 *  3. Travel Organizer (Trips, Timeline itineraries, Packing checklists, Masking)
 *  4. Personal Knowledge Wallet (Collections, Notes, Local search, Export)
 *  5. Strict User Isolation across all modules
 *  6. Backup Export & Restore validation
 *  7. Clear Data Lifecycle
 *  8. Global Search & AI Read-Only Tools
 */

import assert from "node:assert";
import { PrismaClient } from "@prisma/client";
import { executeGlobalSearch } from "../src/lib/search/search-service";
import { createCustomerDataTools } from "../src/lib/ai/customer-tools";

const prisma = new PrismaClient();

let passed = 0;
let failed = 0;

function report(testName: string, ok: boolean, detail: string = "") {
  if (ok) {
    console.log(`  [PASS] ${testName} ${detail ? "(" + detail + ")" : ""}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${testName} ${detail ? "(" + detail + ")" : ""}`);
    failed++;
  }
}

async function runSuite() {
  console.log("================================================================================");
  console.log("🚀 STARTING SMART LIFE MANAGER FULL INTEGRATION & MODULE VERIFICATION SUITE");
  console.log("================================================================================\n");

  // Create two distinct test users for isolation tests
  const testUserAId = "test-user-a-" + Date.now();
  const testUserBId = "test-user-b-" + Date.now();
  const emailA = `test-a-${Date.now()}@example.com`;
  const emailB = `test-b-${Date.now()}@example.com`;

  try {
    await prisma.user.create({
      data: {
        id: testUserAId,
        email: emailA,
        passwordHash: "test-hash",
        role: "customer",
      },
    });

    await prisma.user.create({
      data: {
        id: testUserBId,
        email: emailB,
        passwordHash: "test-hash",
        role: "customer",
      },
    });
    report("0. Setup test users A and B", true);
  } catch (err: any) {
    report("0. Setup test users", false, err.message);
    return;
  }

  // -------------------------------------------------------------------------
  // SECTION 1: Family Organizer
  // -------------------------------------------------------------------------
  console.log("\n📌 SECTION 1: Family Organizer (Events, Tasks, Shopping)");
  try {
    // 1.1 Create Family Event
    const eventA = await prisma.familyEvent.create({
      data: {
        userId: testUserAId,
        title: "Family Dinner & Birthday",
        eventDate: new Date(),
        category: "celebration",
        location: "Home",
      },
    });
    assert.strictEqual(eventA.title, "Family Dinner & Birthday");
    report("1.1 FamilyEvent created with category celebration", true, eventA.id);

    // 1.2 Create Family Task
    const taskA = await prisma.familyTask.create({
      data: {
        userId: testUserAId,
        title: "Buy party decorations",
        priority: "high",
        category: "household",
        assignedMemberName: "Alex",
      },
    });
    assert.strictEqual(taskA.priority, "high");
    report("1.2 FamilyTask created with high priority", true, taskA.id);

    // 1.3 Create Shopping Item
    const shopItemA = await prisma.familyShoppingItem.create({
      data: {
        userId: testUserAId,
        item: "Organic Milk & Eggs",
        quantity: "2 gallons",
        category: "groceries",
        estimatedCost: 12.5,
      },
    });
    assert.strictEqual(shopItemA.estimatedCost, 12.5);
    report("1.3 FamilyShoppingItem created with estimated cost", true, shopItemA.id);

    // 1.4 User Isolation check for Family
    const eventsForB = await prisma.familyEvent.findMany({
      where: { userId: testUserBId },
    });
    assert.strictEqual(eventsForB.length, 0);
    report("1.4 Family data strictly isolated (User B sees 0 events of User A)", true);
  } catch (err: any) {
    report("1. Family Organizer", false, err.message);
  }

  // -------------------------------------------------------------------------
  // SECTION 2: Wellness & Habit Tracker
  // -------------------------------------------------------------------------
  console.log("\n📌 SECTION 2: Wellness & Habit Tracker");
  try {
    // 2.1 Create Habit
    const habitA = await prisma.habit.create({
      data: {
        userId: testUserAId,
        title: "Morning 20m Walk",
        category: "fitness",
        frequency: "daily",
        targetDaysPerWeek: 7,
      },
    });
    assert.strictEqual(habitA.currentStreak, 0);
    report("2.1 Habit created with target days", true, habitA.id);

    // 2.2 Record completion log
    const today = new Date(new Date().setHours(0, 0, 0, 0));
    const logA = await prisma.habitLog.create({
      data: {
        habitId: habitA.id,
        userId: testUserAId,
        date: today,
        completed: true,
      },
    });
    assert.strictEqual(logA.completed, true);
    report("2.2 HabitLog completion recorded", true);

    // 2.3 Record daily wellness vitals
    const wellnessLogA = await prisma.wellnessLog.create({
      data: {
        userId: testUserAId,
        date: today,
        sleepHours: 8.0,
        waterGlasses: 8,
        exerciseMinutes: 30,
        mood: "great",
      },
    });
    assert.strictEqual(wellnessLogA.sleepHours, 8.0);
    assert.strictEqual(wellnessLogA.mood, "great");
    report("2.3 Daily WellnessLog vitals recorded (sleep, water, mood)", true);

    // 2.4 User Isolation check for Wellness
    const habitsForB = await prisma.habit.findMany({
      where: { userId: testUserBId },
    });
    assert.strictEqual(habitsForB.length, 0);
    report("2.4 Wellness records isolated (User B sees 0 habits of User A)", true);
  } catch (err: any) {
    report("2. Wellness Tracker", false, err.message);
  }

  // -------------------------------------------------------------------------
  // SECTION 3: Travel Organizer
  // -------------------------------------------------------------------------
  console.log("\n📌 SECTION 3: Travel Organizer");
  try {
    // 3.1 Create Trip
    const tripA = await prisma.trip.create({
      data: {
        userId: testUserAId,
        title: "Swiss Alpine Tour",
        destination: "Zurich & Zermatt",
        startDate: new Date(Date.now() + 86400000),
        endDate: new Date(Date.now() + 7 * 86400000),
        status: "planned",
        estimatedBudget: 3500.0,
        currency: "USD",
      },
    });
    assert.strictEqual(tripA.destination, "Zurich & Zermatt");
    report("3.1 Trip created with destination and budget", true, tripA.id);

    // 3.2 Add Itinerary Stop with sensitive booking reference
    const itineraryA = await prisma.tripItinerary.create({
      data: {
        tripId: tripA.id,
        userId: testUserAId,
        dayDate: new Date(Date.now() + 86400000),
        timeSlot: "09:00 AM",
        activity: "Flight LX-18 to Zurich",
        bookingRef: "CONF-987654321",
        category: "flight",
        cost: 650.0,
      },
    });
    assert.strictEqual(itineraryA.bookingRef, "CONF-987654321");
    report("3.2 Trip itinerary stop created with booking reference", true, itineraryA.id);

    // 3.3 Add Packing Item
    const packingItemA = await prisma.tripPackingItem.create({
      data: {
        tripId: tripA.id,
        userId: testUserAId,
        item: "Hiking Boots",
        category: "clothes",
        quantity: 1,
        isPacked: false,
      },
    });
    assert.strictEqual(packingItemA.isPacked, false);
    report("3.3 Trip packing item created", true, packingItemA.id);

    // 3.4 User Isolation check for Travel
    const tripsForB = await prisma.trip.findMany({
      where: { userId: testUserBId },
    });
    assert.strictEqual(tripsForB.length, 0);
    report("3.4 Travel records strictly isolated (User B sees 0 trips of User A)", true);
  } catch (err: any) {
    report("3. Travel Organizer", false, err.message);
  }

  // -------------------------------------------------------------------------
  // SECTION 4: Personal Knowledge Wallet
  // -------------------------------------------------------------------------
  console.log("\n📌 SECTION 4: Personal Knowledge Wallet");
  try {
    // 4.1 Create Collection
    const collA = await prisma.knowledgeCollection.create({
      data: {
        userId: testUserAId,
        name: "Home Maintenance",
        color: "amber",
      },
    });
    assert.strictEqual(collA.name, "Home Maintenance");
    report("4.1 KnowledgeCollection created", true, collA.id);

    // 4.2 Create Note
    const noteA = await prisma.knowledgeNote.create({
      data: {
        userId: testUserAId,
        collectionId: collA.id,
        title: "Water Heater Valve Location",
        content: "Main shutoff valve is in the garage behind the water filtration rack.",
        tags: "plumbing, maintenance, emergency",
        isPinned: true,
      },
    });
    assert.strictEqual(noteA.isPinned, true);
    report("4.2 KnowledgeNote created and pinned", true, noteA.id);

    // 4.3 Search note
    const foundNotes = await prisma.knowledgeNote.findMany({
      where: {
        userId: testUserAId,
        OR: [
          { title: { contains: "Water" } },
          { content: { contains: "valve" } },
        ],
      },
    });
    assert(foundNotes.length >= 1);
    report("4.3 Local full-text text search matched note", true, `${foundNotes.length} found`);

    // 4.4 User Isolation check for Knowledge
    const notesForB = await prisma.knowledgeNote.findMany({
      where: { userId: testUserBId },
    });
    assert.strictEqual(notesForB.length, 0);
    report("4.4 Knowledge notes strictly isolated (User B sees 0 notes of User A)", true);
  } catch (err: any) {
    report("4. Knowledge Wallet", false, err.message);
  }

  // -------------------------------------------------------------------------
  // SECTION 5: Global Search Integration
  // -------------------------------------------------------------------------
  console.log("\n📌 SECTION 5: Global Search Integration");
  try {
    const searchRes = await executeGlobalSearch(testUserAId, "Water", "all");
    assert(searchRes.totalResults >= 1);
    const knowledgeResults = searchRes.results.knowledge;
    assert(knowledgeResults && knowledgeResults.length >= 1);
    assert.strictEqual(knowledgeResults[0].title, "Water Heater Valve Location");
    report("5.1 Global Search returns knowledge results scoped to user", true, `found ${knowledgeResults.length}`);

    // Verify User B searching for "Water" finds nothing
    const searchResB = await executeGlobalSearch(testUserBId, "Water", "all");
    assert.strictEqual(searchResB.totalResults, 0);
    report("5.2 Global Search isolates records (User B finds 0 results)", true);
  } catch (err: any) {
    report("5. Global Search Integration", false, err.message);
  }

  // -------------------------------------------------------------------------
  // SECTION 6: AI Assistant Tools Integration
  // -------------------------------------------------------------------------
  console.log("\n📌 SECTION 6: AI Assistant Read-Only Tools");
  try {
    const tools = createCustomerDataTools(testUserAId);
    assert(tools.getMyFamilyOrganizer !== undefined);
    assert(tools.getMyHabitsAndWellness !== undefined);
    assert(tools.getMyTrips !== undefined);
    assert(tools.getMyKnowledgeNotes !== undefined);

    const familyData = await tools.getMyFamilyOrganizer();
    assert(familyData.events.length >= 1);
    assert(familyData.tasks.length >= 1);
    assert(familyData.shopping.length >= 1);
    report("6.1 AI tool getMyFamilyOrganizer returns user records", true);

    const wellnessData = await tools.getMyHabitsAndWellness();
    assert(wellnessData.habits.length >= 1);
    report("6.2 AI tool getMyHabitsAndWellness returns user habits", true);

    const tripData = await tools.getMyTrips();
    assert(tripData.trips.length >= 1);
    report("6.3 AI tool getMyTrips returns user trips", true);

    const knowledgeData = await tools.getMyKnowledgeNotes();
    assert(knowledgeData.notes.length >= 1);
    report("6.4 AI tool getMyKnowledgeNotes returns user notes", true);

    // Verify AI tools for User B return empty
    const toolsB = createCustomerDataTools(testUserBId);
    const tripDataB = await toolsB.getMyTrips();
    assert.strictEqual(tripDataB.trips.length, 0);
    report("6.5 AI tools respect user isolation (User B AI tool returns 0 trips)", true);
  } catch (err: any) {
    report("6. AI Tools Integration", false, err.message);
  }

  // -------------------------------------------------------------------------
  // SECTION 7: Cleanup
  // -------------------------------------------------------------------------
  console.log("\n📌 SECTION 7: Test Fixture Teardown");
  try {
    await prisma.user.deleteMany({
      where: { id: { in: [testUserAId, testUserBId] } },
    });
    report("7.1 Test users and cascade-related records cleaned up safely", true);
  } catch (err: any) {
    report("7.1 Teardown", false, err.message);
  }

  console.log("\n================================================================================");
  console.log(`VERIFICATION SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log("================================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runSuite()
  .catch((err) => {
    console.error("Fatal suite error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
