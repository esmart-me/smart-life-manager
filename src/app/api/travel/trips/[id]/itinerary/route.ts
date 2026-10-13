import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const { id: tripId } = await params;

  try {
    const trip = await prisma.trip.findFirst({
      where: { id: tripId, userId: user.id },
    });

    if (!trip) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Trip not found" } },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      dayDate,
      timeSlot,
      activity,
      location,
      bookingRef,
      confirmationDetails,
      cost,
      category = "activity",
      notes,
    } = body;

    if (!activity || !activity.trim() || !dayDate) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "Activity and date are required" } },
        { status: 400 }
      );
    }

    const itinerary = await prisma.tripItinerary.create({
      data: {
        tripId,
        userId: user.id,
        dayDate: new Date(dayDate),
        timeSlot: timeSlot || null,
        activity: activity.trim(),
        location: location?.trim() || null,
        bookingRef: bookingRef?.trim() || null,
        confirmationDetails: confirmationDetails?.trim() || null,
        cost: cost !== undefined && cost !== null ? parseFloat(cost) : null,
        category,
        notes: notes?.trim() || null,
      },
    });

    return NextResponse.json({ success: true, data: itinerary }, { status: 201 });
  } catch (error) {
    console.error("[Trip Itinerary POST Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to add itinerary activity" } },
      { status: 500 }
    );
  }
}
