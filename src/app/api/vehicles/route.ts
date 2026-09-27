import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { calculateVehicleAlerts, syncVehicleReminders } from "@/lib/vehicles/status";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  try {
    const rawVehicles = await prisma.vehicle.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    const now = new Date();
    const vehicles = rawVehicles.map((v) => {
      const statusSummary = calculateVehicleAlerts(v, now);
      return {
        ...v,
        statusSummary,
      };
    });

    return NextResponse.json({
      success: true,
      data: { vehicles, total: vehicles.length },
    });
  } catch (error) {
    console.error("[Vehicles GET Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to fetch vehicles" } },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const {
      name,
      make,
      model,
      year,
      licensePlate,
      vin,
      mileage,
      nextServiceMileage,
      insuranceExpiry,
      registrationExpiry,
      nextServiceDate,
      notes,
    } = body;

    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_NAME", message: "Vehicle name is required" } },
        { status: 400 }
      );
    }

    const cleanInsurance = insuranceExpiry ? new Date(insuranceExpiry) : null;
    const cleanRegistration = registrationExpiry ? new Date(registrationExpiry) : null;
    const cleanServiceDate = nextServiceDate ? new Date(nextServiceDate) : null;

    const vehicle = await prisma.vehicle.create({
      data: {
        userId: user.id,
        name: name.trim(),
        make: make ? String(make).trim() : null,
        model: model ? String(model).trim() : null,
        year: year ? Number(year) : null,
        licensePlate: licensePlate ? String(licensePlate).trim() : null,
        vin: vin ? String(vin).trim() : null,
        mileage: mileage !== undefined && mileage !== "" ? Number(mileage) : null,
        nextServiceMileage:
          nextServiceMileage !== undefined && nextServiceMileage !== ""
            ? Number(nextServiceMileage)
            : null,
        insuranceExpiry: cleanInsurance,
        registrationExpiry: cleanRegistration,
        nextServiceDate: cleanServiceDate,
        notes: notes ? String(notes).trim() : null,
      },
    });

    // Reuse existing reminder system
    await syncVehicleReminders(prisma, user.id, vehicle);

    const statusSummary = calculateVehicleAlerts(vehicle);

    return NextResponse.json(
      {
        success: true,
        message: "Vehicle added successfully",
        data: { vehicle: { ...vehicle, statusSummary } },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[Vehicles POST Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "CREATE_FAILED", message: "Failed to create vehicle" } },
      { status: 500 }
    );
  }
}
