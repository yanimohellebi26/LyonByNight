import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

function loadLieux() {
  try {
    const path = join(process.cwd(), "..", "data", "merged-geocoded.json");
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    const path = join(process.cwd(), "..", "data", "merged.json");
    return JSON.parse(readFileSync(path, "utf-8"));
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
