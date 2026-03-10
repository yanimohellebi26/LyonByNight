import type { Lieu } from "@/types";

interface YelpBusiness {
  id: string;
  name: string;
  rating: number;
  review_count: number;
  price?: string;
  location: {
    address1: string;
    city: string;
    zip_code: string;
  };
  categories: { alias: string; title: string }[];
  image_url?: string;
  url: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  phone?: string;
}

interface YelpSearchResponse {
  businesses: YelpBusiness[];
  total: number;
}

const YELP_API_BASE = "https://api.yelp.com/v3";

function getYelpApiKey(): string {
  const key = process.env.YELP_API_KEY;
  if (!key) throw new Error("YELP_API_KEY is not configured");
  return key;
}

/** Search Yelp for bars/clubs in Lyon */
export async function searchYelpLyon(
  query: string,
  options: { limit?: number; offset?: number } = {}
): Promise<YelpBusiness[]> {
  const { limit = 5, offset = 0 } = options;

  const params = new URLSearchParams({
    term: query,
    location: "Lyon, France",
    categories: "bars,nightlife,cocktailbars,danceclubs",
    limit: String(limit),
    offset: String(offset),
    sort_by: "best_match",
  });

  const res = await fetch(`${YELP_API_BASE}/businesses/search?${params}`, {
    headers: {
      Authorization: `Bearer ${getYelpApiKey()}`,
      Accept: "application/json",
    },
    next: { revalidate: 3600 }, // Cache 1h
  });

  if (!res.ok) {
    console.error(`Yelp API error: ${res.status} ${res.statusText}`);
    return [];
  }

  const data: YelpSearchResponse = await res.json();
  return data.businesses;
}

/** Convert a Yelp business to a partial Lieu-like object for chat display */
export function yelpBusinessToLieu(biz: YelpBusiness): Partial<Lieu> & { nom: string; _source: string } {
  const priceMap: Record<string, string> = {
    "$": "€",
    "$$": "€€",
    "$$$": "€€€",
    "$$$$": "€€€",
  };

  return {
    nom: biz.name,
    slug: biz.id,
    type: biz.categories.some((c) =>
      ["danceclubs", "musicvenues", "jazzandblues"].includes(c.alias)
    )
      ? "club"
      : "bar",
    adresse: `${biz.location.address1}, ${biz.location.zip_code} ${biz.location.city}`,
    note: biz.rating,
    prix: {
      fourchette: (priceMap[biz.price ?? ""] ?? "€€") as "€" | "€€" | "€€€",
      pinte_moy: null,
      cocktail_moy: null,
    },
    musique: biz.categories.map((c) => c.title),
    coordonnees: {
      lat: biz.coordinates.latitude,
      lng: biz.coordinates.longitude,
    },
    photo_cover: biz.image_url ?? null,
    site_web: biz.url,
    _source: "yelp",
  };
}

/** Format Yelp results as context text for the LLM */
export function formatYelpForContext(businesses: YelpBusiness[]): string {
  if (businesses.length === 0) return "";

  return businesses
    .map(
      (b) =>
        `[Yelp] ${b.name} — ${b.rating}★ (${b.review_count} avis) — ${b.price ?? "?"} — ${b.location.address1} — Catégories: ${b.categories.map((c) => c.title).join(", ")}`
    )
    .join("\n");
}
