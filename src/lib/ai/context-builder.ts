// src/lib/ai/context-builder.ts
// Secure, customer-isolated context builder for Smart Life Manager AI Assistant.
// Strictly queries only records belonging to the authenticated userId.
// Leverages intelligent tool selection and secure customer data tools.

import { gatherCustomerContext, resolveRelevantTools } from "./intelligent-selector";
export { createCustomerDataTools } from "./customer-tools";
export { gatherCustomerContext, resolveRelevantTools };

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
 * Backward-compatible helper used across test suites and diagnostic utilities.
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
 * Executes intelligent tool selection and gathers only authorized data belonging to `userId`.
 */
export async function buildCustomerContext(
  userId: string,
  userQuery: string,
  history: Array<{ role: string; content: string }> = []
): Promise<string> {
  const result = await gatherCustomerContext(userId, userQuery, history);
  return result.contextText;
}
