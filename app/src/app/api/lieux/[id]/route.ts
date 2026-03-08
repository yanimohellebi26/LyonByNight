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
