import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  try {
    const profiles = await prisma.healthProfile.findMany({
      where: { userId: user.id },
      include: {
        familyMember: {
          select: { id: true, name: true, relationship: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: { profiles },
    });
  } catch (err: unknown) {
    console.error("[Get Health Profiles Error]:", err);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to retrieve health profiles" } },
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
      familyMemberId,
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

    let finalMemberName = memberName ? String(memberName).trim() : null;

    if (familyMemberId) {
      const member = await prisma.familyMember.findFirst({
        where: { id: familyMemberId, userId: user.id },
      });
      if (member) {
        finalMemberName = member.name;
      }
    }

    if (!finalMemberName && !familyMemberId) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Member name is required" } },
        { status: 400 }
      );
    }

    const profile = await prisma.healthProfile.create({
      data: {
        userId: user.id,
        familyMemberId: familyMemberId || null,
        memberName: finalMemberName,
        bloodGroup: bloodGroup ? String(bloodGroup).trim() : null,
        height: height !== undefined && height !== null && height !== "" ? Number(height) : null,
        weight: weight !== undefined && weight !== null && weight !== "" ? Number(weight) : null,
        allergies: allergies ? String(allergies).trim() : null,
        chronicConditions: chronicConditions ? String(chronicConditions).trim() : null,
        medications: medications ? String(medications).trim() : null,
        emergencyContactName: emergencyContactName ? String(emergencyContactName).trim() : null,
        emergencyContactPhone: emergencyContactPhone ? String(emergencyContactPhone).trim() : null,
        doctorName: doctorName ? String(doctorName).trim() : null,
        doctorPhone: doctorPhone ? String(doctorPhone).trim() : null,
        notes: notes ? String(notes).trim() : null,
      },
      include: {
        familyMember: {
          select: { id: true, name: true, relationship: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: { profile },
    });
  } catch (err: unknown) {
    console.error("[Create Health Profile Error]:", err);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to create health profile" } },
      { status: 500 }
    );
  }
}
