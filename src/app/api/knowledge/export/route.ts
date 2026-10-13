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

  try {
    const [collections, notes] = await Promise.all([
      prisma.knowledgeCollection.findMany({
        where: { userId: user.id },
      }),
      prisma.knowledgeNote.findMany({
        where: { userId: user.id },
        include: {
          collection: {
            select: { name: true },
          },
        },
      }),
    ]);

    const exportData = {
      exportVersion: "1.0.0",
      exportedAt: new Date().toISOString(),
      userEmail: user.email,
      collectionsCount: collections.length,
      notesCount: notes.length,
      collections: collections.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        color: c.color,
        icon: c.icon,
      })),
      notes: notes.map((n) => ({
        id: n.id,
        title: n.title,
        content: n.content,
        collectionName: n.collection?.name || null,
        tags: n.tags ? n.tags.split(",").map((t) => t.trim()) : [],
        isPinned: n.isPinned,
        isFavorite: n.isFavorite,
        isArchived: n.isArchived,
        sourceUrl: n.sourceUrl,
        attachmentName: n.attachmentName,
        createdAt: n.createdAt.toISOString(),
        updatedAt: n.updatedAt.toISOString(),
      })),
    };

    return new Response(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="smart-life-knowledge-${new Date().toISOString().split("T")[0]}.json"`,
      },
    });
  } catch (error) {
    console.error("[Knowledge Export Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to export knowledge notes" } },
      { status: 500 }
    );
  }
}
