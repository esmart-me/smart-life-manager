import { prisma } from "@/lib/db/prisma";
import { calculateDocumentStatus } from "@/lib/documents/status";
import { calculatePaymentStatus } from "@/lib/finance/calculations";
import { calculateVehicleStatus } from "@/lib/vehicles/status";
import { calculateNextDateOccurrence } from "@/lib/dates/calculations";

export type SearchCategory =
  | "all"
  | "documents"
  | "reminders"
  | "payments"
  | "expenses"
  | "vehicles"
  | "subscriptions"
  | "dates"
  | "planner"
  | "inventory"
  | "family"
  | "wellness"
  | "travel"
  | "knowledge";

export interface SearchResultItem {
  id: string;
  category:
    | "documents"
    | "reminders"
    | "payments"
    | "expenses"
    | "vehicles"
    | "subscriptions"
    | "dates"
    | "planner"
    | "inventory"
    | "family"
    | "wellness"
    | "travel"
    | "knowledge";
  categoryLabel: string;
  title: string;
  subtitle: string;
  date?: string;
  amount?: string;
  badgeText?: string;
  badgeVariant?: "default" | "success" | "warning" | "danger" | "info" | "outline";
  url: string;
  matchedField?: string;
}

export interface GlobalSearchResponse {
  query: string;
  total: number;
  totalResults: number;
  categoryCounts: Record<SearchCategory, number>;
  grouped: {
    documents: SearchResultItem[];
    reminders: SearchResultItem[];
    payments: SearchResultItem[];
    expenses: SearchResultItem[];
    vehicles: SearchResultItem[];
    subscriptions: SearchResultItem[];
    dates: SearchResultItem[];
    planner: SearchResultItem[];
    inventory: SearchResultItem[];
    family: SearchResultItem[];
    wellness: SearchResultItem[];
    travel: SearchResultItem[];
    knowledge: SearchResultItem[];
  };
  results: {
    documents: SearchResultItem[];
    reminders: SearchResultItem[];
    payments: SearchResultItem[];
    expenses: SearchResultItem[];
    vehicles: SearchResultItem[];
    subscriptions: SearchResultItem[];
    dates: SearchResultItem[];
    planner: SearchResultItem[];
    inventory: SearchResultItem[];
    family: SearchResultItem[];
    wellness: SearchResultItem[];
    travel: SearchResultItem[];
    knowledge: SearchResultItem[];
  };
  items: SearchResultItem[];
}

export async function executeGlobalSearch(
  userId: string,
  rawQuery: string,
  selectedCategory: SearchCategory = "all"
): Promise<GlobalSearchResponse> {
  const query = (rawQuery || "").trim().toLowerCase();

  const emptyGrouped = {
    documents: [],
    reminders: [],
    payments: [],
    expenses: [],
    vehicles: [],
    subscriptions: [],
    dates: [],
    planner: [],
    inventory: [],
    family: [],
    wellness: [],
    travel: [],
    knowledge: [],
  };

  if (!query) {
    return {
      query: "",
      total: 0,
      totalResults: 0,
      categoryCounts: {
        all: 0,
        documents: 0,
        reminders: 0,
        payments: 0,
        expenses: 0,
        vehicles: 0,
        subscriptions: 0,
        dates: 0,
        planner: 0,
        inventory: 0,
        family: 0,
        wellness: 0,
        travel: 0,
        knowledge: 0,
      },
      grouped: emptyGrouped,
      results: emptyGrouped,
      items: [],
    };
  }

  // Multi-tenant safe parallel queries strictly scoped to authenticated userId
  const [
    docs,
    reminders,
    payments,
    expenses,
    vehicles,
    subscriptions,
    dates,
    plannerTasks,
    inventoryItems,
    familyEvents,
    familyTasks,
    habits,
    trips,
    knowledgeNotes,
  ] = await Promise.all([
    // 1. Documents
    prisma.document.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    }),
    // 2. Reminders
    prisma.reminder.findMany({
      where: { userId },
      orderBy: { dueDate: "asc" },
    }),
    // 3. Payments
    prisma.payment.findMany({
      where: { userId },
      orderBy: { dueDate: "asc" },
    }),
    // 4. Expenses
    prisma.expense.findMany({
      where: { userId },
      orderBy: { spentAt: "desc" },
    }),
    // 5. Vehicles
    prisma.vehicle.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    }),
    // 6. Subscriptions
    prisma.subscription.findMany({
      where: { userId },
      orderBy: { nextBillingDate: "asc" },
    }),
    // 7. Important Dates
    prisma.importantDate.findMany({
      where: { userId },
      orderBy: { eventDate: "asc" },
    }),
    // 8. Planner Tasks & Appointments
    prisma.plannerTask.findMany({
      where: { userId },
      orderBy: { date: "asc" },
    }),
    // 9. Home Inventory Items
    prisma.inventoryItem.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    }),
    // 10. Family Events
    prisma.familyEvent.findMany({
      where: { userId },
      orderBy: { eventDate: "asc" },
    }),
    // 11. Family Tasks
    prisma.familyTask.findMany({
      where: { userId },
      orderBy: { dueDate: "asc" },
    }),
    // 12. Habits
    prisma.habit.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    }),
    // 13. Trips
    prisma.trip.findMany({
      where: { userId },
      orderBy: { startDate: "asc" },
    }),
    // 14. Knowledge Notes
    prisma.knowledgeNote.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  // Match and map documents
  const matchedDocs: SearchResultItem[] = [];
  for (const doc of docs) {
    const titleMatch = doc.title.toLowerCase().includes(query);
    const catMatch = doc.category.toLowerCase().includes(query);
    const numMatch = doc.documentNumber?.toLowerCase().includes(query) ?? false;
    const notesMatch = doc.notes?.toLowerCase().includes(query) ?? false;
    const issuerMatch = doc.issuedBy?.toLowerCase().includes(query) ?? false;

    if (titleMatch || catMatch || numMatch || notesMatch || issuerMatch) {
      const statusInfo = calculateDocumentStatus(doc.expiryDate);
      let variant: SearchResultItem["badgeVariant"] = "success";
      if (statusInfo.status === "EXPIRED") variant = "danger";
      else if (statusInfo.status === "CRITICAL") variant = "danger";
      else if (statusInfo.status === "EXPIRING_SOON") variant = "warning";

      matchedDocs.push({
        id: doc.id,
        category: "documents",
        categoryLabel: "Documents",
        title: doc.title,
        subtitle: `${doc.category}${doc.documentNumber ? ` • #${doc.documentNumber}` : ""}`,
        date: doc.expiryDate ? `Expires: ${new Date(doc.expiryDate).toLocaleDateString()}` : "No expiry",
        badgeText: statusInfo.countdownText || statusInfo.label,
        badgeVariant: variant,
        url: `/documents`,
        matchedField: titleMatch ? "title" : numMatch ? "document number" : catMatch ? "category" : "notes",
      });
    }
  }

  // Match and map reminders
  const matchedReminders: SearchResultItem[] = [];
  for (const rem of reminders) {
    const titleMatch = rem.title.toLowerCase().includes(query);
    const descMatch = rem.description?.toLowerCase().includes(query) ?? false;
    const catMatch = rem.category?.toLowerCase().includes(query) ?? false;

    if (titleMatch || descMatch || catMatch) {
      let variant: SearchResultItem["badgeVariant"] = "default";
      if (rem.priority === "critical") variant = "danger";
      else if (rem.priority === "high") variant = "warning";
      else if (rem.status === "completed") variant = "success";

      matchedReminders.push({
        id: rem.id,
        category: "reminders",
        categoryLabel: "Reminders",
        title: rem.title,
        subtitle: `${rem.category} • Priority: ${rem.priority}`,
        date: `Due: ${new Date(rem.dueDate).toLocaleDateString()}`,
        badgeText: rem.status.toUpperCase(),
        badgeVariant: variant,
        url: `/reminders`,
        matchedField: titleMatch ? "title" : descMatch ? "description" : "category",
      });
    }
  }

  // Match and map payments
  const matchedPayments: SearchResultItem[] = [];
  for (const p of payments) {
    const titleMatch = p.title.toLowerCase().includes(query);
    const payeeMatch = p.payee?.toLowerCase().includes(query) ?? false;
    const notesMatch = p.notes?.toLowerCase().includes(query) ?? false;
    const catMatch = p.category.toLowerCase().includes(query);

    if (titleMatch || payeeMatch || notesMatch || catMatch) {
      const pStatus = calculatePaymentStatus(p.dueDate, p.isPaid);
      let variant: SearchResultItem["badgeVariant"] = "info";
      if (pStatus === "Paid") variant = "success";
      else if (pStatus === "Overdue") variant = "danger";
      else if (pStatus === "Due Today") variant = "warning";

      matchedPayments.push({
        id: p.id,
        category: "payments",
        categoryLabel: "Bills & Payments",
        title: p.title,
        subtitle: `${p.payee ? `${p.payee} • ` : ""}${p.category}`,
        amount: `${p.currency} ${p.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
        date: `Due: ${new Date(p.dueDate).toLocaleDateString()}`,
        badgeText: pStatus,
        badgeVariant: variant,
        url: `/finance`,
        matchedField: titleMatch ? "title" : payeeMatch ? "payee" : "category",
      });
    }
  }

  // Match and map expenses
  const matchedExpenses: SearchResultItem[] = [];
  for (const exp of expenses) {
    const titleMatch = exp.title.toLowerCase().includes(query);
    const catMatch = exp.category.toLowerCase().includes(query);
    const merchantMatch = exp.merchant?.toLowerCase().includes(query) ?? false;
    const notesMatch = exp.notes?.toLowerCase().includes(query) ?? false;

    if (titleMatch || catMatch || merchantMatch || notesMatch) {
      matchedExpenses.push({
        id: exp.id,
        category: "expenses",
        categoryLabel: "Expenses",
        title: exp.title,
        subtitle: `${exp.merchant ? `${exp.merchant} • ` : ""}${exp.category}`,
        amount: `${exp.currency} ${exp.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
        date: new Date(exp.spentAt).toLocaleDateString(),
        badgeText: exp.category.toUpperCase(),
        badgeVariant: "default",
        url: `/finance`,
        matchedField: titleMatch ? "title" : merchantMatch ? "merchant" : "category",
      });
    }
  }

  // Match and map vehicles
  const matchedVehicles: SearchResultItem[] = [];
  for (const v of vehicles) {
    const nameMatch = v.name.toLowerCase().includes(query);
    const makeMatch = v.make?.toLowerCase().includes(query) ?? false;
    const modelMatch = v.model?.toLowerCase().includes(query) ?? false;
    const plateMatch = v.licensePlate?.toLowerCase().includes(query) ?? false;
    const notesMatch = v.notes?.toLowerCase().includes(query) ?? false;

    if (nameMatch || makeMatch || modelMatch || plateMatch || notesMatch) {
      const vStatus = calculateVehicleStatus(v);
      let variant: SearchResultItem["badgeVariant"] = "success";
      let badgeText = "VALID";
      if (vStatus.alerts.length > 0) {
        const topAlert = vStatus.alerts[0];
        badgeText = topAlert.urgency.toUpperCase();
        if (topAlert.urgency === "urgent") variant = "danger";
        else if (topAlert.urgency === "warning") variant = "warning";
        else variant = "info";
      }

      matchedVehicles.push({
        id: v.id,
        category: "vehicles",
        categoryLabel: "Vehicles",
        title: v.name,
        subtitle: `${v.year ? `${v.year} ` : ""}${v.make || ""} ${v.model || ""}${v.licensePlate ? ` • ${v.licensePlate}` : ""}`.trim(),
        badgeText,
        badgeVariant: variant,
        url: `/more/vehicles`,
        matchedField: nameMatch ? "name" : plateMatch ? "plate" : "model",
      });
    }
  }

  // Match and map subscriptions
  const matchedSubs: SearchResultItem[] = [];
  for (const s of subscriptions) {
    const nameMatch = s.name.toLowerCase().includes(query);
    const catMatch = s.category.toLowerCase().includes(query);
    const notesMatch = s.notes?.toLowerCase().includes(query) ?? false;

    if (nameMatch || catMatch || notesMatch) {
      let variant: SearchResultItem["badgeVariant"] = "default";
      if (s.renewalStatus === "active") variant = "success";
      else if (s.renewalStatus === "cancelled") variant = "outline";
      else if (s.renewalStatus === "trial") variant = "warning";

      matchedSubs.push({
        id: s.id,
        category: "subscriptions",
        categoryLabel: "Subscriptions",
        title: s.name,
        subtitle: `${s.category} • ${s.billingCycle}`,
        amount: `${s.currency} ${s.cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
        date: `Next: ${new Date(s.nextBillingDate).toLocaleDateString()}`,
        badgeText: s.renewalStatus.toUpperCase(),
        badgeVariant: variant,
        url: `/subscriptions`,
        matchedField: nameMatch ? "name" : "category",
      });
    }
  }

  // Match and map important dates
  const matchedDates: SearchResultItem[] = [];
  for (const d of dates) {
    const titleMatch = d.title.toLowerCase().includes(query);
    const catMatch = d.category.toLowerCase().includes(query);
    const notesMatch = d.notes?.toLowerCase().includes(query) ?? false;

    if (titleMatch || catMatch || notesMatch) {
      const nextOccur = calculateNextDateOccurrence(d.eventDate, d.recurrence);
      matchedDates.push({
        id: d.id,
        category: "dates",
        categoryLabel: "Important Dates",
        title: d.title,
        subtitle: `${d.category} • ${d.recurrence}`,
        date: nextOccur
          ? `Next: ${new Date(nextOccur.nextOccurrence).toLocaleDateString()} (${nextOccur.daysRemaining === 0 ? "today" : `${nextOccur.daysRemaining}d`})`
          : new Date(d.eventDate).toLocaleDateString(),
        badgeText: nextOccur?.isToday ? "TODAY" : d.category.toUpperCase(),
        badgeVariant: nextOccur?.isToday ? "danger" : "default",
        url: `/more/dates`,
        matchedField: titleMatch ? "title" : "category",
      });
    }
  }

  // Match and map planner tasks
  const matchedPlanner: SearchResultItem[] = [];
  for (const task of plannerTasks) {
    const titleMatch = task.title.toLowerCase().includes(query);
    const descMatch = task.description?.toLowerCase().includes(query) ?? false;
    const locMatch = task.location?.toLowerCase().includes(query) ?? false;
    const catMatch = task.category.toLowerCase().includes(query);
    const notesMatch = task.notes?.toLowerCase().includes(query) ?? false;

    if (titleMatch || descMatch || locMatch || catMatch || notesMatch) {
      matchedPlanner.push({
        id: task.id,
        category: "planner",
        categoryLabel: "Daily Planner",
        title: task.title,
        subtitle: `${task.itemType === "appointment" ? "Appointment" : "Task"} • ${task.category}${task.location ? ` • ${task.location}` : ""}`,
        date: new Date(task.date).toLocaleDateString(),
        badgeText: task.isCompleted ? "COMPLETED" : task.priority.toUpperCase(),
        badgeVariant: task.isCompleted ? "success" : task.priority === "urgent" || task.priority === "high" ? "danger" : "default",
        url: `/planner`,
        matchedField: titleMatch ? "title" : locMatch ? "location" : "category",
      });
    }
  }

  // Match and map home inventory items (Note: serial numbers NOT exposed in subtitles)
  const matchedInventory: SearchResultItem[] = [];
  for (const item of inventoryItems) {
    const nameMatch = item.name.toLowerCase().includes(query);
    const brandMatch = item.brand?.toLowerCase().includes(query) ?? false;
    const modelMatch = item.modelNumber?.toLowerCase().includes(query) ?? false;
    const serialMatch = item.serialNumber?.toLowerCase().includes(query) ?? false;
    const locMatch = item.location?.toLowerCase().includes(query) ?? false;
    const catMatch = item.category.toLowerCase().includes(query);

    if (nameMatch || brandMatch || modelMatch || serialMatch || locMatch || catMatch) {
      matchedInventory.push({
        id: item.id,
        category: "inventory",
        categoryLabel: "Home Inventory",
        title: item.name,
        subtitle: `${item.category}${item.brand ? ` • ${item.brand}` : ""}${item.location ? ` • In ${item.location}` : ""}`,
        date: item.warrantyExpiry ? `Warranty: ${new Date(item.warrantyExpiry).toLocaleDateString()}` : undefined,
        amount: item.purchasePrice ? `${item.currency} ${item.purchasePrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : undefined,
        badgeText: item.isArchived ? "ARCHIVED" : item.category.toUpperCase(),
        badgeVariant: item.isArchived ? "outline" : "info",
        url: `/inventory`,
        matchedField: nameMatch ? "name" : brandMatch ? "brand" : modelMatch ? "model" : "category",
      });
    }
  }

  // Match and map family events and tasks
  const matchedFamily: SearchResultItem[] = [];
  for (const fe of familyEvents) {
    const titleMatch = fe.title.toLowerCase().includes(query);
    const descMatch = fe.description?.toLowerCase().includes(query) ?? false;
    const locMatch = fe.location?.toLowerCase().includes(query) ?? false;
    const catMatch = fe.category.toLowerCase().includes(query);

    if (titleMatch || descMatch || locMatch || catMatch) {
      matchedFamily.push({
        id: fe.id,
        category: "family",
        categoryLabel: "Family Event",
        title: fe.title,
        subtitle: `Event • ${fe.category}${fe.location ? ` • ${fe.location}` : ""}`,
        date: new Date(fe.eventDate).toLocaleDateString(),
        badgeText: "FAMILY",
        badgeVariant: "info",
        url: `/more/family`,
        matchedField: titleMatch ? "title" : locMatch ? "location" : "category",
      });
    }
  }
  for (const ft of familyTasks) {
    const titleMatch = ft.title.toLowerCase().includes(query);
    const descMatch = ft.description?.toLowerCase().includes(query) ?? false;
    const memberMatch = ft.assignedMemberName?.toLowerCase().includes(query) ?? false;
    const catMatch = ft.category.toLowerCase().includes(query);

    if (titleMatch || descMatch || memberMatch || catMatch) {
      matchedFamily.push({
        id: ft.id,
        category: "family",
        categoryLabel: "Family Task",
        title: ft.title,
        subtitle: `Task • ${ft.category}${ft.assignedMemberName ? ` • Assigned to ${ft.assignedMemberName}` : ""}`,
        date: ft.dueDate ? `Due: ${new Date(ft.dueDate).toLocaleDateString()}` : undefined,
        badgeText: ft.isCompleted ? "DONE" : ft.priority.toUpperCase(),
        badgeVariant: ft.isCompleted ? "success" : "warning",
        url: `/more/family`,
        matchedField: titleMatch ? "title" : memberMatch ? "member" : "category",
      });
    }
  }

  // Match and map habits
  const matchedWellness: SearchResultItem[] = [];
  for (const h of habits) {
    const titleMatch = h.title.toLowerCase().includes(query);
    const descMatch = h.description?.toLowerCase().includes(query) ?? false;
    const catMatch = h.category.toLowerCase().includes(query);

    if (titleMatch || descMatch || catMatch) {
      matchedWellness.push({
        id: h.id,
        category: "wellness",
        categoryLabel: "Habits & Wellness",
        title: h.title,
        subtitle: `${h.frequency} • ${h.category}${h.currentStreak > 0 ? ` • 🔥 ${h.currentStreak} day streak` : ""}`,
        badgeText: `${h.currentStreak} STREAK`,
        badgeVariant: h.currentStreak > 0 ? "success" : "default",
        url: `/wellness`,
        matchedField: titleMatch ? "title" : "category",
      });
    }
  }

  // Match and map trips (Note: booking references masked, never shown raw in subtitles)
  const matchedTravel: SearchResultItem[] = [];
  for (const trip of trips) {
    const titleMatch = trip.title.toLowerCase().includes(query);
    const destMatch = trip.destination.toLowerCase().includes(query);
    const notesMatch = trip.notes?.toLowerCase().includes(query) ?? false;

    if (titleMatch || destMatch || notesMatch) {
      matchedTravel.push({
        id: trip.id,
        category: "travel",
        categoryLabel: "Travel & Trips",
        title: trip.title,
        subtitle: `${trip.destination} • Status: ${trip.status}`,
        date: `${new Date(trip.startDate).toLocaleDateString()} - ${new Date(trip.endDate).toLocaleDateString()}`,
        badgeText: trip.status.toUpperCase(),
        badgeVariant: trip.status === "active" ? "success" : trip.status === "completed" ? "outline" : "info",
        url: `/travel`,
        matchedField: titleMatch ? "title" : "destination",
      });
    }
  }

  // Match and map knowledge notes
  const matchedKnowledge: SearchResultItem[] = [];
  for (const note of knowledgeNotes) {
    const titleMatch = note.title.toLowerCase().includes(query);
    const contentMatch = note.content.toLowerCase().includes(query);
    const tagsMatch = note.tags?.toLowerCase().includes(query) ?? false;

    if (titleMatch || contentMatch || tagsMatch) {
      matchedKnowledge.push({
        id: note.id,
        category: "knowledge",
        categoryLabel: "Knowledge Wallet",
        title: note.title,
        subtitle: `${note.tags ? `Tags: ${note.tags} • ` : ""}${note.content.slice(0, 50)}...`,
        badgeText: note.isPinned ? "PINNED" : note.isFavorite ? "FAVORITE" : "NOTE",
        badgeVariant: note.isPinned ? "warning" : "default",
        url: `/knowledge`,
        matchedField: titleMatch ? "title" : tagsMatch ? "tags" : "content",
      });
    }
  }

  const categoryCounts: Record<SearchCategory, number> = {
    all:
      matchedDocs.length +
      matchedReminders.length +
      matchedPayments.length +
      matchedExpenses.length +
      matchedVehicles.length +
      matchedSubs.length +
      matchedDates.length +
      matchedPlanner.length +
      matchedInventory.length +
      matchedFamily.length +
      matchedWellness.length +
      matchedTravel.length +
      matchedKnowledge.length,
    documents: matchedDocs.length,
    reminders: matchedReminders.length,
    payments: matchedPayments.length,
    expenses: matchedExpenses.length,
    vehicles: matchedVehicles.length,
    subscriptions: matchedSubs.length,
    dates: matchedDates.length,
    planner: matchedPlanner.length,
    inventory: matchedInventory.length,
    family: matchedFamily.length,
    wellness: matchedWellness.length,
    travel: matchedTravel.length,
    knowledge: matchedKnowledge.length,
  };

  const grouped = {
    documents: matchedDocs,
    reminders: matchedReminders,
    payments: matchedPayments,
    expenses: matchedExpenses,
    vehicles: matchedVehicles,
    subscriptions: matchedSubs,
    dates: matchedDates,
    planner: matchedPlanner,
    inventory: matchedInventory,
    family: matchedFamily,
    wellness: matchedWellness,
    travel: matchedTravel,
    knowledge: matchedKnowledge,
  };

  let items: SearchResultItem[] = [];
  if (selectedCategory === "all") {
    items = [
      ...matchedDocs,
      ...matchedReminders,
      ...matchedPayments,
      ...matchedExpenses,
      ...matchedVehicles,
      ...matchedSubs,
      ...matchedDates,
      ...matchedPlanner,
      ...matchedInventory,
      ...matchedFamily,
      ...matchedWellness,
      ...matchedTravel,
      ...matchedKnowledge,
    ];
  } else {
    items = grouped[selectedCategory] || [];
  }

  const total = categoryCounts[selectedCategory] ?? categoryCounts.all;

  return {
    query,
    total,
    totalResults: total,
    categoryCounts,
    grouped,
    results: grouped,
    items,
  };
}
