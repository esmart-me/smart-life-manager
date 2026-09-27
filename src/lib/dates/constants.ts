/**
 * Important Dates Categories and Constants
 */

export const IMPORTANT_DATE_CATEGORIES = [
  { value: "birthday", label: "Birthday" },
  { value: "anniversary", label: "Anniversary" },
  { value: "wedding", label: "Wedding" },
  { value: "renewal", label: "Renewal" },
  { value: "custom", label: "Custom Date" },
] as const;

export type ImportantDateCategory = (typeof IMPORTANT_DATE_CATEGORIES)[number]["value"];
