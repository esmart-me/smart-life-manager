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
    const events = await prisma.familyEvent.findMany({
      where: { userId: user.id },
      include: {
        familyMember: {
          select: { id: true, name: true, relationship: true },
        },
      },
      orderBy: { eventDate: "asc" },
    });

    return NextResponse.json({ success: true, data: events });
  } catch (error) {
    console.error("[Family Events GET Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to fetch family events" } },
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
      description,
      eventDate,
      endDate,
      startTime,
      endTime,
      location,
      category = "general",
      isAllDay = false,
      familyMemberId,
      notes,
    } = body;

    if (!title || !title.trim() || !eventDate) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "Title and eventDate are required" } },
        { status: 400 }
      );
    }

    const event = await prisma.familyEvent.create({
      data: {
        userId: user.id,
        title: title.trim(),
        description: description?.trim() || null,
        eventDate: new Date(eventDate),
        endDate: endDate ? new Date(endDate) : null,
        startTime: startTime || null,
        endTime: endTime || null,
        location: location?.trim() || null,
        category,
        isAllDay: Boolean(isAllDay),
        familyMemberId: familyMemberId || null,
        notes: notes?.trim() || null,
      },
      include: {
        familyMember: {
          select: { id: true, name: true, relationship: true },
        },
      },
    });

    return NextResponse.json({ success: true, data: event }, { status: 201 });
  } catch (error) {
    console.error("[Family Event POST Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to create family event" } },
      { status: 500 }
    );
  }
}
