import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { executeGlobalSearch, SearchCategory } from "@/lib/search/search-service";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();
  const category = (searchParams.get("category") || "all").trim().toLowerCase() as SearchCategory;

  const validCategories: SearchCategory[] = [
    "all",
    "documents",
    "reminders",
    "payments",
    "expenses",
    "vehicles",
    "subscriptions",
    "dates",
  ];

  const selectedCategory = validCategories.includes(category) ? category : "all";

  try {
    const searchResults = await executeGlobalSearch(user.id, q, selectedCategory);

    return NextResponse.json({
      success: true,
      data: searchResults,
    });
  } catch (error) {
    console.error("[Global Search GET Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SEARCH_FAILED", message: "Failed to perform search" } },
      { status: 500 }
    );
  }
}
