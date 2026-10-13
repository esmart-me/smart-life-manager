import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  try {
    const trips = await prisma.trip.findMany({
      where: { userId: user.id },
      include: {
        _count: {
          select: {
            itineraries: true,
            packingItems: true,
          },
        },
      },
      orderBy: { startDate: "desc" },
    });

    return NextResponse.json({ success: true, data: trips });
  } catch (error) {
    console.error("[Trips GET Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to fetch trips" } },
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
      title,
      destination,
      startDate,
      endDate,
      status = "planned",
      estimatedBudget,
      actualCost,
      currency = "USD",
      coverImage,
      notes,
    } = body;

    if (!title || !title.trim() || !destination || !destination.trim() || !startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "Title, destination, start and end dates are required" } },
        { status: 400 }
      );
    }

    const trip = await prisma.trip.create({
      data: {
        userId: user.id,
        title: title.trim(),
        destination: destination.trim(),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        status,
        estimatedBudget: estimatedBudget ? parseFloat(estimatedBudget) : null,
        actualCost: actualCost ? parseFloat(actualCost) : null,
        currency,
        coverImage: coverImage?.trim() || null,
        notes: notes?.trim() || null,
      },
    });

    return NextResponse.json({ success: true, data: trip }, { status: 201 });
  } catch (error) {
    console.error("[Trip POST Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to create trip" } },
      { status: 500 }
    );
  }
}
