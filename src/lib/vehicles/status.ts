import { PrismaClient } from "@prisma/client";
import { VEHICLE_ALERT_THRESHOLDS } from "./constants";

export interface VehicleAlert {
  type: "insurance" | "registration" | "service" | "mileage";
  urgency: "urgent" | "warning" | "info";
  title: string;
  message: string;
  dueDate?: Date | null;
  daysRemaining?: number;
}

export interface VehicleStatusSummary {
  insuranceStatus: "EXPIRED" | "EXPIRING_SOON" | "VALID" | "NOT_SET";
  registrationStatus: "EXPIRED" | "EXPIRING_SOON" | "VALID" | "NOT_SET";
  serviceStatus: "OVERDUE" | "DUE_SOON" | "VALID" | "NOT_SET";
  mileageStatus: "OVERDUE" | "DUE_SOON" | "OK" | "NOT_SET";
  alerts: VehicleAlert[];
}

export function calculateVehicleAlerts(
  vehicle: {
    id: string;
    name: string;
    insuranceExpiry?: Date | string | null;
    registrationExpiry?: Date | string | null;
    nextServiceDate?: Date | string | null;
    mileage?: number | null;
    nextServiceMileage?: number | null;
  },
  referenceDate: Date = new Date()
): VehicleStatusSummary {
  const alerts: VehicleAlert[] = [];
  const now = referenceDate.getTime();

  // 1. Insurance Status
  let insuranceStatus: VehicleStatusSummary["insuranceStatus"] = "NOT_SET";
  if (vehicle.insuranceExpiry) {
    const expDate = new Date(vehicle.insuranceExpiry);
    const diffMs = expDate.getTime() - now;
    const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (daysRemaining < 0) {
      insuranceStatus = "EXPIRED";
      alerts.push({
        type: "insurance",
        urgency: "urgent",
        title: `${vehicle.name} Insurance Expired`,
        message: `Insurance expired ${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) === 1 ? "" : "s"} ago. Renew immediately.`,
        dueDate: expDate,
        daysRemaining,
      });
    } else if (daysRemaining <= VEHICLE_ALERT_THRESHOLDS.EXPIRING_SOON_DAYS) {
      insuranceStatus = "EXPIRING_SOON";
      alerts.push({
        type: "insurance",
        urgency: daysRemaining <= VEHICLE_ALERT_THRESHOLDS.CRITICAL_DAYS ? "urgent" : "warning",
        title: `${vehicle.name} Insurance Expiring Soon`,
        message: `Insurance expires in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"}.`,
        dueDate: expDate,
        daysRemaining,
      });
    } else {
      insuranceStatus = "VALID";
    }
  }

  // 2. Registration Status
  let registrationStatus: VehicleStatusSummary["registrationStatus"] = "NOT_SET";
  if (vehicle.registrationExpiry) {
    const expDate = new Date(vehicle.registrationExpiry);
    const diffMs = expDate.getTime() - now;
    const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (daysRemaining < 0) {
      registrationStatus = "EXPIRED";
      alerts.push({
        type: "registration",
        urgency: "urgent",
        title: `${vehicle.name} Registration Expired`,
        message: `Registration expired ${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) === 1 ? "" : "s"} ago. Vehicle not legally drivable.`,
        dueDate: expDate,
        daysRemaining,
      });
    } else if (daysRemaining <= VEHICLE_ALERT_THRESHOLDS.EXPIRING_SOON_DAYS) {
      registrationStatus = "EXPIRING_SOON";
      alerts.push({
        type: "registration",
        urgency: daysRemaining <= VEHICLE_ALERT_THRESHOLDS.CRITICAL_DAYS ? "urgent" : "warning",
        title: `${vehicle.name} Registration Expiring`,
        message: `Registration expires in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"}.`,
        dueDate: expDate,
        daysRemaining,
      });
    } else {
      registrationStatus = "VALID";
    }
  }

  // 3. Service Date Status
  let serviceStatus: VehicleStatusSummary["serviceStatus"] = "NOT_SET";
  if (vehicle.nextServiceDate) {
    const serviceDate = new Date(vehicle.nextServiceDate);
    const diffMs = serviceDate.getTime() - now;
    const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (daysRemaining < 0) {
      serviceStatus = "OVERDUE";
      alerts.push({
        type: "service",
        urgency: "urgent",
        title: `${vehicle.name} Service Overdue`,
        message: `Service maintenance was due ${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) === 1 ? "" : "s"} ago.`,
        dueDate: serviceDate,
        daysRemaining,
      });
    } else if (daysRemaining <= VEHICLE_ALERT_THRESHOLDS.EXPIRING_SOON_DAYS) {
      serviceStatus = "DUE_SOON";
      alerts.push({
        type: "service",
        urgency: "warning",
        title: `${vehicle.name} Service Approaching`,
        message: `Next service due in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"}.`,
        dueDate: serviceDate,
        daysRemaining,
      });
    } else {
      serviceStatus = "VALID";
    }
  }

  // 4. Service Mileage Status
  let mileageStatus: VehicleStatusSummary["mileageStatus"] = "NOT_SET";
  if (vehicle.mileage !== null && vehicle.mileage !== undefined && vehicle.nextServiceMileage !== null && vehicle.nextServiceMileage !== undefined) {
    const diff = vehicle.nextServiceMileage - vehicle.mileage;
    if (diff <= 0) {
      mileageStatus = "OVERDUE";
      alerts.push({
        type: "mileage",
        urgency: "urgent",
        title: `${vehicle.name} Mileage Service Due`,
        message: `Current mileage (${vehicle.mileage.toLocaleString()}) has exceeded service limit (${vehicle.nextServiceMileage.toLocaleString()}).`,
      });
    } else if (diff <= VEHICLE_ALERT_THRESHOLDS.SERVICE_KM_THRESHOLD) {
      mileageStatus = "DUE_SOON";
      alerts.push({
        type: "mileage",
        urgency: "warning",
        title: `${vehicle.name} Service Mileage Approaching`,
        message: `${diff.toLocaleString()} km/mi remaining until scheduled service.`,
      });
    } else {
      mileageStatus = "OK";
    }
  }

  return {
    insuranceStatus,
    registrationStatus,
    serviceStatus,
    mileageStatus,
    alerts,
  };
}

/**
 * Reuses the existing Reminder system to synchronize vehicle reminders
 */
export async function syncVehicleReminders(
  prismaClient: any,
  userId: string,
  vehicle: {
    id: string;
    name: string;
    insuranceExpiry?: Date | null;
    registrationExpiry?: Date | null;
    nextServiceDate?: Date | null;
  }
) {
  // Helper to sync or remove a reminder for a specific sub-key
  const syncOne = async (reminderKey: string, title: string, dueDate: Date | null, priority = "high") => {
    const existing = await prismaClient.reminder.findFirst({
      where: {
        userId,
        relatedType: "vehicle",
        relatedId: `${vehicle.id}:${reminderKey}`,
      },
    });

    if (dueDate) {
      if (existing) {
        await prismaClient.reminder.update({
          where: { id: existing.id },
          data: {
            title,
            dueDate,
            priority,
            category: "vehicle",
            status: "pending",
          },
        });
      } else {
        await prismaClient.reminder.create({
          data: {
            userId,
            title,
            dueDate,
            priority,
            category: "vehicle",
            relatedType: "vehicle",
            relatedId: `${vehicle.id}:${reminderKey}`,
            status: "pending",
          },
        });
      }
    } else if (existing) {
      await prismaClient.reminder.delete({
        where: { id: existing.id },
      });
    }
  };

  // Sync Insurance
  await syncOne(
    "insurance",
    `Renew ${vehicle.name} Insurance`,
    vehicle.insuranceExpiry || null,
    "urgent"
  );

  // Sync Registration
  await syncOne(
    "registration",
    `Renew ${vehicle.name} Registration / Mulkiya`,
    vehicle.registrationExpiry || null,
    "urgent"
  );

  // Sync Service
  await syncOne(
    "service",
    `Schedule ${vehicle.name} Periodic Service`,
    vehicle.nextServiceDate || null,
    "high"
  );
}

// Convenient alias for report generator and search service
export const calculateVehicleStatus = calculateVehicleAlerts;

