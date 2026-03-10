import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { haversineDistance } from "@/lib/utils/geo";
import { isOpenTonight } from "@/lib/utils/horaires";
import { getDataFilePath } from "@/lib/utils/data-path";
import type { Lieu } from "@/types";

type LieuWithDistance = Lieu & { _distance?: number | null };

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
  const { searchParams } = request.nextUrl;

  const type = searchParams.get("type");
  const arrondissement = searchParams.get("arrondissement");
  const musique = searchParams.get("musique");
  const fourchette = searchParams.get("fourchette");
  const noteMin = searchParams.get("note_min");
  const q = searchParams.get("q");
  const sort = searchParams.get("sort") ?? "note";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const limitParam = parseInt(searchParams.get("limit") ?? "20", 10);
  const limit = isNaN(limitParam) || limitParam < 1 ? 20 : Math.min(limitParam, 1000);

  /* Geo params */
  const latParam = searchParams.get("lat");
  const lngParam = searchParams.get("lng");
  const rayonParam = searchParams.get("rayon_km");
  const userLat = latParam ? parseFloat(latParam) : null;
  const userLng = lngParam ? parseFloat(lngParam) : null;
  const rayonKm = rayonParam ? parseFloat(rayonParam) : null;
  const tonight = searchParams.get("tonight") === "true";

  let lieux: LieuWithDistance[] = loadLieux();

  // "Ce soir" mode — filter venues open tonight
  if (tonight) {
    lieux = lieux.filter((l) => isOpenTonight(l.horaires));
  }

  // Filters
  if (type) {
    lieux = lieux.filter((l) => l.type === type);
  }
  if (arrondissement) {
    lieux = lieux.filter((l) => l.arrondissement === arrondissement);
  }
  if (musique) {
    const genres = musique.split(",").map((g) => g.trim().toLowerCase());
    lieux = lieux.filter((l) =>
      l.musique?.some((m) => genres.some((g) => m.toLowerCase().includes(g)))
    );
  }
  if (fourchette) {
    lieux = lieux.filter((l) => l.prix?.fourchette === fourchette);
  }
  if (noteMin) {
    const min = parseFloat(noteMin);
    lieux = lieux.filter((l) => l.note !== null && l.note >= min);
  }
  if (q) {
    const query = q.toLowerCase();
    lieux = lieux.filter(
      (l) =>
        l.nom.toLowerCase().includes(query) ||
        l.description?.toLowerCase().includes(query) ||
        l.categorie?.toLowerCase().includes(query)
    );
  }

  /* Compute distance and filter by radius */
  if (userLat != null && userLng != null) {
    lieux = lieux.map((l) => {
      if (!l.coordonnees) return { ...l, _distance: null };
      const dist = haversineDistance(
        userLat,
        userLng,
        l.coordonnees.lat,
        l.coordonnees.lng
      );
      return { ...l, _distance: Math.round(dist * 100) / 100 };
    });

    if (rayonKm != null) {
      lieux = lieux.filter(
        (l) => l._distance != null && l._distance <= rayonKm
      );
    }
  }

  // Sort (spread to avoid mutating cached array)
  lieux = [...lieux].sort((a, b) => {
    switch (sort) {
      case "note":
        return (b.note ?? 0) - (a.note ?? 0);
      case "name":
        return a.nom.localeCompare(b.nom, "fr");
      case "price":
        return (a.prix?.pinte_moy ?? 99) - (b.prix?.pinte_moy ?? 99);
      case "distance":
        return (a._distance ?? 999) - (b._distance ?? 999);
      default:
        return 0;
    }
  });

  // Paginate
  const total = lieux.length;
  const start = (page - 1) * limit;
  const data = lieux.slice(start, start + limit);

  return NextResponse.json({
    success: true,
    data,
    meta: { total, page, limit, pages: Math.ceil(total / limit) },
  });
}
