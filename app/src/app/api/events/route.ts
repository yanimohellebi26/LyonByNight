import { NextRequest, NextResponse } from "next/server";
import { getEvents } from "@/lib/data/events";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const date = searchParams.get("date") ?? undefined;
  const type = searchParams.get("type") ?? undefined;
  const lieuId = searchParams.get("lieu_id") ?? undefined;
  const period = searchParams.get("period") as
    | "tonight"
    | "week"
    | "month"
    | undefined;

  try {
    const events = await getEvents({
      date,
      type,
      lieu_id: lieuId,
      period: period || undefined,
    });

    return NextResponse.json({
      success: true,
      data: events,
      meta: { total: events.length },
    });
  } catch (err) {
    console.error("[GET /api/events] Error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to load events" },
      { status: 500 }
    );
  }
}
