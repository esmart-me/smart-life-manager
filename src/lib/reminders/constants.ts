// Smart Life Manager - Reminders & Recurring Rules Constants

export const REMINDER_REPEAT_TYPES = [
  { id: "one_time", label: "One-time (Do not repeat)" },
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
  { id: "yearly", label: "Yearly" },
  { id: "custom", label: "Custom recurring..." },
] as const;

export type ReminderRepeatType = typeof REMINDER_REPEAT_TYPES[number]["id"];

export const REMINDER_CATEGORIES = [
  { id: "general", label: "General", example: "Important appointment" },
  { id: "financial", label: "Finance & Rent", example: "Pay rent" },
  { id: "work", label: "Work & Clients", example: "Call customer" },
  { id: "document", label: "Insurance & Renewals", example: "Renew insurance" },
  { id: "vehicle", label: "Vehicle & Transport", example: "Vehicle service" },
  { id: "personal", label: "Personal & Family", example: "Birthday" },
  { id: "health", label: "Health & Medical", example: "Doctor visit" },
] as const;

export type ReminderCategory = typeof REMINDER_CATEGORIES[number]["id"];

export const NOTIFICATION_PREFERENCES = [
  { id: "both", label: "Both (In-app + Push)" },
  { id: "in_app", label: "In-app Notification" },
  { id: "push", label: "Push Notification" },
  { id: "none", label: "None" },
] as const;

export type NotificationPreference = typeof NOTIFICATION_PREFERENCES[number]["id"];

export const REMINDER_PRIORITIES = [
  { id: "urgent", label: "Urgent", color: "rose" },
  { id: "high", label: "High", color: "amber" },
  { id: "medium", label: "Medium", color: "brand" },
  { id: "low", label: "Low", color: "slate" },
] as const;

export type ReminderPriority = typeof REMINDER_PRIORITIES[number]["id"];

export const QUICK_REMINDER_SUGGESTIONS = [
  { title: "Pay rent", category: "financial", priority: "urgent" },
  { title: "Call customer", category: "work", priority: "high" },
  { title: "Renew insurance", category: "document", priority: "high" },
  { title: "Vehicle service", category: "vehicle", priority: "medium" },
  { title: "Birthday", category: "personal", priority: "medium" },
  { title: "Important appointment", category: "health", priority: "urgent" },
] as const;
