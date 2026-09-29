// src/lib/ai/intelligent-selector.ts
// Intelligent Tool Selection & Context Assembler for Smart Life Manager AI Assistant.
// Selects and runs ONLY the minimal required tools based on user query and conversational history.
// Strictly scopes all data access to the session-authenticated customer ID.

import { createCustomerDataTools, CustomerProfileData } from "./customer-tools";

export interface ToolSelection {
  needDocuments: boolean;
  needReminders: boolean;
  needImportantDates: boolean;
  needVehicles: boolean;
  needExpenses: boolean;
  needPayments: boolean;
  needBudgets: boolean;
  needSubscriptions: boolean;
  needFamily: boolean;
  isGeneralOverview: boolean;
}

export interface GatherContextResult {
  contextText: string;
  selectedTools: string[];
  profile: CustomerProfileData | null;
}

/**
 * Analyzes the customer's query and recent conversation turns to intelligently
 * determine the minimum set of customer data tools required.
 * Handles anaphoric follow-up references (e.g., "How many days are left?", "Is it expired?").
 */
export function resolveRelevantTools(
  userMessage: string,
  history: Array<{ role: string; content: string }> = []
): ToolSelection {
  const q = userMessage.toLowerCase().trim();

  // 1. Check for general summary / complete life overview
  const isGeneralOverview =
    q.includes("summary") ||
    q.includes("overview") ||
    q.includes("everything") ||
    q.includes("all my") ||
    q.includes("what do i have") ||
    q.includes("smart life manager") ||
    q.includes("status of my account") ||
    q.includes("dashboard") ||
    q.includes("help me");

  if (isGeneralOverview) {
    return {
      needDocuments: true,
      needReminders: true,
      needImportantDates: true,
      needVehicles: true,
      needExpenses: true,
      needPayments: true,
      needBudgets: true,
      needSubscriptions: true,
      needFamily: true,
      isGeneralOverview: true,
    };
  }

  // 2. Direct keyword / intent matching
  let needDocuments =
    q.includes("doc") ||
    q.includes("passport") ||
    q.includes("id card") ||
    q.includes("license") ||
    q.includes("driving") ||
    q.includes("visa") ||
    q.includes("certificate") ||
    q.includes("contract") ||
    q.includes("file") ||
    q.includes("upload") ||
    q.includes("paperwork") ||
    (q.includes("expired") && !q.includes("car") && !q.includes("insurance"));

  let needReminders =
    q.includes("remind") ||
    q.includes("task") ||
    q.includes("todo") ||
    q.includes("to-do") ||
    q.includes("schedule") ||
    q.includes("urgent") ||
    q.includes("overdue") ||
    q.includes("pending") ||
    q.includes("take care of") ||
    q.includes("what to do") ||
    q.includes("checklist");

  let needImportantDates =
    q.includes("important date") ||
    q.includes("birthday") ||
    q.includes("anniversary") ||
    q.includes("event") ||
    q.includes("milestone") ||
    q.includes("wedding") ||
    q.includes("calendar");

  let needVehicles =
    q.includes("car") ||
    q.includes("vehicle") ||
    q.includes("auto") ||
    q.includes("garage") ||
    q.includes("sedan") ||
    q.includes("suv") ||
    q.includes("truck") ||
    q.includes("mileage") ||
    q.includes("insurance") ||
    q.includes("registration") ||
    q.includes("service") ||
    q.includes("mechanic") ||
    q.includes("inspection") ||
    q.includes("plate") ||
    q.includes("toyota") ||
    q.includes("honda");

  let needExpenses =
    q.includes("expense") ||
    q.includes("spend") ||
    q.includes("spent") ||
    q.includes("spending") ||
    q.includes("purchase") ||
    q.includes("bought") ||
    q.includes("cost") ||
    q.includes("receipt") ||
    q.includes("shopping") ||
    q.includes("merchant");

  let needPayments =
    q.includes("payment") ||
    q.includes("pay") ||
    q.includes("bill") ||
    q.includes("due") ||
    q.includes("unpaid") ||
    q.includes("rent") ||
    q.includes("utility") ||
    q.includes("utilities") ||
    q.includes("electric") ||
    q.includes("loan") ||
    q.includes("owe");

  let needBudgets =
    q.includes("budget") ||
    q.includes("limit") ||
    q.includes("allowance") ||
    q.includes("threshold") ||
    q.includes("cap");

  let needSubscriptions =
    q.includes("subscription") ||
    q.includes("sub") ||
    q.includes("netflix") ||
    q.includes("spotify") ||
    q.includes("gym") ||
    q.includes("recurring") ||
    q.includes("membership") ||
    q.includes("renewal") ||
    q.includes("streaming") ||
    q.includes("saas");

  let needFamily =
    q.includes("family") ||
    q.includes("spouse") ||
    q.includes("husband") ||
    q.includes("wife") ||
    q.includes("child") ||
    q.includes("children") ||
    q.includes("kid") ||
    q.includes("parent") ||
    q.includes("father") ||
    q.includes("mother") ||
    q.includes("dad") ||
    q.includes("mom") ||
    q.includes("sibling") ||
    q.includes("brother") ||
    q.includes("sister") ||
    q.includes("emergency contact");

  // Multi-module intents (e.g. "What do I need to take care of this week?")
  if (q.includes("take care of") || q.includes("this week") || q.includes("action item")) {
    needReminders = true;
    needPayments = true;
    needDocuments = true;
  }

  // 3. Conversational context resolution for follow-ups (e.g. "How many days are left?", "Is it expired?")
  const isFollowUp =
    q.startsWith("how many") ||
    q.startsWith("when") ||
    q.startsWith("is it") ||
    q.startsWith("are there") ||
    q.includes("days left") ||
    q.includes("days remaining") ||
    q.includes("how much is it") ||
    q.includes("tell me more") ||
    q.includes("what about that");

  if (isFollowUp && history.length > 0) {
    // Look at last 2 turns
    const recentContext = history.slice(-2).map((h) => h.content.toLowerCase()).join(" ");

    if (recentContext.includes("vehicle") || recentContext.includes("car") || recentContext.includes("insurance") || recentContext.includes("garage")) {
      needVehicles = true;
    }
    if (recentContext.includes("document") || recentContext.includes("passport") || recentContext.includes("expiry")) {
      needDocuments = true;
    }
    if (recentContext.includes("payment") || recentContext.includes("bill") || recentContext.includes("due")) {
      needPayments = true;
    }
    if (recentContext.includes("expense") || recentContext.includes("spent")) {
      needExpenses = true;
    }
    if (recentContext.includes("subscription") || recentContext.includes("renew")) {
      needSubscriptions = true;
    }
    if (recentContext.includes("reminder") || recentContext.includes("task")) {
      needReminders = true;
    }
    if (recentContext.includes("date") || recentContext.includes("birthday") || recentContext.includes("anniversary")) {
      needImportantDates = true;
    }
  }

  // If nothing matched at all, provide common actionable modules
  const noneMatched =
    !needDocuments &&
    !needReminders &&
    !needImportantDates &&
    !needVehicles &&
    !needExpenses &&
    !needPayments &&
    !needBudgets &&
    !needSubscriptions &&
    !needFamily;

  if (noneMatched) {
    needReminders = true;
    needDocuments = true;
    needVehicles = true;
    needPayments = true;
  }

  return {
    needDocuments,
    needReminders,
    needImportantDates,
    needVehicles,
    needExpenses,
    needPayments,
    needBudgets,
    needSubscriptions,
    needFamily,
    isGeneralOverview: false,
  };
}

/**
 * Executes only the intelligently selected customer data tools,
 * binding strictly to the session-authenticated userId.
 * Assembles a clean, structured context for Gemini.
 */
export async function gatherCustomerContext(
  authenticatedUserId: string,
  userMessage: string,
  history: Array<{ role: string; content: string }> = []
): Promise<GatherContextResult> {
  const tools = createCustomerDataTools(authenticatedUserId);
  const selection = resolveRelevantTools(userMessage, history);

  // 1. Fetch user profile
  const profile = await tools.getCustomerProfile();
  const selectedTools: string[] = [];

  const contextBlocks: string[] = [];

  // Customer Profile Header
  const todayStr = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  contextBlocks.push(
    `### Customer Profile & Time Context
- **Current System Date**: ${todayStr} (All date calculations are strictly anchored to this date)
- **Customer Name**: ${profile?.displayName || "Valued Customer"}
- **Preferred Currency**: ${profile?.currency || "USD"}
- **Country / Region**: ${profile?.country || "US"}`
  );

  // 2. Parallel execution of selected tools only
  const toolPromises: Promise<any>[] = [];

  if (selection.needVehicles) {
    selectedTools.push("getMyVehicles");
    toolPromises.push(
      tools.getMyVehicles().then((res) => {
        let block = "### Vehicles (Garage)\n";
        if (res.vehicles.length === 0) {
          block += "No vehicles registered in your garage.\n";
        } else {
          block += `${res.summary}\n`;
          for (const v of res.vehicles) {
            block += `- **${v.name}** (${[v.year, v.make, v.model].filter(Boolean).join(" ") || "Vehicle"})\n`;
            if (v.licensePlate) block += `  * License Plate: ${v.licensePlate}\n`;
            if (v.mileage) block += `  * Current Mileage: ${v.mileage.toLocaleString()} km\n`;
            if (v.insuranceExpiry) {
              const diffStr = v.insuranceDaysRemaining !== null
                ? v.insuranceDaysRemaining >= 0
                  ? `${v.insuranceDaysRemaining} day(s) remaining`
                  : `Expired ${Math.abs(v.insuranceDaysRemaining)} day(s) ago`
                : "";
              block += `  * Insurance Expiry: ${v.insuranceExpiry} (Status: ${v.insuranceStatus.toUpperCase()}${diffStr ? `, ${diffStr}` : ""})\n`;
            } else {
              block += "  * Insurance Expiry: Not recorded\n";
            }
            if (v.registrationExpiry) {
              const regDiffStr = v.registrationDaysRemaining !== null
                ? v.registrationDaysRemaining >= 0
                  ? `${v.registrationDaysRemaining} day(s) remaining`
                  : `Expired ${Math.abs(v.registrationDaysRemaining)} day(s) ago`
                : "";
              block += `  * Registration Expiry: ${v.registrationExpiry} (Status: ${v.registrationStatus.toUpperCase()}${regDiffStr ? `, ${regDiffStr}` : ""})\n`;
            }
            if (v.nextServiceDate) {
              block += `  * Next Service: ${v.nextServiceDate} (Status: ${v.serviceStatus.toUpperCase()})\n`;
            }
          }
        }
        return block;
      })
    );
  }

  if (selection.needDocuments) {
    selectedTools.push("getMyDocuments");
    toolPromises.push(
      tools.getMyDocuments().then((res) => {
        let block = "### Documents & Expirations\n";
        if (res.documents.length === 0) {
          block += "No documents uploaded in your account.\n";
        } else {
          block += `${res.summary}\n`;
          for (const d of res.documents) {
            let expStr = "No expiration date";
            if (d.expiryDate) {
              const diff = d.daysUntilExpiry !== null
                ? d.daysUntilExpiry >= 0
                  ? `${d.daysUntilExpiry} days remaining`
                  : `Expired ${Math.abs(d.daysUntilExpiry)} days ago`
                : "";
              expStr = `Expires on ${d.expiryDate} (Status: ${d.status.toUpperCase()}, ${diff})`;
            }
            block += `- **${d.title}** (Category: ${d.category}${d.documentNumber ? `, Number: ${d.documentNumber}` : ""}) - ${expStr}\n`;
          }
        }
        return block;
      })
    );
  }

  if (selection.needReminders) {
    selectedTools.push("getMyReminders");
    toolPromises.push(
      tools.getMyReminders().then((res) => {
        let block = "### Reminders & Tasks\n";
        if (res.reminders.length === 0) {
          block += "No reminders recorded in your account.\n";
        } else {
          block += `${res.summary}\n`;
          for (const r of res.reminders) {
            let dueStatus = "";
            if (r.isOverdue) dueStatus = ` [OVERDUE by ${Math.abs(r.daysUntilDue)} days]`;
            else if (r.isDueToday) dueStatus = " [DUE TODAY]";
            else if (r.isDueThisWeek) dueStatus = ` [DUE THIS WEEK - in ${r.daysUntilDue} days]`;
            else dueStatus = ` [Due in ${r.daysUntilDue} days]`;

            block += `- [${r.status.toUpperCase()}] **${r.title}** (Due: ${r.dueDateFormatted}${dueStatus}, Priority: ${r.priority}, Category: ${r.category})\n`;
            if (r.description) block += `  * Note: ${r.description}\n`;
          }
        }
        return block;
      })
    );
  }

  if (selection.needPayments) {
    selectedTools.push("getMyPayments");
    toolPromises.push(
      tools.getMyPayments().then((res) => {
        let block = "### Payments & Bills\n";
        if (res.payments.length === 0) {
          block += "No payment or bill records found in your account.\n";
        } else {
          block += `${res.summary}\n`;
          if (res.overduePayments.length > 0) {
            block += "#### Overdue Bills (Action Required):\n";
            for (const p of res.overduePayments) {
              block += `- [OVERDUE] **${p.title}**: ${p.currency} ${p.amount.toFixed(2)} (Was due on ${p.dueDateFormatted}, Overdue by ${Math.abs(p.daysUntilDue)} days)\n`;
            }
          }
          if (res.upcomingPayments.length > 0) {
            block += "#### Upcoming Due Payments:\n";
            for (const p of res.upcomingPayments) {
              block += `- [UNPAID] **${p.title}**: ${p.currency} ${p.amount.toFixed(2)} (Due: ${p.dueDateFormatted}, in ${p.daysUntilDue} days)\n`;
            }
          }
        }
        return block;
      })
    );
  }

  if (selection.needExpenses) {
    selectedTools.push("getMyExpenses");
    toolPromises.push(
      tools.getMyExpenses().then((res) => {
        let block = "### Expenses & Spending\n";
        if (res.expenses.length === 0) {
          block += "No expenses logged in your account.\n";
        } else {
          block += `${res.summary}\n`;
          if (Object.keys(res.categoryBreakdown).length > 0) {
            block += "#### Spending by Category:\n";
            for (const [cat, amt] of Object.entries(res.categoryBreakdown)) {
              block += `- **${cat}**: ${res.currency} ${amt.toFixed(2)}\n`;
            }
          }
          block += "#### Recent Transactions:\n";
          for (const e of res.expenses.slice(0, 8)) {
            block += `- **${e.title}**: ${e.currency} ${e.amount.toFixed(2)} on ${e.spentAtFormatted} (${e.category}${e.merchant ? `, at ${e.merchant}` : ""})\n`;
          }
        }
        return block;
      })
    );
  }

  if (selection.needBudgets) {
    selectedTools.push("getMyBudgets");
    toolPromises.push(
      tools.getMyBudgets().then((res) => {
        let block = "### Budgets\n";
        if (res.budgets.length === 0) {
          block += "No budgets configured in your account.\n";
        } else {
          block += `${res.summary}\n`;
          for (const b of res.budgets) {
            let status = "Healthy";
            if (b.isOverBudget) status = "OVER BUDGET";
            else if (b.isNearLimit) status = `Near Limit (${b.percentageUsed}% used)`;

            block += `- **${b.category}**: Limit ${b.currency} ${b.limitAmount.toFixed(2)} / ${b.period} (Spent: ${b.currency} ${b.spentAmount.toFixed(2)}, Remaining: ${b.currency} ${b.remainingAmount.toFixed(2)}, Status: ${status})\n`;
          }
        }
        return block;
      })
    );
  }

  if (selection.needSubscriptions) {
    selectedTools.push("getMySubscriptions");
    toolPromises.push(
      tools.getMySubscriptions().then((res) => {
        let block = "### Subscriptions & Recurring Commitments\n";
        if (res.subscriptions.length === 0) {
          block += "No subscriptions tracked in your account.\n";
        } else {
          block += `${res.summary}\n`;
          for (const s of res.subscriptions) {
            const renewalStr = s.nextBillingDateFormatted
              ? `Next billing: ${s.nextBillingDateFormatted}${s.daysUntilRenewal !== null ? ` (in ${s.daysUntilRenewal} days)` : ""}`
              : "No billing date set";
            block += `- **${s.name}**: ${s.currency} ${s.cost.toFixed(2)} / ${s.billingCycle} (Status: ${s.renewalStatus}, ${renewalStr})\n`;
          }
        }
        return block;
      })
    );
  }

  if (selection.needImportantDates) {
    selectedTools.push("getMyImportantDates");
    toolPromises.push(
      tools.getMyImportantDates().then((res) => {
        let block = "### Important Dates & Milestones\n";
        if (res.importantDates.length === 0) {
          block += "No important dates recorded in your account.\n";
        } else {
          block += `${res.summary}\n`;
          for (const d of res.importantDates) {
            const daysStr = d.daysUntilEvent >= 0
              ? `in ${d.daysUntilEvent} day(s)`
              : `${Math.abs(d.daysUntilEvent)} days ago`;
            block += `- **${d.title}**: ${d.eventDateFormatted} (${daysStr}, Category: ${d.category}, Recurrence: ${d.recurrence})\n`;
          }
        }
        return block;
      })
    );
  }

  if (selection.needFamily) {
    selectedTools.push("getMyFamily");
    toolPromises.push(
      tools.getMyFamily().then((res) => {
        let block = "### Family Circle\n";
        if (res.memberCount === 0 && res.groupCount === 0) {
          block += "No family members or groups configured in your account.\n";
        } else {
          block += `${res.summary}\n`;
          for (const m of res.members) {
            block += `- **${m.name}** (${m.relationship}${m.emergencyContact ? ", Designated Emergency Contact" : ""})\n`;
          }
          for (const g of res.groups) {
            block += `\n**Group: ${g.name}** (${g.memberCount} members):\n`;
            for (const gm of g.members) {
              block += `  * ${gm.name} (Role: ${gm.role}${gm.email ? `, ${gm.email}` : ""})\n`;
            }
          }
        }
        return block;
      })
    );
  }

  // Await parallel tool executions
  const resolvedBlocks = await Promise.all(toolPromises);
  contextBlocks.push(...resolvedBlocks);

  return {
    contextText: contextBlocks.join("\n\n"),
    selectedTools,
    profile,
  };
}
