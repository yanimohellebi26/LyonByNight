import { readFileSync } from "fs";
import { getDataFilePath } from "@/lib/utils/data-path";
import { getDbClient } from "@/lib/supabase/db";
import type { Lieu, PriceRange, LieuType, Horaires } from "@/types";

const USE_SUPABASE = process.env.DATA_SOURCE === "supabase";

// Columns to select (exclude heavy fields: embedding, coordonnees WKB)
const LIEUX_COLUMNS = [
  "id", "old_id", "nom", "slug", "type", "categorie", "sous_categories",
  "adresse", "arrondissement", "quartier", "lat", "lng",
  "note", "prix_fourchette", "prix_pinte_moy", "prix_cocktail_moy", "prix_entree",
  "musique", "specificites", "clientele", "capacite", "horaires",
  "description", "resume_avis", "photos", "photo_cover",
  "site_web", "instagram", "google_maps", "telephone",
  "sources", "created_at", "updated_at",
].join(", ");

// ── JSON fallback ──────────────────────────────────────────────

let jsonCache: Lieu[] | null = null;

function loadFromJson(): Lieu[] {
  if (jsonCache) return jsonCache;

  try {
    jsonCache = JSON.parse(
      readFileSync(getDataFilePath("merged-geocoded.json"), "utf-8")
    ) as Lieu[];
  } catch {
    jsonCache = JSON.parse(
      readFileSync(getDataFilePath("merged.json"), "utf-8")
    ) as Lieu[];
  }
  return jsonCache;
}

// ── Supabase row → Lieu transformer ───────────────────────────

function rowToLieu(row: Record<string, unknown>): Lieu {
  return {
    id: (row.old_id as string) || (row.id as string),
    nom: row.nom as string,
    slug: row.slug as string,
    type: row.type as LieuType,
    categorie: (row.categorie as string) || "",
    sous_categories: (row.sous_categories as string[]) || [],
    adresse: (row.adresse as string) || "",
    arrondissement: (row.arrondissement as string) ?? null,
    quartier: (row.quartier as string) ?? null,
    coordonnees:
      row.lat != null && row.lng != null
        ? { lat: Number(row.lat), lng: Number(row.lng) }
        : null,
    note: row.note != null ? Number(row.note) : null,
    prix: {
      fourchette: ((row.prix_fourchette as string) || "€€") as PriceRange,
      pinte_moy:
        row.prix_pinte_moy != null ? Number(row.prix_pinte_moy) : null,
      cocktail_moy:
        row.prix_cocktail_moy != null ? Number(row.prix_cocktail_moy) : null,
    },
    musique: (row.musique as string[]) || [],
    specificites: (row.specificites as string[]) || [],
    clientele: (row.clientele as string) ?? null,
    capacite: (row.capacite as number) ?? null,
    horaires: (row.horaires as Horaires) ?? null,
    description: (row.description as string) || "",
    resume_avis: (row.resume_avis as string) ?? null,
    photos: (row.photos as string[]) || [],
    photo_cover: (row.photo_cover as string) ?? null,
    site_web: (row.site_web as string) ?? null,
    instagram: (row.instagram as string) ?? null,
    google_maps: (row.google_maps as string) ?? null,
    telephone: (row.telephone as string) ?? null,
    evenements: [],
    happy_hours: null,
    sources: (row.sources as string[]) || [],
    date_maj: row.updated_at
      ? new Date(row.updated_at as string).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0],
  };
}

// ── Supabase queries ──────────────────────────────────────────

async function fetchAllFromSupabase(): Promise<Lieu[]> {
  const db = getDbClient();
  const { data, error } = await db
    .from("lieux")
    .select(LIEUX_COLUMNS)
    .order("note", { ascending: false, nullsFirst: false });

  if (error) throw new Error(`[lieux] Supabase error: ${error.message}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((row) => rowToLieu(row as Record<string, unknown>));
}

async function fetchByIdFromSupabase(
  idOrSlug: string
): Promise<Lieu | null> {
  const db = getDbClient();
  const { data, error } = await db
    .from("lieux")
    .select(LIEUX_COLUMNS)
    .or(`old_id.eq.${idOrSlug},slug.eq.${idOrSlug}`)
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`[lieux] Supabase error: ${error.message}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data ? rowToLieu(data as any) : null;
}

// ── Public API ────────────────────────────────────────────────

export async function getAllLieux(): Promise<Lieu[]> {
  if (USE_SUPABASE) return fetchAllFromSupabase();
  return loadFromJson();
}

export async function getLieuById(
  idOrSlug: string
): Promise<Lieu | null> {
  if (USE_SUPABASE) return fetchByIdFromSupabase(idOrSlug);

  const lieux = loadFromJson();
  return (
    lieux.find((l) => l.id === idOrSlug || l.slug === idOrSlug) ?? null
  );
}

export async function searchLieux(
  query: string,
  limit = 10
): Promise<Lieu[]> {
  const lieux = await getAllLieux();
  const lower = query.toLowerCase();

  return lieux
    .filter(
      (l) =>
        l.nom.toLowerCase().includes(lower) ||
        l.categorie?.toLowerCase().includes(lower) ||
        l.musique?.some((m) => m.toLowerCase().includes(lower)) ||
        l.specificites?.some((s) => s.toLowerCase().includes(lower))
    )
    .slice(0, limit);
}
