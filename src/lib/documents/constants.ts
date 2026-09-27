// Smart Life Manager - Document Constants & Supported Types

export const DOCUMENT_TYPES = [
  "Passport",
  "National ID",
  "Emirates ID",
  "Driving Licence",
  "Visa",
  "Work Permit",
  "Vehicle Registration",
  "Insurance",
  "Education Certificate",
  "Medical Certificate",
  "Warranty",
  "Membership",
  "Other",
] as const;

export type DocumentType = typeof DOCUMENT_TYPES[number];

// Supported milestone reminder days
export const REMINDER_MILESTONES = [90, 30, 7, 1] as const;
export type ReminderMilestone = typeof REMINDER_MILESTONES[number];

export const DEFAULT_REMINDER_DAYS: ReminderMilestone[] = [30, 7, 1];

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
];

export const ALLOWED_PDF_TYPES = ["application/pdf"];

export const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB
