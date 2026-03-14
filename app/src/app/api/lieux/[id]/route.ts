import { NextRequest, NextResponse } from "next/server";
import { getLieuById } from "@/lib/data/lieux";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const lieu = await getLieuById(id);

    if (!lieu) {
      return NextResponse.json(
        { success: false, error: "Lieu not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: lieu });
  } catch (err) {
    console.error("[GET /api/lieux/[id]] Error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to load venue" },
      { status: 500 }
    );
  }
}
