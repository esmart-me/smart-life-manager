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

  const { searchParams } = new URL(request.url);
  const collectionId = searchParams.get("collectionId");
  const isFavorite = searchParams.get("favorite");
  const isPinned = searchParams.get("pinned");
  const isArchived = searchParams.get("archived");
  const q = searchParams.get("q")?.trim();

  try {
    const where: any = {
      userId: user.id,
      ...(collectionId ? { collectionId } : {}),
      ...(isFavorite === "true" ? { isFavorite: true } : {}),
      ...(isPinned === "true" ? { isPinned: true } : {}),
      ...(isArchived !== null && isArchived !== undefined
        ? { isArchived: isArchived === "true" }
        : { isArchived: false }),
    };

    if (q) {
      where.OR = [
        { title: { contains: q } },
        { content: { contains: q } },
        { tags: { contains: q } },
      ];
    }

    const notes = await prisma.knowledgeNote.findMany({
      where,
      include: {
        collection: {
          select: { id: true, name: true, color: true },
        },
      },
      orderBy: [
        { isPinned: "desc" },
        { updatedAt: "desc" },
      ],
    });

    return NextResponse.json({ success: true, data: notes });
  } catch (error) {
    console.error("[Knowledge Notes GET Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to fetch notes" } },
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
      content,
      collectionId,
      tags,
      isPinned = false,
      isFavorite = false,
      sourceUrl,
      attachmentName,
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "Note title is required" } },
        { status: 400 }
      );
    }

    const note = await prisma.knowledgeNote.create({
      data: {
        userId: user.id,
        title: title.trim(),
        content: content?.trim() || "",
        collectionId: collectionId || null,
        tags: tags?.trim() || null,
        isPinned: Boolean(isPinned),
        isFavorite: Boolean(isFavorite),
        sourceUrl: sourceUrl?.trim() || null,
        attachmentName: attachmentName?.trim() || null,
      },
      include: {
        collection: {
          select: { id: true, name: true, color: true },
        },
      },
    });

    return NextResponse.json({ success: true, data: note }, { status: 201 });
  } catch (error) {
    console.error("[Knowledge Note POST Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to create note" } },
      { status: 500 }
    );
  }
}
