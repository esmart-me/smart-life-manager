import { prisma } from "@/lib/db/prisma";

export interface UnifiedTimelineItem {
  id: string;
  sourceType: "task" | "appointment" | "reminder" | "bill" | "document_expiry" | "vehicle_service";
  title: string;
  description?: string | null;
  date: string; // YYYY-MM-DD
  time?: string | null; // "HH:mm"
  endTime?: string | null;
  location?: string | null;
  priority: "low" | "medium" | "high" | "urgent";
  category: string;
  isCompleted: boolean;
  isOverdue: boolean;
  metadata?: Record<string, any>;
  actionUrl: string;
}

export interface DailyBriefingData {
  date: string;
  greeting: string;
  enabled: boolean;
  preferredTime: string;
  totalScheduleCount: number;
  tasksCount: number;
  appointmentsCount: number;
  remindersCount: number;
  billsCount: number;
  overdueCount: number;
  highPriorityCount: number;
  topOverdueItems: UnifiedTimelineItem[];
  todaysAgenda: UnifiedTimelineItem[];
}

export interface PlannerQueryResult {
  selectedDate: string;
  view: "today" | "tomorrow" | "week" | "calendar" | "all";
  filter: "all" | "overdue" | "today" | "upcoming" | "completed";
  timeline: UnifiedTimelineItem[];
  briefing: DailyBriefingData;
  counts: {
    all: number;
    today: number;
    tomorrow: number;
    week: number;
    overdue: number;
    completed: number;
  };
}

function formatDateString(d: Date): string {
  return d.toISOString().split("T")[0];
}

export async function getUnifiedPlannerData(
  userId: string,
  targetDateStr?: string,
  view: "today" | "tomorrow" | "week" | "calendar" | "all" = "today",
  filter: "all" | "overdue" | "today" | "upcoming" | "completed" = "all"
): Promise<PlannerQueryResult> {
  const now = new Date();
  const todayStr = formatDateString(now);

  const baseDate = targetDateStr ? new Date(targetDateStr) : new Date();
  if (isNaN(baseDate.getTime())) {
    baseDate.setTime(now.getTime());
  }

  // Calculate window start and end depending on view
  let rangeStart = new Date(baseDate);
  let rangeEnd = new Date(baseDate);

  rangeStart.setHours(0, 0, 0, 0);
  rangeEnd.setHours(23, 59, 59, 999);

  if (view === "tomorrow") {
    rangeStart.setDate(rangeStart.getDate() + 1);
    rangeEnd.setDate(rangeEnd.getDate() + 1);
  } else if (view === "week") {
    // Current week: Start from Monday or start of week to 7 days ahead
    rangeEnd.setDate(rangeEnd.getDate() + 6);
  } else if (view === "calendar") {
    // Month window around baseDate: 1st of month to last of month
    rangeStart = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1, 0, 0, 0, 0);
    rangeEnd = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0, 23, 59, 59, 999);
  } else if (view === "all") {
    // 30 days before to 60 days ahead
    rangeStart = new Date(baseDate);
    rangeStart.setDate(rangeStart.getDate() - 30);
    rangeEnd = new Date(baseDate);
    rangeEnd.setDate(rangeEnd.getDate() + 60);
  }

  // Also query overdue bounds (past 90 days before today)
  const overdueThreshold = new Date(now);
  overdueThreshold.setHours(0, 0, 0, 0);

  // Parallel database fetch for existing records & new planner tasks
  const [
    plannerTasks,
    overduePlannerTasks,
    reminders,
    payments,
    documents,
    vehicles,
    userSettings,
  ] = await Promise.all([
    // 1. Planner tasks in range
    prisma.plannerTask.findMany({
      where: {
        userId,
        date: { gte: rangeStart, lte: rangeEnd },
      },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    }),
    // 2. Overdue planner tasks (not completed, date < today)
    prisma.plannerTask.findMany({
      where: {
        userId,
        isCompleted: false,
        date: { lt: overdueThreshold },
      },
      orderBy: { date: "asc" },
      take: 20,
    }),
    // 3. Reminders in range or overdue
    prisma.reminder.findMany({
      where: {
        userId,
        dueDate: { gte: rangeStart, lte: rangeEnd },
        status: { in: ["pending", "snoozed", "completed"] },
      },
      orderBy: { dueDate: "asc" },
    }),
    // 4. Payments due in range or overdue unpaid
    prisma.payment.findMany({
      where: {
        userId,
        dueDate: { gte: rangeStart, lte: rangeEnd },
      },
      orderBy: { dueDate: "asc" },
    }),
    // 5. Expiring documents
    prisma.document.findMany({
      where: {
        userId,
        hasExpiry: true,
        expiryDate: { gte: rangeStart, lte: rangeEnd },
      },
      orderBy: { expiryDate: "asc" },
    }),
    // 6. Vehicles with service or expiry dates in range
    prisma.vehicle.findMany({
      where: {
        userId,
        OR: [
          { nextServiceDate: { gte: rangeStart, lte: rangeEnd } },
          { insuranceExpiry: { gte: rangeStart, lte: rangeEnd } },
          { registrationExpiry: { gte: rangeStart, lte: rangeEnd } },
          { pucExpiryDate: { gte: rangeStart, lte: rangeEnd } },
        ],
      },
    }),
    // 7. User Settings for briefing
    prisma.userSetting.findUnique({
      where: { userId },
    }),
  ]);

  const rawItems: UnifiedTimelineItem[] = [];

  // Transform PlannerTasks
  for (const t of plannerTasks) {
    const dStr = formatDateString(t.date);
    const isOverdue = !t.isCompleted && dStr < todayStr;
    rawItems.push({
      id: t.id,
      sourceType: t.itemType === "appointment" ? "appointment" : "task",
      title: t.title,
      description: t.description,
      date: dStr,
      time: t.startTime || null,
      endTime: t.endTime || null,
      location: t.location || null,
      priority: (t.priority as any) || "medium",
      category: t.category || "personal",
      isCompleted: t.isCompleted,
      isOverdue,
      notes: t.notes || null,
      actionUrl: `/planner?task=${t.id}`,
    } as any);
  }

  // Include overdue tasks if not already present
  for (const ot of overduePlannerTasks) {
    if (!rawItems.some((i) => i.id === ot.id)) {
      rawItems.push({
        id: ot.id,
        sourceType: ot.itemType === "appointment" ? "appointment" : "task",
        title: ot.title,
        description: ot.description,
        date: formatDateString(ot.date),
        time: ot.startTime || null,
        endTime: ot.endTime || null,
        location: ot.location || null,
        priority: (ot.priority as any) || "high",
        category: ot.category || "personal",
        isCompleted: false,
        isOverdue: true,
        notes: ot.notes || null,
        actionUrl: `/planner?task=${ot.id}`,
      } as any);
    }
  }

  // Transform Reminders
  for (const r of reminders) {
    const dStr = formatDateString(r.dueDate);
    const isCompleted = r.status === "completed";
    const isOverdue = !isCompleted && dStr < todayStr;
    rawItems.push({
      id: `rem_${r.id}`,
      sourceType: "reminder",
      title: r.title,
      description: r.description,
      date: dStr,
      time: r.dueDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
      priority: (r.priority as any) || "medium",
      category: r.category || "general",
      isCompleted,
      isOverdue,
      metadata: { originalId: r.id, status: r.status },
      actionUrl: `/reminders?id=${r.id}`,
    });
  }

  // Transform Payments (Bills)
  for (const p of payments) {
    const dStr = formatDateString(p.dueDate);
    const isOverdue = !p.isPaid && dStr < todayStr;
    rawItems.push({
      id: `pay_${p.id}`,
      sourceType: "bill",
      title: `Bill: ${p.title} (${p.currency} ${p.amount.toFixed(2)})`,
      description: p.payee ? `Payee: ${p.payee}` : p.notes,
      date: dStr,
      time: null,
      priority: isOverdue ? "urgent" : "high",
      category: p.category || "bill",
      isCompleted: p.isPaid,
      isOverdue,
      metadata: { originalId: p.id, amount: p.amount, currency: p.currency, isPaid: p.isPaid },
      actionUrl: `/finance?payment=${p.id}`,
    });
  }

  // Transform Document Expiries
  for (const doc of documents) {
    if (!doc.expiryDate) continue;
    const dStr = formatDateString(doc.expiryDate);
    const isOverdue = dStr < todayStr;
    rawItems.push({
      id: `doc_${doc.id}`,
      sourceType: "document_expiry",
      title: `Doc Expiry: ${doc.title}`,
      description: `Category: ${doc.category}`,
      date: dStr,
      time: null,
      priority: isOverdue ? "urgent" : "high",
      category: doc.category || "document",
      isCompleted: false,
      isOverdue,
      metadata: { originalId: doc.id },
      actionUrl: `/documents?id=${doc.id}`,
    });
  }

  // Transform Vehicle Services & Expiries
  for (const v of vehicles) {
    if (v.nextServiceDate && v.nextServiceDate >= rangeStart && v.nextServiceDate <= rangeEnd) {
      const dStr = formatDateString(v.nextServiceDate);
      rawItems.push({
        id: `veh_svc_${v.id}`,
        sourceType: "vehicle_service",
        title: `Service Due: ${v.name}`,
        description: v.model ? `${v.make || ""} ${v.model}` : "Maintenance schedule",
        date: dStr,
        time: null,
        priority: "high",
        category: "vehicle",
        isCompleted: false,
        isOverdue: dStr < todayStr,
        metadata: { originalId: v.id, vehicleName: v.name },
        actionUrl: `/more/vehicles?id=${v.id}`,
      });
    }
    if (v.pucExpiryDate && v.pucExpiryDate >= rangeStart && v.pucExpiryDate <= rangeEnd) {
      const dStr = formatDateString(v.pucExpiryDate);
      rawItems.push({
        id: `veh_puc_${v.id}`,
        sourceType: "vehicle_service",
        title: `PUC Expiry: ${v.name}`,
        description: `Pollution Certificate renewal for ${v.name}`,
        date: dStr,
        time: null,
        priority: "medium",
        category: "vehicle",
        isCompleted: false,
        isOverdue: dStr < todayStr,
        metadata: { originalId: v.id, vehicleName: v.name },
        actionUrl: `/more/vehicles?id=${v.id}`,
      });
    }
  }

  // Chronological sort: by date, then by time (null time sorts at end of that date)
  rawItems.sort((a, b) => {
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }
    if (a.time && b.time) {
      return a.time.localeCompare(b.time);
    }
    if (a.time && !b.time) return -1;
    if (!a.time && b.time) return 1;
    return a.title.localeCompare(b.title);
  });

  // Calculate counts
  const allCount = rawItems.length;
  const todayCount = rawItems.filter((i) => i.date === todayStr).length;

  const tomorrowObj = new Date(now);
  tomorrowObj.setDate(tomorrowObj.getDate() + 1);
  const tomorrowStr = formatDateString(tomorrowObj);
  const tomorrowCount = rawItems.filter((i) => i.date === tomorrowStr).length;

  const weekEndObj = new Date(now);
  weekEndObj.setDate(weekEndObj.getDate() + 7);
  const weekEndStr = formatDateString(weekEndObj);
  const weekCount = rawItems.filter((i) => i.date >= todayStr && i.date <= weekEndStr).length;

  const overdueCount = rawItems.filter((i) => i.isOverdue && !i.isCompleted).length;
  const completedCount = rawItems.filter((i) => i.isCompleted).length;

  // Apply active filter
  let filteredItems = rawItems;
  if (filter === "overdue") {
    filteredItems = rawItems.filter((i) => i.isOverdue && !i.isCompleted);
  } else if (filter === "today") {
    filteredItems = rawItems.filter((i) => i.date === todayStr);
  } else if (filter === "upcoming") {
    filteredItems = rawItems.filter((i) => i.date > todayStr && !i.isCompleted);
  } else if (filter === "completed") {
    filteredItems = rawItems.filter((i) => i.isCompleted);
  }

  // Daily Briefing generation
  const todaysAgenda = rawItems.filter((i) => i.date === todayStr);
  const topOverdueItems = rawItems.filter((i) => i.isOverdue && !i.isCompleted).slice(0, 5);

  const hour = now.getHours();
  let greeting = "Good morning";
  if (hour >= 12 && hour < 17) greeting = "Good afternoon";
  else if (hour >= 17) greeting = "Good evening";

  const briefing: DailyBriefingData = {
    date: todayStr,
    greeting,
    enabled: userSettings?.dailyBriefingEnabled ?? true,
    preferredTime: userSettings?.dailyBriefingTime ?? "08:00",
    totalScheduleCount: todaysAgenda.length,
    tasksCount: todaysAgenda.filter((i) => i.sourceType === "task").length,
    appointmentsCount: todaysAgenda.filter((i) => i.sourceType === "appointment").length,
    remindersCount: todaysAgenda.filter((i) => i.sourceType === "reminder").length,
    billsCount: todaysAgenda.filter((i) => i.sourceType === "bill").length,
    overdueCount,
    highPriorityCount: todaysAgenda.filter((i) => i.priority === "urgent" || i.priority === "high").length,
    topOverdueItems,
    todaysAgenda,
  };

  return {
    selectedDate: formatDateString(baseDate),
    view,
    filter,
    timeline: filteredItems,
    briefing,
    counts: {
      all: allCount,
      today: todayCount,
      tomorrow: tomorrowCount,
      week: weekCount,
      overdue: overdueCount,
      completed: completedCount,
    },
  };
}
