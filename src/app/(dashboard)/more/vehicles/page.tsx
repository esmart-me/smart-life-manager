import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { calculateVehicleAlerts } from "@/lib/vehicles/status";
import { VehicleListClient, VehicleRecord } from "@/components/vehicles/VehicleListClient";

export const dynamic = "force-dynamic";

export default async function VehiclesPage() {
  const user = await requireUser();

  const rawVehicles = await prisma.vehicle.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  const now = new Date();
  const vehicles: VehicleRecord[] = rawVehicles.map((v) => {
    const statusSummary = calculateVehicleAlerts(v, now);
    return {
      id: v.id,
      name: v.name,
      make: v.make,
      model: v.model,
      year: v.year,
      licensePlate: v.licensePlate,
      vin: v.vin,
      mileage: v.mileage,
      nextServiceMileage: v.nextServiceMileage,
      insuranceExpiry: v.insuranceExpiry ? v.insuranceExpiry.toISOString() : null,
      registrationExpiry: v.registrationExpiry ? v.registrationExpiry.toISOString() : null,
      nextServiceDate: v.nextServiceDate ? v.nextServiceDate.toISOString() : null,
      notes: v.notes,
      statusSummary,
    };
  });

  return <VehicleListClient initialVehicles={vehicles} />;
}
