import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { calculateVehicleAlerts, syncVehicleReminders } from "@/lib/vehicles/status";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const { id } = await params;

  try {
    const vehicle = await prisma.vehicle.findUnique({ where: { id } });
    if (!vehicle || vehicle.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Vehicle not found" } },
        { status: 404 }
      );
    }

    const statusSummary = calculateVehicleAlerts(vehicle);

    return NextResponse.json({
      success: true,
      data: { vehicle: { ...vehicle, statusSummary } },
    });
  } catch (error) {
    console.error("[Vehicle GET Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to fetch vehicle" } },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const { id } = await params;

  try {
    const existing = await prisma.vehicle.findUnique({ where: { id } });
    if (!existing || existing.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Vehicle not found" } },
        { status: 404 }
      );
    }

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

    const dataToUpdate: Record<string, unknown> = {};

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim() === "") {
        return NextResponse.json(
          { success: false, error: { code: "INVALID_NAME", message: "Vehicle name cannot be empty" } },
          { status: 400 }
        );
      }
      dataToUpdate.name = name.trim();
    }

    if (make !== undefined) dataToUpdate.make = make ? String(make).trim() : null;
    if (model !== undefined) dataToUpdate.model = model ? String(model).trim() : null;
    if (year !== undefined) dataToUpdate.year = year ? Number(year) : null;
    if (licensePlate !== undefined) dataToUpdate.licensePlate = licensePlate ? String(licensePlate).trim() : null;
    if (vin !== undefined) dataToUpdate.vin = vin ? String(vin).trim() : null;

    if (mileage !== undefined) {
      dataToUpdate.mileage = mileage !== "" && mileage !== null ? Number(mileage) : null;
    }
    if (nextServiceMileage !== undefined) {
      dataToUpdate.nextServiceMileage =
        nextServiceMileage !== "" && nextServiceMileage !== null ? Number(nextServiceMileage) : null;
    }

    if (insuranceExpiry !== undefined) {
      dataToUpdate.insuranceExpiry = insuranceExpiry ? new Date(insuranceExpiry) : null;
    }
    if (registrationExpiry !== undefined) {
      dataToUpdate.registrationExpiry = registrationExpiry ? new Date(registrationExpiry) : null;
    }
    if (nextServiceDate !== undefined) {
      dataToUpdate.nextServiceDate = nextServiceDate ? new Date(nextServiceDate) : null;
    }
    if (notes !== undefined) dataToUpdate.notes = notes ? String(notes).trim() : null;

    const updated = await prisma.vehicle.update({
      where: { id },
      data: dataToUpdate,
    });

    // Resync reminders
    await syncVehicleReminders(prisma, user.id, updated);

    const statusSummary = calculateVehicleAlerts(updated);

    return NextResponse.json({
      success: true,
      message: "Vehicle updated successfully",
      data: { vehicle: { ...updated, statusSummary } },
    });
  } catch (error) {
    console.error("[Vehicle PUT Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_FAILED", message: "Failed to update vehicle" } },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const { id } = await params;

  try {
    const existing = await prisma.vehicle.findUnique({ where: { id } });
    if (!existing || existing.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Vehicle not found" } },
        { status: 404 }
      );
    }

    // Cascade delete vehicle reminders
    await prisma.reminder.deleteMany({
      where: {
        userId: user.id,
        relatedType: "vehicle",
        relatedId: { startsWith: `${id}:` },
      },
    });

    await prisma.vehicle.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: "Vehicle and related reminders deleted successfully",
    });
  } catch (error) {
    console.error("[Vehicle DELETE Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "DELETE_FAILED", message: "Failed to delete vehicle" } },
      { status: 500 }
    );
  }
}
