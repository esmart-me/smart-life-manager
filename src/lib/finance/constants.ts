/**
 * Finance Module Constants & Types
 * Strictly aligned with Smart Life Manager specifications.
 */

export const PAYMENT_CATEGORIES = [
  "Rent",
  "Electricity",
  "Water",
  "Internet",
  "Phone",
  "Credit Card",
  "Loan EMI",
  "Insurance",
  "School Fees",
  "Subscription",
  "Other",
] as const;

export type PaymentCategory = (typeof PAYMENT_CATEGORIES)[number];

export const PAYMENT_FREQUENCIES = [
  { value: "none", label: "One-time" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
] as const;

export type PaymentFrequency = "none" | "weekly" | "monthly" | "quarterly" | "yearly";

export type PaymentStatus = "Upcoming" | "Due Today" | "Overdue" | "Paid";

export const EXPENSE_CATEGORIES = [
  "Food",
  "Shopping",
  "Transport",
  "Bills",
  "Rent",
  "Education",
  "Health",
  "Entertainment",
  "Travel",
  "Vehicle",
  "Other",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const EXPENSE_PAYMENT_METHODS = [
  "Cash",
  "Bank",
  "Credit Card",
  "Debit Card",
  "Other",
] as const;

export type ExpensePaymentMethod = (typeof EXPENSE_PAYMENT_METHODS)[number];

export const BUDGET_KEYS = {
  TOTAL: "total", // Overall monthly budget limit
  INCOME: "income", // Expected monthly income
  SAVINGS_TARGET: "savings_target", // Desired savings target
} as const;

export const BUDGET_ALERT_THRESHOLDS = {
  WARNING: 80, // Warn when spending reaches or exceeds 80%
  EXCEEDED: 100, // Alert when spending reaches or exceeds 100%
} as const;

export const ALLOWED_RECEIPT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

export const MAX_RECEIPT_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
