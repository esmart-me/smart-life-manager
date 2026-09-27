/**
 * Vehicle Constants and Maintenance Types
 */

export const VEHICLE_REMINDER_TYPES = [
  { value: "insurance", label: "Insurance Renewal" },
  { value: "registration", label: "Registration / Mulkiya Renewal" },
  { value: "service", label: "Periodic Maintenance Service" },
  { value: "oil_change", label: "Engine Oil Change" },
  { value: "tyres", label: "Tyre Inspection & Replacement" },
  { value: "battery", label: "Battery Check & Replacement" },
] as const;

export type VehicleReminderType = (typeof VEHICLE_REMINDER_TYPES)[number]["value"];

export const VEHICLE_ALERT_THRESHOLDS = {
  CRITICAL_DAYS: 7,
  EXPIRING_SOON_DAYS: 30,
  SERVICE_KM_THRESHOLD: 1000,
};
