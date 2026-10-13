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
    const collections = await prisma.knowledgeCollection.findMany({
      where: { userId: user.id },
      include: {
        _count: {
          select: { notes: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ success: true, data: collections });
  } catch (error) {
    console.error("[Knowledge Collections GET Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to fetch collections" } },
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
    const { name, description, color = "indigo", icon } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "Collection name is required" } },
        { status: 400 }
      );
    }

    const collection = await prisma.knowledgeCollection.create({
      data: {
        userId: user.id,
        name: name.trim(),
        description: description?.trim() || null,
        color,
        icon: icon || null,
      },
      include: {
        _count: {
          select: { notes: true },
        },
      },
    });

    return NextResponse.json({ success: true, data: collection }, { status: 201 });
  } catch (error) {
    console.error("[Knowledge Collection POST Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to create collection" } },
      { status: 500 }
    );
  }
}
