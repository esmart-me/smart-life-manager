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
  | "dates";

export interface SearchResultItem {
  id: string;
  category: "documents" | "reminders" | "payments" | "expenses" | "vehicles" | "subscriptions" | "dates";
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
  };
  results: {
    documents: SearchResultItem[];
    reminders: SearchResultItem[];
    payments: SearchResultItem[];
    expenses: SearchResultItem[];
    vehicles: SearchResultItem[];
    subscriptions: SearchResultItem[];
    dates: SearchResultItem[];
  };
  items: SearchResultItem[];
}

export async function executeGlobalSearch(
  userId: string,
  rawQuery: string,
  selectedCategory: SearchCategory = "all"
): Promise<GlobalSearchResponse> {
  const query = (rawQuery || "").trim().toLowerCase();
  
  if (!query) {
    const emptyGrouped = {
      documents: [],
      reminders: [],
      payments: [],
      expenses: [],
      vehicles: [],
      subscriptions: [],
      dates: [],
    };

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
      },
      grouped: emptyGrouped,
      results: emptyGrouped,
      items: [],
    };
  }

  // Multi-tenant safe parallel queries
  const [
    docs,
    reminders,
    payments,
    expenses,
    vehicles,
    subscriptions,
    dates,
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
      const isCompleted = rem.status === "completed";
      const isPast = new Date(rem.dueDate) < new Date() && !isCompleted;
      const badgeVariant: SearchResultItem["badgeVariant"] = isCompleted
        ? "success"
        : isPast
        ? "danger"
        : "info";

      matchedReminders.push({
        id: rem.id,
        category: "reminders",
        categoryLabel: "Reminders",
        title: rem.title,
        subtitle: `${rem.category || "General"}${rem.description ? ` • ${rem.description}` : ""}`,
        date: `Due: ${new Date(rem.dueDate).toLocaleDateString()}`,
        badgeText: isCompleted ? "Completed" : isPast ? "Overdue" : "Pending",
        badgeVariant,
        url: `/reminders`,
        matchedField: titleMatch ? "title" : descMatch ? "description" : "category",
      });
    }
  }

  // Match and map payments
  const matchedPayments: SearchResultItem[] = [];
  for (const pay of payments) {
    const titleMatch = pay.title.toLowerCase().includes(query);
    const payeeMatch = pay.payee?.toLowerCase().includes(query) ?? false;
    const catMatch = pay.category?.toLowerCase().includes(query) ?? false;
    const notesMatch = pay.notes?.toLowerCase().includes(query) ?? false;

    if (titleMatch || payeeMatch || catMatch || notesMatch) {
      const status = calculatePaymentStatus(pay.dueDate, pay.isPaid);
      let variant: SearchResultItem["badgeVariant"] = "success";
      if (status === "Overdue") variant = "danger";
      else if (status === "Due Today") variant = "warning";
      else if (status === "Upcoming") variant = "info";

      matchedPayments.push({
        id: pay.id,
        category: "payments",
        categoryLabel: "Payments",
        title: pay.title,
        subtitle: `${pay.category}${pay.payee ? ` • Payee: ${pay.payee}` : ""}`,
        amount: `${pay.currency} ${pay.amount.toFixed(2)}`,
        date: `Due: ${new Date(pay.dueDate).toLocaleDateString()}`,
        badgeText: status,
        badgeVariant: variant,
        url: `/finance?tab=payments`,
        matchedField: titleMatch ? "title" : payeeMatch ? "payee" : catMatch ? "category" : "notes",
      });
    }
  }

  // Match and map expenses
  const matchedExpenses: SearchResultItem[] = [];
  for (const exp of expenses) {
    const titleMatch = exp.title.toLowerCase().includes(query);
    const catMatch = exp.category.toLowerCase().includes(query);
    const methodMatch = exp.paymentMethod?.toLowerCase().includes(query) ?? false;
    const notesMatch = exp.notes?.toLowerCase().includes(query) ?? false;

    if (titleMatch || catMatch || methodMatch || notesMatch) {
      matchedExpenses.push({
        id: exp.id,
        category: "expenses",
        categoryLabel: "Expenses",
        title: exp.title,
        subtitle: `${exp.category} • ${exp.paymentMethod || "Other"}`,
        amount: `${exp.currency} ${exp.amount.toFixed(2)}`,
        date: new Date(exp.spentAt).toLocaleDateString(),
        badgeText: exp.category,
        badgeVariant: "default",
        url: `/finance?tab=expenses`,
        matchedField: titleMatch ? "description" : catMatch ? "category" : methodMatch ? "payment method" : "notes",
      });
    }
  }

  // Match and map vehicles
  const matchedVehicles: SearchResultItem[] = [];
  for (const veh of vehicles) {
    const nameMatch = veh.name.toLowerCase().includes(query);
    const makeMatch = veh.make?.toLowerCase().includes(query) ?? false;
    const modelMatch = veh.model?.toLowerCase().includes(query) ?? false;
    const plateMatch = veh.licensePlate?.toLowerCase().includes(query) ?? false;
    const vinMatch = veh.vin?.toLowerCase().includes(query) ?? false;
    const notesMatch = veh.notes?.toLowerCase().includes(query) ?? false;

    if (nameMatch || makeMatch || modelMatch || plateMatch || vinMatch || notesMatch) {
      const summary = calculateVehicleStatus(veh);
      const hasAlerts = summary.alerts.length > 0;
      const subtitle = [veh.year, veh.make, veh.model].filter(Boolean).join(" ") + (veh.licensePlate ? ` • ${veh.licensePlate}` : "");

      matchedVehicles.push({
        id: veh.id,
        category: "vehicles",
        categoryLabel: "Vehicles",
        title: veh.name,
        subtitle: subtitle || "Vehicle details",
        date: `Mileage: ${(veh.mileage || 0).toLocaleString()} km`,
        badgeText: hasAlerts ? `${summary.alerts.length} Alert${summary.alerts.length > 1 ? "s" : ""}` : "Good Standing",
        badgeVariant: hasAlerts ? "danger" : "success",
        url: `/more/vehicles`,
        matchedField: nameMatch ? "name" : plateMatch ? "license plate" : makeMatch ? "make/model" : "details",
      });
    }
  }

  // Match and map subscriptions
  const matchedSubs: SearchResultItem[] = [];
  for (const sub of subscriptions) {
    const nameMatch = sub.name.toLowerCase().includes(query);
    const catMatch = sub.category.toLowerCase().includes(query);
    const cycleMatch = sub.billingCycle.toLowerCase().includes(query);
    const notesMatch = sub.notes?.toLowerCase().includes(query) ?? false;

    if (nameMatch || catMatch || cycleMatch || notesMatch) {
      const isCancelled = sub.renewalStatus === "cancelled";
      matchedSubs.push({
        id: sub.id,
        category: "subscriptions",
        categoryLabel: "Subscriptions",
        title: sub.name,
        subtitle: `${sub.category} • ${sub.billingCycle}`,
        amount: `${sub.currency} ${sub.cost.toFixed(2)}/${sub.billingCycle}`,
        date: `Renews: ${new Date(sub.nextBillingDate).toLocaleDateString()}`,
        badgeText: isCancelled ? "Cancelled" : "Active",
        badgeVariant: isCancelled ? "outline" : "success",
        url: `/subscriptions`,
        matchedField: nameMatch ? "name" : catMatch ? "category" : "cycle",
      });
    }
  }

  // Match and map important dates
  const matchedDates: SearchResultItem[] = [];
  for (const dateItem of dates) {
    const titleMatch = dateItem.title.toLowerCase().includes(query);
    const catMatch = dateItem.category.toLowerCase().includes(query);
    const notesMatch = dateItem.notes?.toLowerCase().includes(query) ?? false;

    if (titleMatch || catMatch || notesMatch) {
      const computed = calculateNextDateOccurrence(dateItem.eventDate, dateItem.recurrence);
      matchedDates.push({
        id: dateItem.id,
        category: "dates",
        categoryLabel: "Important Dates",
        title: dateItem.title,
        subtitle: `${dateItem.category}${computed.yearsCount ? ` (${computed.yearsCount} yrs)` : ""} • ${computed.label}`,
        date: `Next: ${new Date(computed.nextOccurrence).toLocaleDateString()}`,
        badgeText: `${computed.daysRemaining} days left`,
        badgeVariant: computed.daysRemaining <= 7 ? "warning" : "info",
        url: `/more/dates`,
        matchedField: titleMatch ? "title" : catMatch ? "category" : "notes",
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
      matchedDates.length,
    documents: matchedDocs.length,
    reminders: matchedReminders.length,
    payments: matchedPayments.length,
    expenses: matchedExpenses.length,
    vehicles: matchedVehicles.length,
    subscriptions: matchedSubs.length,
    dates: matchedDates.length,
  };

  const grouped = {
    documents: matchedDocs,
    reminders: matchedReminders,
    payments: matchedPayments,
    expenses: matchedExpenses,
    vehicles: matchedVehicles,
    subscriptions: matchedSubs,
    dates: matchedDates,
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
