import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export async function PUT(
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

  const { id } = await params;

  try {
    const existing = await prisma.healthProfile.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Health profile not found" } },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      memberName,
      bloodGroup,
      height,
      weight,
      allergies,
      chronicConditions,
      medications,
      emergencyContactName,
      emergencyContactPhone,
      doctorName,
      doctorPhone,
      notes,
    } = body;

    const updated = await prisma.healthProfile.update({
      where: { id },
      data: {
        ...(memberName !== undefined ? { memberName: memberName ? String(memberName).trim() : null } : {}),
        ...(bloodGroup !== undefined ? { bloodGroup: bloodGroup ? String(bloodGroup).trim() : null } : {}),
        ...(height !== undefined ? { height: height !== null && height !== "" ? Number(height) : null } : {}),
        ...(weight !== undefined ? { weight: weight !== null && weight !== "" ? Number(weight) : null } : {}),
        ...(allergies !== undefined ? { allergies: allergies ? String(allergies).trim() : null } : {}),
        ...(chronicConditions !== undefined ? { chronicConditions: chronicConditions ? String(chronicConditions).trim() : null } : {}),
        ...(medications !== undefined ? { medications: medications ? String(medications).trim() : null } : {}),
        ...(emergencyContactName !== undefined ? { emergencyContactName: emergencyContactName ? String(emergencyContactName).trim() : null } : {}),
        ...(emergencyContactPhone !== undefined ? { emergencyContactPhone: emergencyContactPhone ? String(emergencyContactPhone).trim() : null } : {}),
        ...(doctorName !== undefined ? { doctorName: doctorName ? String(doctorName).trim() : null } : {}),
        ...(doctorPhone !== undefined ? { doctorPhone: doctorPhone ? String(doctorPhone).trim() : null } : {}),
        ...(notes !== undefined ? { notes: notes ? String(notes).trim() : null } : {}),
      },
      include: {
        familyMember: {
          select: { id: true, name: true, relationship: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: { profile: updated },
    });
  } catch (err: unknown) {
    console.error("[Update Health Profile Error]:", err);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to update health profile" } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const { id } = await params;

  try {
    const existing = await prisma.healthProfile.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Health profile not found" } },
        { status: 404 }
      );
    }

    await prisma.healthProfile.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      data: { message: "Health profile deleted successfully" },
    });
  } catch (err: unknown) {
    console.error("[Delete Health Profile Error]:", err);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to delete health profile" } },
      { status: 500 }
    );
  }
}
