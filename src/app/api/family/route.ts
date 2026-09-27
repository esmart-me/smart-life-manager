import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import {
  getOrCreateFamilyGroup,
  addFamilyMemberToGroup,
} from "@/lib/family/family-service";
import { getUserPlanSummary, checkFeatureAccess } from "@/lib/plans/plan-service";
import { FamilyRole } from "@/lib/plans/constants";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  try {
    const [group, planSummary] = await Promise.all([
      getOrCreateFamilyGroup(user.id),
      getUserPlanSummary(user.id),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        familyGroup: group,
        members: group.members,
        planSummary,
      },
    });
  } catch (error) {
    console.error("[Family GET Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to fetch family group" } },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const {
      name,
      email,
      role = "Member",
      canViewDocuments,
      canEditDocuments,
      canViewFinance,
      canEditFinance,
      canViewVehicles,
      canEditVehicles,
    } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Member name is required" },
        },
        { status: 400 }
      );
    }

    const validRoles: FamilyRole[] = ["Owner", "Admin", "Member", "View Only"];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: `Role must be one of: ${validRoles.join(", ")}`,
          },
        },
        { status: 400 }
      );
    }

    // Check plan access limit for family
    const accessCheck = await checkFeatureAccess(user.id, "add_family_member");
    if (!accessCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "LIMIT_REACHED",
            message: accessCheck.reason,
            requiredPlan: accessCheck.requiredPlan,
          },
        },
        { status: 403 }
      );
    }

    const member = await addFamilyMemberToGroup(user.id, {
      name: name.trim(),
      email: email ? email.trim() : undefined,
      role,
      canViewDocuments,
      canEditDocuments,
      canViewFinance,
      canEditFinance,
      canViewVehicles,
      canEditVehicles,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          message: `${member.name} added to Family Circle`,
          member,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[Family POST Error]:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "SERVER_ERROR", message: error.message || "Failed to add family member" },
      },
      { status: 500 }
    );
  }
}
