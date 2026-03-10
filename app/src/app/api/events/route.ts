import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { getDataFilePath } from "@/lib/utils/data-path";
import type { Evenement } from "@/types";

let cachedEvents: Evenement[] | null = null;
let cachedLieuxMap: Map<string, string> | null = null;

function loadEvents(): Evenement[] {
  if (cachedEvents) return cachedEvents;
  const raw = readFileSync(getDataFilePath("events.json"), "utf-8");
  cachedEvents = JSON.parse(raw) as Evenement[];
  return cachedEvents;
}

function loadLieuxMap(): Map<string, string> {
  if (cachedLieuxMap) return cachedLieuxMap;
  const raw = readFileSync(getDataFilePath("merged-geocoded.json"), "utf-8");
  const lieux = JSON.parse(raw) as { id: string; nom: string }[];
  cachedLieuxMap = new Map(lieux.map((l) => [l.id, l.nom]));
  return cachedLieuxMap;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const date = searchParams.get("date"); // ISO date
  const type = searchParams.get("type"); // event type
  const lieuId = searchParams.get("lieu_id"); // specific venue
  const period = searchParams.get("period"); // "tonight" | "week" | "month"

  let events: Evenement[] = loadEvents();
  const today = new Date().toISOString().split("T")[0];

  // Filter by period
  if (period === "tonight") {
    events = events.filter((e) => e.date === today);
  } else if (period === "week") {
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() + 7);
    const weekEndStr = weekEnd.toISOString().split("T")[0];
    events = events.filter((e) => e.date >= today && e.date <= weekEndStr);
  } else if (period === "month") {
    const monthEnd = new Date();
    monthEnd.setDate(monthEnd.getDate() + 30);
    const monthEndStr = monthEnd.toISOString().split("T")[0];
    events = events.filter((e) => e.date >= today && e.date <= monthEndStr);
  }

  // Filter by specific date
  if (date) {
    events = events.filter((e) => e.date === date);
  }

  // Filter by type
  if (type) {
    events = events.filter((e) => e.type === type);
  }

  // Filter by venue
  if (lieuId) {
    events = events.filter((e) => e.lieu_id === lieuId);
  }

  // Sort by date, then time (spread to avoid mutating cached array)
  events = [...events].sort((a, b) => {
    const dateComp = a.date.localeCompare(b.date);
    if (dateComp !== 0) return dateComp;
    return a.heure_debut.localeCompare(b.heure_debut);
  });

  // Enrich with venue name
  const lieuxMap = loadLieuxMap();
  const enriched = events.map((e) => ({
    ...e,
    lieu_nom: lieuxMap.get(e.lieu_id) ?? "Lieu inconnu",
  }));

  return NextResponse.json({
    success: true,
    data: enriched,
    meta: { total: enriched.length },
  });
}
