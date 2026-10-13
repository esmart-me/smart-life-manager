import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export async function GET(
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
    const note = await prisma.knowledgeNote.findFirst({
      where: { id, userId: user.id },
      include: {
        collection: true,
      },
    });

    if (!note) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Note not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: note });
  } catch (error) {
    console.error("[Knowledge Note GET Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to fetch note" } },
      { status: 500 }
    );
  }
}

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
    const existing = await prisma.knowledgeNote.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Note not found" } },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      title,
      content,
      collectionId,
      tags,
      isPinned,
      isFavorite,
      isArchived,
      sourceUrl,
      attachmentName,
    } = body;

    const updated = await prisma.knowledgeNote.update({
      where: { id },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(content !== undefined && { content: content?.trim() || "" }),
        ...(collectionId !== undefined && { collectionId: collectionId || null }),
        ...(tags !== undefined && { tags: tags?.trim() || null }),
        ...(isPinned !== undefined && { isPinned: Boolean(isPinned) }),
        ...(isFavorite !== undefined && { isFavorite: Boolean(isFavorite) }),
        ...(isArchived !== undefined && { isArchived: Boolean(isArchived) }),
        ...(sourceUrl !== undefined && { sourceUrl: sourceUrl?.trim() || null }),
        ...(attachmentName !== undefined && { attachmentName: attachmentName?.trim() || null }),
      },
      include: {
        collection: {
          select: { id: true, name: true, color: true },
        },
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("[Knowledge Note PUT Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to update note" } },
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
    const existing = await prisma.knowledgeNote.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Note not found" } },
        { status: 404 }
      );
    }

    await prisma.knowledgeNote.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Note deleted successfully" });
  } catch (error) {
    console.error("[Knowledge Note DELETE Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to delete note" } },
      { status: 500 }
    );
  }
}
