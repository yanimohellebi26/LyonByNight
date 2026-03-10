import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { getDataFilePath } from "@/lib/utils/data-path";
import type { Lieu } from "@/types";

let cachedLieux: Lieu[] | null = null;

function loadLieux(): Lieu[] {
  if (cachedLieux) return cachedLieux;

  try {
    const parsed = JSON.parse(
      readFileSync(getDataFilePath("merged-geocoded.json"), "utf-8")
    ) as Lieu[];
    cachedLieux = parsed;
    return parsed;
  } catch (primaryErr) {
    console.error("[loadLieux] primary file failed:", primaryErr);
    try {
      const parsed = JSON.parse(
        readFileSync(getDataFilePath("merged.json"), "utf-8")
      ) as Lieu[];
      cachedLieux = parsed;
      return parsed;
    } catch (fallbackErr) {
      console.error("[loadLieux] fallback file also failed:", fallbackErr);
      throw new Error("Failed to load venue data");
    }
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const lieux = loadLieux();
  const lieu = lieux.find(
    (l: { id: string; slug: string }) => l.id === id || l.slug === id
  );

  if (!lieu) {
    return NextResponse.json(
      { success: false, error: "Lieu not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data: lieu });
}
