// src/lib/ai/context-builder.ts
// Secure, customer-isolated context builder for Smart Life Manager AI Assistant.
// Strictly queries only records belonging to the authenticated userId.
// Never exposes password hashes, secrets, binary files, or other tenants' data.

import { prisma } from "@/lib/db/prisma";

export interface RelevantContextOptions {
  includeDocuments?: boolean;
  includeReminders?: boolean;
  includeFinance?: boolean;
  includeVehicles?: boolean;
  includeSubscriptions?: boolean;
  includeImportantDates?: boolean;
  includeFamily?: boolean;
}

/**
 * Analyzes the user's natural language query to determine which life modules are relevant.
 * Ensures the AI receives minimal, high-precision context rather than unnecessary data dumps.
 */
export function detectRelevantModules(query: string): RelevantContextOptions {
  const q = query.toLowerCase();

  const isGeneralSummary =
    q.includes("summary") ||
    q.includes("overview") ||
    q.includes("everything") ||
    q.includes("all my") ||
    q.includes("what do i have") ||
    q.includes("smart life") ||
    q.includes("help me");

  if (isGeneralSummary) {
    return {
      includeDocuments: true,
      includeReminders: true,
      includeFinance: true,
      includeVehicles: true,
      includeSubscriptions: true,
      includeImportantDates: true,
      includeFamily: true,
    };
  }

  return {
    includeDocuments:
      q.includes("doc") ||
      q.includes("passport") ||
      q.includes("id ") ||
      q.includes("license") ||
      q.includes("file") ||
      q.includes("upload") ||
      q.includes("certificate") ||
      q.includes("contract") ||
      q.includes("visa"),
    includeReminders:
      q.includes("remind") ||
      q.includes("task") ||
      q.includes("todo") ||
      q.includes("schedule") ||
      q.includes("urgent") ||
      q.includes("overdue") ||
      q.includes("pending"),
    includeFinance:
      q.includes("pay") ||
      q.includes("bill") ||
      q.includes("due") ||
      q.includes("spend") ||
      q.includes("spent") ||
      q.includes("expense") ||
      q.includes("budget") ||
      q.includes("income") ||
      q.includes("money") ||
      q.includes("cost"),
    includeVehicles:
      q.includes("car") ||
      q.includes("vehicle") ||
      q.includes("auto") ||
      q.includes("garage") ||
      q.includes("mileage") ||
      q.includes("insurance") ||
      q.includes("registration") ||
      q.includes("service") ||
      q.includes("maintenance"),
    includeSubscriptions:
      q.includes("sub") ||
      q.includes("netflix") ||
      q.includes("recurring") ||
      q.includes("membership") ||
      q.includes("renewal") ||
      q.includes("cancel"),
    includeImportantDates:
      q.includes("date") ||
      q.includes("birthday") ||
      q.includes("anniversary") ||
      q.includes("wedding") ||
      q.includes("milestone") ||
      q.includes("event"),
    includeFamily:
      q.includes("family") ||
      q.includes("spouse") ||
      q.includes("child") ||
      q.includes("parent") ||
      q.includes("member") ||
      q.includes("emergency"),
  };
}

/**
 * Builds a strictly isolated, read-only markdown context block for the authenticated customer.
 * Every single database query strictly enforces `userId: userId` scoping.
 */
export async function buildCustomerContext(
  userId: string,
  userQuery: string
): Promise<string> {
  const modules = detectRelevantModules(userQuery);

  // Fetch customer profile details
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      profile: {
        select: {
          displayName: true,
          firstName: true,
          lastName: true,
          currency: true,
          country: true,
          region: true,
          timezone: true,
        },
      },
      userSubscription: {
        select: {
          plan: true,
          planName: true,
          status: true,
        },
      },
    },
  });

  if (!user) {
    return "User account not found.";
  }

  const sections: string[] = [];

  // 1. Account Metadata (No secrets or tokens)
  sections.push(
    `### Customer Profile
- **Name**: ${user.profile?.displayName || user.profile?.firstName || user.email.split("@")[0]}
- **Preferred Currency**: ${user.profile?.currency || "USD"}
- **Country / Region**: ${user.profile?.country || "US"}
- **Current Plan**: ${user.userSubscription?.planName || "Free Starter"}`
  );

  // 2. Reminders
  if (modules.includeReminders) {
    const reminders = await prisma.reminder.findMany({
      where: { userId },
      orderBy: { dueDate: "asc" },
      take: 20,
      select: {
        title: true,
        description: true,
        dueDate: true,
        priority: true,
        status: true,
        category: true,
        isRecurring: true,
        recurrenceRule: true,
      },
    });

    if (reminders.length > 0) {
      const list = reminders
        .map(
          (r) =>
            `- [${r.status.toUpperCase()}] **${r.title}** (Due: ${r.dueDate ? new Date(r.dueDate).toLocaleDateString() : "No date"}, Priority: ${r.priority}, Category: ${r.category}${r.isRecurring ? `, Recurring: ${r.recurrenceRule}` : ""}${r.description ? ` - ${r.description}` : ""})`
        )
        .join("\n");
      sections.push(`### Reminders (${reminders.length} items)\n${list}`);
    } else {
      sections.push("### Reminders\nNo reminders currently recorded.");
    }
  }

  // 3. Finance: Payments, Expenses & Budget
  if (modules.includeFinance) {
    const [payments, expenses, budget] = await Promise.all([
      prisma.payment.findMany({
        where: { userId },
        orderBy: { dueDate: "asc" },
        take: 20,
        select: {
          title: true,
          amount: true,
          currency: true,
          dueDate: true,
          isPaid: true,
          category: true,
          isRecurring: true,
          frequency: true,
        },
      }),
      prisma.expense.findMany({
        where: { userId },
        orderBy: { spentAt: "desc" },
        take: 20,
        select: {
          title: true,
          amount: true,
          currency: true,
          category: true,
          spentAt: true,
        },
      }),
      prisma.budget.findMany({
        where: { userId },
        select: {
          category: true,
          limitAmount: true,
          currency: true,
          period: true,
          alertThreshold: true,
        },
      }),
    ]);

    let financeSummary = "### Financial Overview\n";

    if (budget && budget.length > 0) {
      financeSummary += "#### Budgets:\n";
      financeSummary += budget
        .map(
          (b) =>
            `- **${b.category}**: ${b.currency} ${b.limitAmount.toFixed(2)} / ${b.period} (Alert threshold: ${b.alertThreshold}%)`
        )
        .join("\n") + "\n";
    }

    if (payments.length > 0) {
      financeSummary += `\n#### Upcoming & Scheduled Bills (${payments.length}):\n`;
      financeSummary += payments
        .map(
          (p) =>
            `- ${p.isPaid ? "[PAID]" : "[UNPAID]"} **${p.title}**: ${p.currency} ${p.amount.toFixed(2)} (Due: ${new Date(p.dueDate).toLocaleDateString()}, Category: ${p.category}${p.isRecurring ? `, Recurring: ${p.frequency}` : ""})`
        )
        .join("\n");
    } else {
      financeSummary += "\n#### Bills / Payments\nNo payment records found.\n";
    }

    if (expenses.length > 0) {
      const totalExpense = expenses.reduce((acc, curr) => acc + curr.amount, 0);
      financeSummary += `\n#### Recent Expenses (Total: ${expenses[0]?.currency || "USD"} ${totalExpense.toFixed(2)} across ${expenses.length} entries):\n`;
      financeSummary += expenses
        .slice(0, 10)
        .map(
          (e) =>
            `- **${e.title}**: ${e.currency} ${e.amount.toFixed(2)} on ${new Date(e.spentAt).toLocaleDateString()} (${e.category})`
        )
        .join("\n");
    } else {
      financeSummary += "\n#### Expenses\nNo expenses logged yet.\n";
    }

    sections.push(financeSummary);
  }

  // 4. Vehicles
  if (modules.includeVehicles) {
    const vehicles = await prisma.vehicle.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        name: true,
        make: true,
        model: true,
        year: true,
        licensePlate: true,
        mileage: true,
        registrationExpiry: true,
        insuranceExpiry: true,
        nextServiceDate: true,
        nextServiceMileage: true,
      },
    });

    if (vehicles.length > 0) {
      const list = vehicles
        .map((v) => {
          let str = `- **${v.name}** (${[v.year, v.make, v.model].filter(Boolean).join(" ") || "Vehicle"})`;
          if (v.licensePlate) str += ` | Plate: ${v.licensePlate}`;
          if (v.mileage) str += ` | Mileage: ${v.mileage.toLocaleString()} km`;
          if (v.insuranceExpiry) str += ` | Insurance Expiry: ${new Date(v.insuranceExpiry).toLocaleDateString()}`;
          if (v.registrationExpiry) str += ` | Registration Expiry: ${new Date(v.registrationExpiry).toLocaleDateString()}`;
          if (v.nextServiceDate) str += ` | Next Service: ${new Date(v.nextServiceDate).toLocaleDateString()}`;
          return str;
        })
        .join("\n");
      sections.push(`### Vehicles Garage (${vehicles.length} vehicle(s))\n${list}`);
    } else {
      sections.push("### Vehicles Garage\nNo vehicles registered in garage.");
    }
  }

  // 5. Subscriptions
  if (modules.includeSubscriptions) {
    const subscriptions = await prisma.subscription.findMany({
      where: { userId },
      orderBy: { nextBillingDate: "asc" },
      select: {
        name: true,
        cost: true,
        currency: true,
        billingCycle: true,
        nextBillingDate: true,
        renewalStatus: true,
        category: true,
      },
    });

    if (subscriptions.length > 0) {
      const list = subscriptions
        .map(
          (s) =>
            `- **${s.name}**: ${s.currency} ${s.cost.toFixed(2)} / ${s.billingCycle} (Status: ${s.renewalStatus}, Next Billing: ${s.nextBillingDate ? new Date(s.nextBillingDate).toLocaleDateString() : "N/A"}, Category: ${s.category})`
        )
        .join("\n");
      sections.push(`### Subscriptions (${subscriptions.length} active/tracked)\n${list}`);
    } else {
      sections.push("### Subscriptions\nNo subscriptions tracked.");
    }
  }

  // 6. Important Dates
  if (modules.includeImportantDates) {
    const dates = await prisma.importantDate.findMany({
      where: { userId },
      orderBy: { eventDate: "asc" },
      select: {
        title: true,
        category: true,
        eventDate: true,
        recurrence: true,
      },
    });

    if (dates.length > 0) {
      const list = dates
        .map(
          (d) =>
            `- **${d.title}**: ${new Date(d.eventDate).toLocaleDateString()} (Category: ${d.category}, Recurrence: ${d.recurrence})`
        )
        .join("\n");
      sections.push(`### Important Dates & Milestones (${dates.length} events)\n${list}`);
    } else {
      sections.push("### Important Dates\nNo important dates recorded.");
    }
  }

  // 7. Documents
  if (modules.includeDocuments) {
    const documents = await prisma.document.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        title: true,
        category: true,
        documentNumber: true,
        expiryDate: true,
        createdAt: true,
      },
    });

    if (documents.length > 0) {
      const list = documents
        .map(
          (d) =>
            `- **${d.title}** (${d.category}${d.documentNumber ? `, Number: ${d.documentNumber}` : ""}${d.expiryDate ? `, Expires: ${new Date(d.expiryDate).toLocaleDateString()}` : ", No expiration date"})`
        )
        .join("\n");
      sections.push(`### Uploaded Documents (${documents.length} document(s))\n${list}`);
    } else {
      sections.push("### Uploaded Documents\nNo documents uploaded yet.");
    }
  }

  // 8. Family
  if (modules.includeFamily) {
    const [familyMembers, familyGroups] = await Promise.all([
      prisma.familyMember.findMany({
        where: { userId },
        select: {
          name: true,
          relationship: true,
          emergencyContact: true,
        },
      }),
      prisma.familyGroup.findMany({
        where: { ownerId: userId },
        include: {
          members: {
            select: {
              name: true,
              role: true,
              email: true,
            },
          },
        },
      }),
    ]);

    if (familyMembers.length > 0 || familyGroups.length > 0) {
      let famStr = "### Family Circle\n";
      if (familyMembers.length > 0) {
        famStr += familyMembers
          .map(
            (m) =>
              `- **${m.name}** (${m.relationship}${m.emergencyContact ? ", Emergency Contact" : ""})`
          )
          .join("\n");
      }
      if (familyGroups.length > 0) {
        familyGroups.forEach((g) => {
          famStr += `\n**Group: ${g.name}**\n`;
          g.members.forEach((gm) => {
            famStr += `  - ${gm.name} (Role: ${gm.role}${gm.email ? `, Email: ${gm.email}` : ""})\n`;
          });
        });
      }
      sections.push(famStr);
    } else {
      sections.push("### Family Circle\nNo family members or groups created.");
    }
  }

  return sections.join("\n\n");
}
