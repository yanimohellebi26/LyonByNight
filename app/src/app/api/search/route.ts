import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { getDataFilePath } from "@/lib/utils/data-path";

function loadLieux() {
  try {
    return JSON.parse(readFileSync(getDataFilePath("merged-geocoded.json"), "utf-8"));
  } catch {
    return JSON.parse(readFileSync(getDataFilePath("merged.json"), "utf-8"));
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
      (l: { nom: string; categorie: string; musique: string[]; specificites: string[] }) =>
        l.nom.toLowerCase().includes(query) ||
        l.categorie?.toLowerCase().includes(query) ||
        l.musique?.some((m: string) => m.toLowerCase().includes(query)) ||
        l.specificites?.some((s: string) => s.toLowerCase().includes(query))
    )
    .slice(0, 10);

  return NextResponse.json({ success: true, data: results });
}
