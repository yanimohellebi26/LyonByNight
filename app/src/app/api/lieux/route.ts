import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import { haversineDistance } from "@/lib/utils/geo";
import { isOpenTonight } from "@/lib/utils/horaires";
import type { Horaires } from "@/types";

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
  const { searchParams } = request.nextUrl;

  const type = searchParams.get("type");
  const arrondissement = searchParams.get("arrondissement");
  const musique = searchParams.get("musique");
  const fourchette = searchParams.get("fourchette");
  const noteMin = searchParams.get("note_min");
  const q = searchParams.get("q");
  const sort = searchParams.get("sort") ?? "note";
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 100);

  /* Geo params */
  const latParam = searchParams.get("lat");
  const lngParam = searchParams.get("lng");
  const rayonParam = searchParams.get("rayon_km");
  const userLat = latParam ? parseFloat(latParam) : null;
  const userLng = lngParam ? parseFloat(lngParam) : null;
  const rayonKm = rayonParam ? parseFloat(rayonParam) : null;
  const tonight = searchParams.get("tonight") === "true";

  let lieux = loadLieux();

  // "Ce soir" mode — filter venues open tonight
  if (tonight) {
    lieux = lieux.filter((l: { horaires: Horaires | null }) =>
      isOpenTonight(l.horaires)
    );
  }

  // Filters
  if (type) {
    lieux = lieux.filter((l: { type: string }) => l.type === type);
  }
  if (arrondissement) {
    lieux = lieux.filter(
      (l: { arrondissement: string | null }) =>
        l.arrondissement === arrondissement
    );
  }
  if (musique) {
    const genres = musique.split(",").map((g) => g.trim().toLowerCase());
    lieux = lieux.filter((l: { musique: string[] }) =>
      l.musique?.some((m: string) =>
        genres.some((g) => m.toLowerCase().includes(g))
      )
    );
  }
  if (fourchette) {
    lieux = lieux.filter(
      (l: { prix: { fourchette: string } }) => l.prix?.fourchette === fourchette
    );
  }
  if (noteMin) {
    const min = parseFloat(noteMin);
    lieux = lieux.filter(
      (l: { note: number | null }) => l.note !== null && l.note >= min
    );
  }
  if (q) {
    const query = q.toLowerCase();
    lieux = lieux.filter(
      (l: { nom: string; description: string | null; categorie: string }) =>
        l.nom.toLowerCase().includes(query) ||
        l.description?.toLowerCase().includes(query) ||
        l.categorie?.toLowerCase().includes(query)
    );
  }

  /* Compute distance and filter by radius */
  if (userLat != null && userLng != null) {
    lieux = lieux.map(
      (l: { coordonnees: { lat: number; lng: number } | null }) => {
        if (!l.coordonnees) return { ...l, _distance: null };
        const dist = haversineDistance(
          userLat,
          userLng,
          l.coordonnees.lat,
          l.coordonnees.lng
        );
        return { ...l, _distance: Math.round(dist * 100) / 100 };
      }
    );

    if (rayonKm != null) {
      lieux = lieux.filter(
        (l: { _distance: number | null }) =>
          l._distance != null && l._distance <= rayonKm
      );
    }
  }

  // Sort
  lieux.sort((a: { note: number | null; nom: string; prix: { pinte_moy: number | null }; _distance?: number | null }, b: { note: number | null; nom: string; prix: { pinte_moy: number | null }; _distance?: number | null }) => {
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
