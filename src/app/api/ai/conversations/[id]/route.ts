// src/app/api/ai/conversations/[id]/route.ts
// Handles retrieving and deleting a specific conversation for the authenticated user.
// Strictly verifies ownership (userId: user.id).

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const { id } = await context.params;

  try {
    const conversation = await prisma.aiConversation.findFirst({
      where: {
        id,
        userId: user.id, // Enforce strict tenant isolation
      },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Conversation not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: conversation,
    });
  } catch (error: any) {
    console.error("[AiConversation API] Error fetching conversation:", error?.message || error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to fetch conversation" } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const { id } = await context.params;

  try {
    const existing = await prisma.aiConversation.findFirst({
      where: {
        id,
        userId: user.id, // Strictly verify ownership before deletion
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Conversation not found" } },
        { status: 404 }
      );
    }

    await prisma.aiConversation.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      data: { message: "Conversation deleted successfully" },
    });
  } catch (error: any) {
    console.error("[AiConversation API] Error deleting conversation:", error?.message || error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to delete conversation" } },
      { status: 500 }
    );
  }
}
