import { NextRequest, NextResponse } from "next/server";
import { searchLieux } from "@/lib/data/lieux";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q");

  if (!q || q.trim().length < 2) {
    return NextResponse.json({ success: true, data: [] });
  }

  try {
    const results = await searchLieux(q, 10);
    return NextResponse.json({ success: true, data: results });
  } catch (err) {
    console.error("[GET /api/search] Error:", err);
    return NextResponse.json(
      { success: false, error: "Search failed" },
      { status: 500 }
    );
  }
}
