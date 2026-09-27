import { prisma } from "@/lib/db/prisma";
import { FamilyRole } from "@/lib/plans/constants";

export interface CreateFamilyMemberPayload {
  name: string;
  email?: string;
  role: FamilyRole;
  canViewDocuments?: boolean;
  canEditDocuments?: boolean;
  canViewFinance?: boolean;
  canEditFinance?: boolean;
  canViewVehicles?: boolean;
  canEditVehicles?: boolean;
}

/**
 * Gets or creates the owner's primary FamilyGroup.
 */
export async function getOrCreateFamilyGroup(ownerId: string, groupName: string = "My Family Circle") {
  let group = await prisma.familyGroup.findFirst({
    where: { ownerId },
    include: {
      members: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!group) {
    const ownerUser = await prisma.user.findUnique({
      where: { id: ownerId },
      include: { profile: true },
    });

    const ownerName =
      ownerUser?.profile?.displayName ||
      ownerUser?.profile?.firstName ||
      ownerUser?.email.split("@")[0] ||
      "Owner";

    group = await prisma.familyGroup.create({
      data: {
        name: groupName,
        ownerId,
        members: {
          create: {
            userId: ownerId,
            name: `${ownerName} (You)`,
            email: ownerUser?.email,
            role: "Owner",
            canViewDocuments: true,
            canEditDocuments: true,
            canViewFinance: true,
            canEditFinance: true,
            canViewVehicles: true,
            canEditVehicles: true,
            status: "active",
          },
        },
      },
      include: {
        members: {
          orderBy: { createdAt: "asc" },
        },
      },
    });
  }

  return group;
}

/**
 * Adds a new family member to the user's group with specific roles and permissions.
 */
export async function addFamilyMemberToGroup(ownerId: string, payload: CreateFamilyMemberPayload) {
  const group = await getOrCreateFamilyGroup(ownerId);

  // Set default permissions based on role
  const isViewOnly = payload.role === "View Only";
  const isAdmin = payload.role === "Admin" || payload.role === "Owner";

  const member = await prisma.familyGroupMember.create({
    data: {
      familyGroupId: group.id,
      name: payload.name.trim(),
      email: payload.email ? payload.email.trim() : null,
      role: payload.role,
      canViewDocuments: payload.canViewDocuments ?? true,
      canEditDocuments: isViewOnly ? false : payload.canEditDocuments ?? isAdmin,
      canViewFinance: payload.canViewFinance ?? isAdmin,
      canEditFinance: isViewOnly ? false : payload.canEditFinance ?? isAdmin,
      canViewVehicles: payload.canViewVehicles ?? true,
      canEditVehicles: isViewOnly ? false : payload.canEditVehicles ?? isAdmin,
      status: payload.email ? "invited" : "active",
    },
  });

  return member;
}

/**
 * Updates a member's role or access permissions.
 */
export async function updateFamilyMember(
  ownerId: string,
  memberId: string,
  payload: Partial<CreateFamilyMemberPayload>
) {
  const group = await getOrCreateFamilyGroup(ownerId);

  const existing = await prisma.familyGroupMember.findFirst({
    where: {
      id: memberId,
      familyGroupId: group.id,
    },
  });

  if (!existing) {
    throw new Error("Family member not found in your family circle.");
  }

  // Prevent changing the Owner role directly
  if (existing.role === "Owner" && payload.role && payload.role !== "Owner") {
    throw new Error("Cannot change the Owner role of the primary account.");
  }

  return prisma.familyGroupMember.update({
    where: { id: memberId },
    data: {
      ...(payload.name ? { name: payload.name.trim() } : {}),
      ...(payload.email !== undefined ? { email: payload.email?.trim() || null } : {}),
      ...(payload.role ? { role: payload.role } : {}),
      ...(payload.canViewDocuments !== undefined ? { canViewDocuments: payload.canViewDocuments } : {}),
      ...(payload.canEditDocuments !== undefined ? { canEditDocuments: payload.canEditDocuments } : {}),
      ...(payload.canViewFinance !== undefined ? { canViewFinance: payload.canViewFinance } : {}),
      ...(payload.canEditFinance !== undefined ? { canEditFinance: payload.canEditFinance } : {}),
      ...(payload.canViewVehicles !== undefined ? { canViewVehicles: payload.canViewVehicles } : {}),
      ...(payload.canEditVehicles !== undefined ? { canEditVehicles: payload.canEditVehicles } : {}),
    },
  });
}

/**
 * Removes a member from the family group.
 */
export async function removeFamilyMemberFromGroup(ownerId: string, memberId: string) {
  const group = await getOrCreateFamilyGroup(ownerId);

  const member = await prisma.familyGroupMember.findFirst({
    where: {
      id: memberId,
      familyGroupId: group.id,
    },
  });

  if (!member) {
    throw new Error("Member not found in your family group.");
  }

  if (member.role === "Owner") {
    throw new Error("Cannot remove the primary Family Group Owner.");
  }

  await prisma.familyGroupMember.delete({
    where: { id: memberId },
  });

  return { success: true, removedId: memberId };
}
