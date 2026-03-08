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
