// src/app/api/ai/chat/route.ts
// Primary authenticated endpoint for user interaction with the AI Assistant.
// Enforces strict tenant isolation, zero-mock policy, and saves history.

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { isAiConfigured, generateAiResponse } from "@/lib/ai/gemini-service";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  // Parse and validate request payload
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "BAD_REQUEST", message: "Invalid JSON payload" } },
      { status: 400 }
    );
  }

  const message = typeof body?.message === "string" ? body.message.trim() : "";
  const conversationId =
    typeof body?.conversationId === "string" ? body.conversationId.trim() : undefined;

  if (!message) {
    return NextResponse.json(
      { success: false, error: { code: "BAD_REQUEST", message: "Message cannot be empty" } },
      { status: 400 }
    );
  }

  if (message.length > 2000) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "BAD_REQUEST", message: "Message exceeds 2000 character limit" },
      },
      { status: 400 }
    );
  }

  try {
    // 1. Resolve or verify user-owned conversation first to prevent cross-tenant tampering
    let conversation;
    if (conversationId) {
      conversation = await prisma.aiConversation.findFirst({
        where: {
          id: conversationId,
          userId: user.id, // Strictly verify tenant ownership
        },
      });

      if (!conversation) {
        return NextResponse.json(
          {
            success: false,
            error: { code: "NOT_FOUND", message: "Conversation not found or access denied" },
          },
          { status: 404 }
        );
      }
    }

    // 2. Zero-Mock Policy: If AI is not configured, inform the user cleanly with HTTP 503
    if (!isAiConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "AI_NOT_CONFIGURED",
            message:
              "AI Assistant is currently awaiting configuration. Please configure GEMINI_API_KEY in your server environment.",
          },
        },
        { status: 503 }
      );
    }

    if (!conversation) {
      const titleSnippet =
        message.length > 40 ? `${message.slice(0, 37).trim()}...` : message;
      conversation = await prisma.aiConversation.create({
        data: {
          userId: user.id,
          title: titleSnippet || "New Conversation",
        },
      });
    }

    // Retrieve previous conversation history for conversational continuity
    const previousMessages = await prisma.aiMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "asc" },
      take: 10,
      select: {
        role: true,
        content: true,
      },
    });

    // Save the user's message
    await prisma.aiMessage.create({
      data: {
        conversationId: conversation.id,
        role: "user",
        content: message,
      },
    });

    // Execute grounded AI response generation
    const result = await generateAiResponse({
      userId: user.id,
      userMessage: message,
      history: previousMessages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    });

    // Save the assistant's reply
    const assistantMsg = await prisma.aiMessage.create({
      data: {
        conversationId: conversation.id,
        role: "assistant",
        content: result.reply,
      },
    });

    // Update conversation timestamp
    await prisma.aiConversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      data: {
        reply: result.reply,
        conversationId: conversation.id,
        conversationTitle: conversation.title,
        provider: result.provider,
        model: result.model,
        messageId: assistantMsg.id,
      },
    });
  } catch (error: any) {
    console.error("[AiChat API] Error during AI conversation turn:", error?.message || error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "AI_PROCESSING_ERROR",
          message: error?.message || "Failed to generate AI response. Please try again.",
        },
      },
      { status: 500 }
    );
  }
}
