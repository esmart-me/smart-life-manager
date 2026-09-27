import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import {
  updateFamilyMember,
  removeFamilyMemberFromGroup,
} from "@/lib/family/family-service";

export async function PATCH(
  req: Request,
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
  if (!id) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Member ID is required" } },
      { status: 400 }
    );
  }

  try {
    const body = await req.json();
    const updatedMember = await updateFamilyMember(user.id, id, body);

    return NextResponse.json({
      success: true,
      data: {
        message: "Family member permissions updated",
        member: updatedMember,
      },
    });
  } catch (error: any) {
    console.error("[Family Member PATCH Error]:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "UPDATE_FAILED", message: error.message || "Failed to update member" },
      },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _req: Request,
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
  if (!id) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Member ID is required" } },
      { status: 400 }
    );
  }

  try {
    const result = await removeFamilyMemberFromGroup(user.id, id);

    return NextResponse.json({
      success: true,
      data: {
        message: "Member removed from Family Circle",
        ...result,
      },
    });
  } catch (error: any) {
    console.error("[Family Member DELETE Error]:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "DELETE_FAILED", message: error.message || "Failed to remove member" },
      },
      { status: 400 }
    );
  }
}
