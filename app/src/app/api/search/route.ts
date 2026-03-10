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

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q");

  if (!q || q.trim().length < 2) {
    return NextResponse.json({ success: true, data: [] });
  }

  const query = q.toLowerCase();
  const lieux = loadLieux();

  const results = lieux
    .filter(
      (l) =>
        l.nom.toLowerCase().includes(query) ||
        l.categorie?.toLowerCase().includes(query) ||
        l.musique?.some((m) => m.toLowerCase().includes(query)) ||
        l.specificites?.some((s) => s.toLowerCase().includes(query))
    )
    .slice(0, 10);

  return NextResponse.json({ success: true, data: results });
}
