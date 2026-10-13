import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; itineraryId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const { id: tripId, itineraryId } = await params;

  try {
    const existing = await prisma.tripItinerary.findFirst({
      where: { id: itineraryId, tripId, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Itinerary item not found" } },
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
      category,
      notes,
    } = body;

    const updated = await prisma.tripItinerary.update({
      where: { id: itineraryId },
      data: {
        ...(dayDate !== undefined && { dayDate: new Date(dayDate) }),
        ...(timeSlot !== undefined && { timeSlot: timeSlot || null }),
        ...(activity !== undefined && { activity: activity.trim() }),
        ...(location !== undefined && { location: location?.trim() || null }),
        ...(bookingRef !== undefined && { bookingRef: bookingRef?.trim() || null }),
        ...(confirmationDetails !== undefined && { confirmationDetails: confirmationDetails?.trim() || null }),
        ...(cost !== undefined && { cost: cost !== null ? parseFloat(cost) : null }),
        ...(category !== undefined && { category }),
        ...(notes !== undefined && { notes: notes?.trim() || null }),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("[Trip Itinerary PUT Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to update itinerary item" } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; itineraryId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const { id: tripId, itineraryId } = await params;

  try {
    const existing = await prisma.tripItinerary.findFirst({
      where: { id: itineraryId, tripId, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Itinerary item not found" } },
        { status: 404 }
      );
    }

    await prisma.tripItinerary.delete({
      where: { id: itineraryId },
    });

    return NextResponse.json({ success: true, message: "Itinerary item deleted" });
  } catch (error) {
    console.error("[Trip Itinerary DELETE Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to delete itinerary item" } },
      { status: 500 }
    );
  }
}
