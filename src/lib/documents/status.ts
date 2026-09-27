// Smart Life Manager - Document Status & Expiry Logic
// Rules:
// - More than 30 days = VALID
// - 8–30 days = EXPIRING SOON
// - 1–7 days = CRITICAL
// - Past expiry = EXPIRED
// Exact human-readable countdown text:
// - “Expires in 24 days”
// - “Expires in 3 days”
// - “Expired 5 days ago”
// - “Expires today” / “Expired yesterday”

export type DocumentStatusCode = "VALID" | "EXPIRING_SOON" | "CRITICAL" | "EXPIRED";

export interface DocumentStatusInfo {
  status: DocumentStatusCode;
  label: "VALID" | "EXPIRING SOON" | "CRITICAL" | "EXPIRED";
  countdownText: string;
  daysRemaining: number | null;
  badgeVariant: "success" | "warning" | "danger" | "neutral";
  urgencyLevel: 0 | 1 | 2 | 3; // 0 = valid, 1 = expiring soon, 2 = critical, 3 = expired
}

/**
 * Calculates document status based strictly on calendar day differences.
 * Time parts are stripped to prevent hour-of-day edge cases.
 */
export function calculateDocumentStatus(
  expiryDateInput: Date | string | null | undefined,
  referenceDateInput?: Date | string
): DocumentStatusInfo {
  if (!expiryDateInput) {
    return {
      status: "VALID",
      label: "VALID",
      countdownText: "No Expiry Date",
      daysRemaining: null,
      badgeVariant: "neutral",
      urgencyLevel: 0,
    };
  }

  const expDate = new Date(expiryDateInput);
  if (isNaN(expDate.getTime())) {
    return {
      status: "VALID",
      label: "VALID",
      countdownText: "No Expiry Date",
      daysRemaining: null,
      badgeVariant: "neutral",
      urgencyLevel: 0,
    };
  }

  const refDate = referenceDateInput ? new Date(referenceDateInput) : new Date();

  // Strip hours/minutes to get clean calendar day difference in local/UTC
  const startOfRef = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate());
  const startOfExp = new Date(expDate.getFullYear(), expDate.getMonth(), expDate.getDate());

  const diffMs = startOfExp.getTime() - startOfRef.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const daysAgo = Math.abs(diffDays);
    const countdownText = daysAgo === 1 ? "Expired yesterday" : `Expired ${daysAgo} days ago`;
    return {
      status: "EXPIRED",
      label: "EXPIRED",
      countdownText,
      daysRemaining: diffDays,
      badgeVariant: "danger",
      urgencyLevel: 3,
    };
  }

  if (diffDays === 0) {
    return {
      status: "CRITICAL",
      label: "CRITICAL",
      countdownText: "Expires today",
      daysRemaining: 0,
      badgeVariant: "danger",
      urgencyLevel: 2,
    };
  }

  if (diffDays >= 1 && diffDays <= 7) {
    const countdownText = diffDays === 1 ? "Expires tomorrow" : `Expires in ${diffDays} days`;
    return {
      status: "CRITICAL",
      label: "CRITICAL",
      countdownText,
      daysRemaining: diffDays,
      badgeVariant: "danger",
      urgencyLevel: 2,
    };
  }

  if (diffDays >= 8 && diffDays <= 30) {
    return {
      status: "EXPIRING_SOON",
      label: "EXPIRING SOON",
      countdownText: `Expires in ${diffDays} days`,
      daysRemaining: diffDays,
      badgeVariant: "warning",
      urgencyLevel: 1,
    };
  }

  // More than 30 days
  return {
    status: "VALID",
    label: "VALID",
    countdownText: `Expires in ${diffDays} days`,
    daysRemaining: diffDays,
    badgeVariant: "success",
    urgencyLevel: 0,
  };
}
