/**
 * scrape-venues.ts — Scrape bars & clubs in Lyon from Yelp + Foursquare APIs
 * and generate data/liste4.json (compatible with merge-data.ts pipeline).
 *
 * Usage: npx tsx scripts/scrape-venues.ts
 *
 * Required env vars (in app/.env):
 *   YELP_API_KEY
 *   FOURSQUARE_API_KEY
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const ROOT = join(__dirname, "..");
const DATA_DIR = join(ROOT, "data");
const ENV_PATH = join(ROOT, "app", ".env");
const MERGED_PATH = join(DATA_DIR, "merged-geocoded.json");
const OUTPUT_PATH = join(DATA_DIR, "liste4.json");

function loadEnv(envPath: string): Record<string, string> {
  const env: Record<string, string> = {};
  try {
    const lines = readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      env[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
    }
  } catch {
    // .env not found — rely on process.env
  }
  return env;
}

const envFile = loadEnv(ENV_PATH);
function getEnv(key: string): string {
  const v = process.env[key] ?? envFile[key];
  if (!v) throw new Error(`Missing env var: ${key}`);
  return v;
}

const YELP_KEY = getEnv("YELP_API_KEY");
const FOURSQUARE_KEY = getEnv("FOURSQUARE_API_KEY");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ScrapedVenue {
  id: number;
  nom: string;
  categorie: string;
  sous_categories: string[];
  adresse: string;
  arrondissement: string | null;
  quartier: string | null;
  note_google: number;
  musique: string[];
  prix: {
    fourchette: string;
    pinte_moy: number | null;
    cocktail_moy: number | null;
  };
  specificites: string[];
  horaires: string;
  google_maps: string;
  website: string | null;
  instagram: string | null;
  clientele: string;
  telephone: string | null;
  source_api: string;
  photos_source: string[];
}

interface OutputCategory {
  categorie: string;
  ville: string;
  etablissements: ScrapedVenue[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalize(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function extractArrondissement(address: string): string | null {
  const matchZip = address.match(/690(\d{2})/);
  if (matchZip) {
    const num = parseInt(matchZip[1], 10);
    if (num >= 1 && num <= 9) return `${num}${num === 1 ? "er" : "e"}`;
  }
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function yelpPriceToFourchette(price: string | undefined): string {
  if (!price) return "€€";
  if (price.length >= 3) return "€€€";
  if (price.length === 2) return "€€";
  return "€";
}

function fsqPriceToFourchette(price: number | undefined): string {
  if (!price) return "€€";
  if (price >= 3) return "€€€";
  if (price === 2) return "€€";
  return "€";
}

// Map Yelp categories to our category names
function mapYelpCategory(categories: { alias: string; title: string }[]): {
  categorie: string;
  type: string;
  sous_categories: string[];
} {
  const aliases = categories.map((c) => c.alias);
  const titles = categories.map((c) => c.title);

  if (aliases.some((a) => a.includes("danceclubs") || a.includes("discos"))) {
    return { categorie: "club", type: "Clubs & Boîtes de nuit", sous_categories: titles };
  }
  if (aliases.some((a) => a.includes("cocktailbars"))) {
    return { categorie: "bar", type: "Bars à cocktails & Speakeasy", sous_categories: titles };
  }
  if (aliases.some((a) => a.includes("wine_bars"))) {
    return { categorie: "bar", type: "Rooftops & Bars à vins", sous_categories: titles };
  }
  if (aliases.some((a) => a.includes("pubs") || a.includes("irish"))) {
    return { categorie: "bar", type: "Pubs irlandais/écossais & Bars Vieux Lyon", sous_categories: titles };
  }
  if (aliases.some((a) => a.includes("beerbar") || a.includes("breweries"))) {
    return { categorie: "bar", type: "Bars à bières, Pubs & Bars insolites", sous_categories: titles };
  }
  if (aliases.some((a) => a.includes("lounges"))) {
    return { categorie: "bar", type: "Bars Cosy & Afterworks", sous_categories: titles };
  }
  if (aliases.some((a) => a.includes("sportsbars"))) {
    return { categorie: "bar", type: "Bars sportifs", sous_categories: titles };
  }
  if (aliases.some((a) => a.includes("karaoke"))) {
    return { categorie: "bar", type: "Bars karaoké", sous_categories: titles };
  }
  if (aliases.some((a) => a.includes("gay_bars"))) {
    return { categorie: "bar", type: "Bars & Clubs LGBT-friendly", sous_categories: titles };
  }

  return { categorie: "bar", type: "Bar", sous_categories: titles };
}

// Map Foursquare categories to our category names
function mapFoursquareCategory(categories: { id: number; name: string }[]): {
  categorie: string;
  type: string;
  sous_categories: string[];
} {
  const ids = categories.map((c) => c.id);
  const names = categories.map((c) => c.name);

  if (ids.includes(10032) || names.some((n) => /night\s*club|disco/i.test(n))) {
    return { categorie: "club", type: "Clubs & Boîtes de nuit", sous_categories: names };
  }
  if (ids.includes(13009) || names.some((n) => /cocktail/i.test(n))) {
    return { categorie: "bar", type: "Bars à cocktails & Speakeasy", sous_categories: names };
  }
  if (ids.includes(13026) || names.some((n) => /wine/i.test(n))) {
    return { categorie: "bar", type: "Rooftops & Bars à vins", sous_categories: names };
  }
  if (ids.includes(13019) || names.some((n) => /pub|irish/i.test(n))) {
    return { categorie: "bar", type: "Pubs irlandais/écossais & Bars Vieux Lyon", sous_categories: names };
  }
  if (ids.includes(13006) || names.some((n) => /beer|brew/i.test(n))) {
    return { categorie: "bar", type: "Bars à bières, Pubs & Bars insolites", sous_categories: names };
  }
  if (names.some((n) => /lounge/i.test(n))) {
    return { categorie: "bar", type: "Bars Cosy & Afterworks", sous_categories: names };
  }
  if (names.some((n) => /karaoke/i.test(n))) {
    return { categorie: "bar", type: "Bars karaoké", sous_categories: names };
  }
  if (names.some((n) => /gay|lgb/i.test(n))) {
    return { categorie: "bar", type: "Bars & Clubs LGBT-friendly", sous_categories: names };
  }

  return { categorie: "bar", type: "Bar", sous_categories: names };
}

// ---------------------------------------------------------------------------
// Yelp API
// ---------------------------------------------------------------------------

const YELP_BASE = "https://api.yelp.com/v3";

const YELP_CATEGORIES = [
  "bars",
  "cocktailbars",
  "danceclubs",
  "pubs",
  "lounges",
  "wine_bars",
  "beerbar",
  "sportsbars",
  "karaoke",
  "gay_bars",
  "nightlife",
  "breweries",
];

interface YelpBusiness {
  id: string;
  alias: string;
  name: string;
  image_url: string;
  url: string;
  review_count: number;
  categories: { alias: string; title: string }[];
  rating: number;
  coordinates: { latitude: number; longitude: number };
  price?: string;
  location: {
    address1: string;
    address2: string | null;
    city: string;
    zip_code: string;
    state: string;
    display_address: string[];
  };
  phone: string;
  display_phone: string;
}

async function fetchYelpPage(
  categories: string,
  offset: number,
): Promise<{ businesses: YelpBusiness[]; total: number }> {
  const params = new URLSearchParams({
    location: "Lyon, France",
    categories,
    limit: "50",
    offset: String(offset),
    sort_by: "best_match",
  });

  const res = await fetch(`${YELP_BASE}/businesses/search?${params}`, {
    headers: {
      Authorization: `Bearer ${YELP_KEY}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`  Yelp error ${res.status}: ${text.slice(0, 200)}`);
    return { businesses: [], total: 0 };
  }

  return res.json();
}

async function scrapeYelp(): Promise<Map<string, ScrapedVenue>> {
  console.log("\n--- Scraping Yelp Fusion API ---\n");
  const venues = new Map<string, ScrapedVenue>();
  let idCounter = 1;

  for (const category of YELP_CATEGORIES) {
    console.log(`  Category: ${category}`);
    let offset = 0;
    let total = Infinity;

    while (offset < total && offset < 250) {
      const data = await fetchYelpPage(category, offset);
      total = Math.min(data.total, 250); // Yelp caps at 1000 but limit per category

      for (const biz of data.businesses) {
        // Only Lyon venues
        if (
          !biz.location.city?.toLowerCase().includes("lyon") &&
          !biz.location.zip_code?.startsWith("690")
        ) {
          continue;
        }

        const key = normalize(biz.name);
        if (venues.has(key)) continue;

        const { categorie, type, sous_categories } = mapYelpCategory(biz.categories);
        const address = biz.location.display_address.join(", ");

        const venue: ScrapedVenue = {
          id: idCounter++,
          nom: biz.name,
          categorie,
          sous_categories,
          adresse: address,
          arrondissement: extractArrondissement(address) ?? extractArrondissement(biz.location.zip_code),
          quartier: null,
          note_google: biz.rating,
          musique: [],
          prix: {
            fourchette: yelpPriceToFourchette(biz.price),
            pinte_moy: null,
            cocktail_moy: null,
          },
          specificites: biz.categories.map((c) => c.title),
          horaires: "",
          google_maps: `https://maps.google.com/?q=${encodeURIComponent(biz.name + " Lyon")}`,
          website: null,
          instagram: null,
          clientele: "",
          telephone: biz.display_phone || null,
          source_api: "yelp",
          photos_source: biz.image_url ? [biz.image_url] : [],
        };

        venues.set(key, venue);
      }

      offset += 50;
      await sleep(400); // rate limit
    }

    console.log(`    => ${venues.size} unique venues so far`);
    await sleep(300);
  }

  console.log(`\n  Total from Yelp: ${venues.size} venues`);
  return venues;
}

// ---------------------------------------------------------------------------
// Foursquare API v3
// ---------------------------------------------------------------------------

const FSQ_BASE = "https://api.foursquare.com/v3";

// Foursquare category IDs for bars/clubs
const FSQ_CATEGORIES = [
  "13003", // Bar
  "13009", // Cocktail Bar
  "13019", // Pub
  "13026", // Wine Bar
  "13006", // Beer Bar
  "10032", // Night Club
  "13025", // Whisky Bar
  "13014", // Hotel Bar
  "10039", // Karaoke
  "13022", // Sports Bar
];

interface FoursquarePlace {
  fsq_id: string;
  name: string;
  categories: { id: number; name: string }[];
  geocodes: {
    main: { latitude: number; longitude: number };
  };
  location: {
    address: string;
    formatted_address: string;
    locality: string;
    postcode: string;
    region: string;
    country: string;
  };
  rating?: number;
  price?: number;
  tel?: string;
  website?: string;
  hours?: {
    display: string;
  };
}

async function fetchFoursquarePlaces(
  categories: string,
  cursor?: string,
): Promise<{ results: FoursquarePlace[]; nextCursor?: string }> {
  const params: Record<string, string> = {
    categories,
    near: "Lyon, France",
    limit: "50",
    fields: "fsq_id,name,categories,geocodes,location,rating,price,tel,website,hours",
  };
  if (cursor) params.cursor = cursor;

  const res = await fetch(
    `${FSQ_BASE}/places/search?${new URLSearchParams(params)}`,
    {
      headers: {
        Authorization: FOURSQUARE_KEY,
        Accept: "application/json",
      },
    },
  );

  if (!res.ok) {
    const text = await res.text();
    console.error(`  Foursquare error ${res.status}: ${text.slice(0, 200)}`);
    return { results: [] };
  }

  const data = await res.json();
  return {
    results: data.results ?? [],
    nextCursor: res.headers.get("link")?.match(/cursor=([^&>]+)/)?.[1],
  };
}

async function scrapeFoursquare(): Promise<Map<string, ScrapedVenue>> {
  console.log("\n--- Scraping Foursquare Places API ---\n");
  const venues = new Map<string, ScrapedVenue>();
  let idCounter = 500; // offset to avoid ID collision with Yelp

  for (const catId of FSQ_CATEGORIES) {
    console.log(`  Category ID: ${catId}`);
    let cursor: string | undefined;
    let pageCount = 0;

    do {
      const data = await fetchFoursquarePlaces(catId, cursor);

      for (const place of data.results) {
        // Only Lyon area
        const locality = place.location?.locality?.toLowerCase() ?? "";
        const postcode = place.location?.postcode ?? "";
        if (!locality.includes("lyon") && !postcode.startsWith("690")) {
          continue;
        }

        const key = normalize(place.name);
        if (venues.has(key)) continue;

        const { categorie, type, sous_categories } = mapFoursquareCategory(place.categories);
        const address = place.location?.formatted_address ?? place.location?.address ?? "";

        const venue: ScrapedVenue = {
          id: idCounter++,
          nom: place.name,
          categorie,
          sous_categories,
          adresse: address,
          arrondissement: extractArrondissement(address) ?? extractArrondissement(postcode),
          quartier: null,
          note_google: place.rating ? Math.round((place.rating / 2) * 10) / 10 : 0,
          musique: [],
          prix: {
            fourchette: fsqPriceToFourchette(place.price),
            pinte_moy: null,
            cocktail_moy: null,
          },
          specificites: place.categories.map((c) => c.name),
          horaires: place.hours?.display ?? "",
          google_maps: `https://maps.google.com/?q=${encodeURIComponent(place.name + " Lyon")}`,
          website: place.website ?? null,
          instagram: null,
          clientele: "",
          telephone: place.tel ?? null,
          source_api: "foursquare",
          photos_source: [],
        };

        venues.set(key, venue);
      }

      cursor = data.nextCursor;
      pageCount++;
      await sleep(400);
    } while (cursor && pageCount < 5);

    console.log(`    => ${venues.size} unique venues so far`);
    await sleep(300);
  }

  console.log(`\n  Total from Foursquare: ${venues.size} venues`);
  return venues;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log("=== Scraping bars & clubs in Lyon ===");

  // Load existing venues for deduplication
  let existingKeys: Set<string>;
  try {
    const existing = JSON.parse(readFileSync(MERGED_PATH, "utf-8")) as { nom: string }[];
    existingKeys = new Set(existing.map((v) => normalize(v.nom)));
    console.log(`\nLoaded ${existingKeys.size} existing venues for deduplication`);
  } catch {
    existingKeys = new Set();
    console.log("\nNo existing merged data found, starting fresh");
  }

  // Scrape both APIs
  const yelpVenues = await scrapeYelp();
  const foursquareVenues = await scrapeFoursquare();

  // Merge Foursquare into Yelp (Yelp takes priority, Foursquare fills gaps)
  const allVenues = new Map(yelpVenues);
  let foursquareAdded = 0;
  for (const [key, venue] of foursquareVenues) {
    if (!allVenues.has(key)) {
      allVenues.set(key, venue);
      foursquareAdded++;
    }
  }

  console.log(`\n--- Merge Results ---`);
  console.log(`  Yelp: ${yelpVenues.size}`);
  console.log(`  Foursquare unique additions: ${foursquareAdded}`);
  console.log(`  Combined: ${allVenues.size}`);

  // Filter out venues already in merged data
  const newVenues: ScrapedVenue[] = [];
  let duplicateCount = 0;
  for (const [key, venue] of allVenues) {
    if (existingKeys.has(key)) {
      duplicateCount++;
    } else {
      newVenues.push(venue);
    }
  }

  console.log(`  Already in dataset: ${duplicateCount}`);
  console.log(`  NEW venues to add: ${newVenues.length}`);

  if (newVenues.length === 0) {
    console.log("\nNo new venues found. Exiting.");
    return;
  }

  // Re-number IDs sequentially
  newVenues.forEach((v, i) => {
    v.id = i + 1;
  });

  // Group by category for liste3-compatible format
  const categoryMap = new Map<string, ScrapedVenue[]>();
  for (const venue of newVenues) {
    const catKey = mapCategoryLabel(venue);
    if (!categoryMap.has(catKey)) {
      categoryMap.set(catKey, []);
    }
    categoryMap.get(catKey)!.push(venue);
  }

  const output: OutputCategory[] = Array.from(categoryMap.entries()).map(
    ([categorie, etablissements]) => ({
      categorie,
      ville: "Lyon",
      etablissements,
    }),
  );

  // Write output
  writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), "utf-8");

  console.log(`\n=== Output ===`);
  console.log(`  Written to: ${OUTPUT_PATH}`);
  console.log(`  ${newVenues.length} new venues in ${output.length} categories:`);
  for (const cat of output) {
    console.log(`    - ${cat.categorie}: ${cat.etablissements.length}`);
  }

  // Stats
  const bars = newVenues.filter((v) => v.categorie === "bar").length;
  const clubs = newVenues.filter((v) => v.categorie === "club").length;
  const withAddr = newVenues.filter(
    (v) => v.adresse && (v.adresse.includes("690") || v.adresse.includes("Lyon")),
  ).length;
  console.log(`\n  ${bars} bars, ${clubs} clubs`);
  console.log(`  ${withAddr} with geocodable addresses`);
  console.log(
    `\nNext steps:\n  1. Review data/liste4.json\n  2. Update scripts/merge-data.ts to include liste4\n  3. Run: npx tsx scripts/merge-data.ts\n  4. Run: npx tsx scripts/geocode-addresses.ts\n  5. Run: npx tsx scripts/fetch-photos.ts`,
  );
}

function mapCategoryLabel(venue: ScrapedVenue): string {
  // Use the mapped type from sous_categories or infer from categorie
  const subs = venue.sous_categories.join(" ").toLowerCase();
  const specs = venue.specificites.join(" ").toLowerCase();

  if (subs.includes("cocktail") || subs.includes("speakeasy")) return "Bars à cocktails & Speakeasy";
  if (subs.includes("night club") || subs.includes("discoth") || subs.includes("disco")) return "Clubs & Boîtes de nuit";
  if (subs.includes("wine") || subs.includes("vin")) return "Rooftops & Bars à vins";
  if (subs.includes("pub") || subs.includes("irish")) return "Pubs irlandais/écossais & Bars Vieux Lyon";
  if (subs.includes("beer") || subs.includes("bière") || subs.includes("brew")) return "Bars à bières, Pubs & Bars insolites";
  if (subs.includes("lounge") || subs.includes("cosy")) return "Bars Cosy & Afterworks";
  if (subs.includes("sport")) return "Bars sportifs";
  if (subs.includes("karaoke") || subs.includes("karaoké")) return "Bars karaoké";
  if (subs.includes("gay") || subs.includes("lgb")) return "Bars & Clubs LGBT-friendly";
  if (subs.includes("whisky") || subs.includes("whiskey")) return "Bars à cocktails & Speakeasy";
  if (subs.includes("hotel")) return "Bars Cosy & Afterworks";

  if (venue.categorie === "club") return "Clubs & Boîtes de nuit";
  return "Bar";
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
