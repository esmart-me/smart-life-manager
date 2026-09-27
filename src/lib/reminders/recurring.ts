// Smart Life Manager - Recurring Reminders Advancement Engine

/**
 * Calculates the next due date based on a recurrence rule.
 * Ensures the next date is in the future relative to either referenceDate or currentDueDate.
 */
export function calculateNextDueDate(
  currentDueDate: Date | string,
  recurrenceRule: string,
  referenceDate: Date = new Date()
): Date {
  const current = new Date(currentDueDate);
  let next = new Date(current);

  const rule = (recurrenceRule || "").trim().toLowerCase();

  // Helper advancement function
  const advanceOnce = (date: Date): Date => {
    const result = new Date(date);
    if (rule === "daily") {
      result.setDate(result.getDate() + 1);
    } else if (rule === "weekly") {
      result.setDate(result.getDate() + 7);
    } else if (rule === "monthly") {
      result.setMonth(result.getMonth() + 1);
    } else if (rule === "yearly") {
      result.setFullYear(result.getFullYear() + 1);
    } else if (rule.startsWith("custom:")) {
      const parts = rule.split(":");
      const interval = Math.max(1, parseInt(parts[1], 10) || 1);
      const unit = parts[2] || "days";

      if (unit.startsWith("day")) {
        result.setDate(result.getDate() + interval);
      } else if (unit.startsWith("week")) {
        result.setDate(result.getDate() + interval * 7);
      } else if (unit.startsWith("month")) {
        result.setMonth(result.getMonth() + interval);
      } else if (unit.startsWith("year")) {
        result.setFullYear(result.getFullYear() + interval);
      } else {
        result.setDate(result.getDate() + interval);
      }
    } else {
      // Default fallback: daily
      result.setDate(result.getDate() + 1);
    }
    return result;
  };

  // Advance at least once
  next = advanceOnce(next);

  // If the next calculated occurrence is still in the past, keep advancing until it is strictly in the future
  let safetyLoop = 0;
  while (next.getTime() <= referenceDate.getTime() && safetyLoop < 1000) {
    next = advanceOnce(next);
    safetyLoop++;
  }

  return next;
}

/**
 * Formats a recurrence rule into human-readable label.
 */
export function formatRecurrenceLabel(rule: string | null | undefined): string {
  if (!rule || rule === "none" || rule === "one_time") {
    return "One-time";
  }

  const clean = rule.trim().toLowerCase();
  if (clean === "daily") return "Repeats daily";
  if (clean === "weekly") return "Repeats weekly";
  if (clean === "monthly") return "Repeats monthly";
  if (clean === "yearly") return "Repeats yearly";

  if (clean.startsWith("custom:")) {
    const parts = clean.split(":");
    const count = parseInt(parts[1], 10) || 1;
    const unit = parts[2] || "days";
    const unitLabel = count === 1 ? unit.replace(/s$/, "") : unit;
    return `Repeats every ${count} ${unitLabel}`;
  }

  if (clean.startsWith("doc_expiry_")) {
    const days = clean.replace("doc_expiry_", "").replace("d", "");
    return `Milestone (${days} days before expiry)`;
  }

  return `Repeats (${clean})`;
}
