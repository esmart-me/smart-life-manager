// src/app/api/ai/conversations/route.ts
// Handles listing, creating, and clearing conversations for the authenticated user.
// Strictly scopes all queries to user.id.

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
    const conversations = await prisma.aiConversation.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: {
          select: { messages: true },
        },
      },
    });

    const data = conversations.map((c) => ({
      id: c.id,
      title: c.title,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      messageCount: c._count.messages,
    }));

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error("[AiConversations API] Error fetching conversations:", error?.message || error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to fetch conversations" } },
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
    let title = "New Conversation";
    try {
      const body = await request.json();
      if (body?.title && typeof body.title === "string") {
        title = body.title.trim().slice(0, 100) || "New Conversation";
      }
    } catch {
      // Body is optional
    }

    const conversation = await prisma.aiConversation.create({
      data: {
        userId: user.id,
        title,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: conversation.id,
        title: conversation.title,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        messageCount: 0,
      },
    });
  } catch (error: any) {
    console.error("[AiConversations API] Error creating conversation:", error?.message || error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to create conversation" } },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  try {
    const result = await prisma.aiConversation.deleteMany({
      where: { userId: user.id },
    });

    return NextResponse.json({
      success: true,
      data: { deletedCount: result.count },
    });
  } catch (error: any) {
    console.error("[AiConversations API] Error deleting conversations:", error?.message || error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to delete conversations" } },
      { status: 500 }
    );
  }
}
